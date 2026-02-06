/**
 * OpenClaw Provider Router — Model-Agnostic LLM Layer
 *
 * Resolves the agency's configured LLM provider, decrypts their API key,
 * and returns a Vercel AI SDK model instance ready for use with streamText / generateText.
 *
 * Supports: OpenAI, Anthropic, Groq (via OpenAI-compatible endpoint).
 * Fallback: System Groq key when no user key is configured.
 */

import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createAdminClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/utils/encryption'
import type { LanguageModel } from 'ai'

// ─── Types ──────────────────────────────────────────────────

export type LLMProvider = 'openai' | 'anthropic' | 'groq'

export interface ProviderConfig {
  provider: LLMProvider
  model: string
  apiKey: string
  isSystemKey: boolean // true = fallback system key, false = user-provided
}

export interface ResolvedProvider {
  model: LanguageModel
  provider: LLMProvider
  modelName: string
  isSystemKey: boolean
}

// Provider → default model mapping
const DEFAULT_MODELS: Record<LLMProvider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
  groq: 'llama-3.3-70b-versatile',
}

// ─── In-memory cache (60s TTL) ─────────────────────────────

const configCache = new Map<string, { config: ProviderConfig; expiresAt: number }>()
const CACHE_TTL_MS = 60_000

function getCachedConfig(agencyId: string): ProviderConfig | null {
  const cached = configCache.get(agencyId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.config
  }
  configCache.delete(agencyId)
  return null
}

function setCachedConfig(agencyId: string, config: ProviderConfig): void {
  configCache.set(agencyId, { config, expiresAt: Date.now() + CACHE_TTL_MS })
}

// ─── Core Functions ─────────────────────────────────────────

/**
 * Fetch the agency's LLM configuration from the database.
 * Returns the active API key config, or falls back to system Groq key.
 */
export async function getProviderConfig(agencyId: string): Promise<ProviderConfig> {
  // Check cache first
  const cached = getCachedConfig(agencyId)
  if (cached) return cached

  const supabase = createAdminClient()

  const { data: keyRecord } = await supabase
    .from('agency_api_keys')
    .select('provider, model_preference, encrypted_key, is_valid')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .eq('is_valid', true)
    .limit(1)
    .single()

  if (keyRecord) {
    try {
      const apiKey = decrypt(keyRecord.encrypted_key)
      const config: ProviderConfig = {
        provider: keyRecord.provider as LLMProvider,
        model: keyRecord.model_preference || DEFAULT_MODELS[keyRecord.provider as LLMProvider],
        apiKey,
        isSystemKey: false,
      }
      setCachedConfig(agencyId, config)

      // Update last_used_at in background (fire and forget)
      supabase
        .from('agency_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('agency_id', agencyId)
        .eq('provider', keyRecord.provider)
        .then(() => {})

      return config
    } catch (err) {
      console.error(`[OpenClaw] Failed to decrypt key for agency ${agencyId}:`, err)
      // Mark key as invalid
      await supabase
        .from('agency_api_keys')
        .update({ is_valid: false })
        .eq('agency_id', agencyId)
        .eq('provider', keyRecord.provider)
      // Fall through to system key
    }
  }

  // Fallback: system Groq key
  const systemKey = process.env.GROQ_API_KEY
  if (!systemKey) {
    throw new Error('No LLM key configured and GROQ_API_KEY is not set')
  }

  const config: ProviderConfig = {
    provider: 'groq',
    model: DEFAULT_MODELS.groq,
    apiKey: systemKey,
    isSystemKey: true,
  }
  setCachedConfig(agencyId, config)
  return config
}

/**
 * Resolve a Vercel AI SDK model instance for a given agency.
 * This is the main entry point — call this from API routes.
 */
export async function getModelForAgency(agencyId: string): Promise<ResolvedProvider> {
  const config = await getProviderConfig(agencyId)
  return resolveModel(config)
}

/**
 * Build a Vercel AI SDK model instance from a provider config.
 */
export function resolveModel(config: ProviderConfig): ResolvedProvider {
  let model: LanguageModel

  switch (config.provider) {
    case 'openai':
      model = createOpenAI({ apiKey: config.apiKey })(config.model)
      break

    case 'anthropic':
      model = createAnthropic({ apiKey: config.apiKey })(config.model)
      break

    case 'groq':
      model = createOpenAI({
        apiKey: config.apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      })(config.model)
      break

    default:
      // Unknown provider — fall back to Groq-compatible
      model = createOpenAI({
        apiKey: config.apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      })('llama-3.3-70b-versatile')
  }

  return {
    model,
    provider: config.provider,
    modelName: config.model,
    isSystemKey: config.isSystemKey,
  }
}

/**
 * Validate an API key by making a lightweight test call.
 * Returns true if the key is valid.
 */
export async function validateApiKey(
  provider: LLMProvider,
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    switch (provider) {
      case 'openai': {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        if (res.ok) return { valid: true }
        const err = await res.text()
        return { valid: false, error: `OpenAI: ${res.status} ${err}` }
      }

      case 'anthropic': {
        // Anthropic doesn't have a /models endpoint — make a minimal completion
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        })
        if (res.ok || res.status === 200) return { valid: true }
        const err = await res.text()
        // 400 means key is valid but request was bad (fine for validation)
        if (res.status === 400) return { valid: true }
        return { valid: false, error: `Anthropic: ${res.status} ${err}` }
      }

      case 'groq': {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        if (res.ok) return { valid: true }
        const err = await res.text()
        return { valid: false, error: `Groq: ${res.status} ${err}` }
      }

      default:
        return { valid: false, error: `Unknown provider: ${provider}` }
    }
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

/**
 * Clear the provider config cache for an agency.
 * Call this when the user adds/removes/changes their API key.
 */
export function clearProviderCache(agencyId: string): void {
  configCache.delete(agencyId)
}

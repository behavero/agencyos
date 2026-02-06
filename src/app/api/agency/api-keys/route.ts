import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { encrypt, getKeyPrefix } from '@/lib/utils/encryption'
import {
  validateApiKey,
  clearProviderCache,
  type LLMProvider,
} from '@/lib/openclaw/provider-router'

const VALID_PROVIDERS: LLMProvider[] = ['openai', 'anthropic', 'groq']

/**
 * GET /api/agency/api-keys?agencyId=...
 * List configured API keys for the agency (returns prefix only, never the actual key).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const agencyId = request.nextUrl.searchParams.get('agencyId')
  if (!agencyId) {
    return NextResponse.json({ error: 'agencyId is required' }, { status: 400 })
  }

  // Verify user belongs to agency with owner/admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, agency_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.agency_id !== agencyId || !['owner', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: keys, error } = await admin
    .from('agency_api_keys')
    .select(
      'id, provider, model_preference, key_prefix, is_active, is_valid, created_at, last_used_at, last_validated_at'
    )
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ keys: keys || [] })
}

/**
 * POST /api/agency/api-keys
 * Add or update an API key for a provider.
 * Body: { agencyId, provider, apiKey, modelPreference? }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { agencyId: string; provider: string; apiKey: string; modelPreference?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { agencyId, provider, apiKey, modelPreference } = body

  if (!agencyId || !provider || !apiKey) {
    return NextResponse.json(
      { error: 'agencyId, provider, and apiKey are required' },
      { status: 400 }
    )
  }

  if (!VALID_PROVIDERS.includes(provider as LLMProvider)) {
    return NextResponse.json(
      { error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` },
      { status: 400 }
    )
  }

  // Verify user belongs to agency with owner/admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, agency_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.agency_id !== agencyId || !['owner', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Step 1: Validate the key
  const validation = await validateApiKey(provider as LLMProvider, apiKey)
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'API key validation failed', details: validation.error },
      { status: 422 }
    )
  }

  // Step 2: Encrypt and store
  const encryptedKey = encrypt(apiKey)
  const prefix = getKeyPrefix(apiKey)

  const admin = createAdminClient()

  // Upsert (one key per provider per agency)
  const { data, error } = await admin
    .from('agency_api_keys')
    .upsert(
      {
        agency_id: agencyId,
        provider,
        model_preference: modelPreference || null,
        encrypted_key: encryptedKey,
        key_prefix: prefix,
        is_active: true,
        is_valid: true,
        created_by: user.id,
        last_validated_at: new Date().toISOString(),
      },
      { onConflict: 'agency_id,provider' }
    )
    .select('id, provider, model_preference, key_prefix, is_active, is_valid, created_at')
    .single()

  if (error) {
    console.error('[API Keys] Failed to store key:', error)
    return NextResponse.json({ error: 'Failed to store API key' }, { status: 500 })
  }

  // Clear provider cache so next call uses the new key
  clearProviderCache(agencyId)

  return NextResponse.json({ success: true, key: data })
}

/**
 * DELETE /api/agency/api-keys
 * Remove an API key. Body: { agencyId, provider }
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { agencyId: string; provider: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { agencyId, provider } = body

  // Verify ownership
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, agency_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.agency_id !== agencyId || !['owner', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('agency_api_keys')
    .delete()
    .eq('agency_id', agencyId)
    .eq('provider', provider)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  clearProviderCache(agencyId)

  return NextResponse.json({ success: true })
}

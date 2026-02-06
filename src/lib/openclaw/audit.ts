/**
 * OpenClaw Audit Logger
 *
 * Tracks all AI usage: chat, tool calls, generate-reply.
 * Writes to openclaw_audit_log table for usage monitoring and billing.
 */

import { createAdminClient } from '@/lib/supabase/server'

export interface AuditEntry {
  agencyId: string
  userId: string
  action: 'chat' | 'tool_call' | 'generate_reply'
  toolName?: string
  provider?: string
  modelName?: string
  inputTokens?: number
  outputTokens?: number
  latencyMs?: number
  success?: boolean
  errorMessage?: string
  metadata?: Record<string, unknown>
}

/**
 * Log an OpenClaw action to the audit trail.
 * Fire-and-forget — does not throw on failure.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const supabase = createAdminClient()

    await supabase.from('openclaw_audit_log').insert({
      agency_id: entry.agencyId,
      user_id: entry.userId,
      action: entry.action,
      tool_name: entry.toolName || null,
      provider: entry.provider || null,
      model_name: entry.modelName || null,
      input_tokens: entry.inputTokens || null,
      output_tokens: entry.outputTokens || null,
      latency_ms: entry.latencyMs || null,
      success: entry.success ?? true,
      error_message: entry.errorMessage || null,
      metadata: entry.metadata || null,
    })
  } catch (err) {
    // Audit logging should never break the main flow
    console.error('[OpenClaw Audit] Failed to log:', err)
  }
}

/**
 * Log a chat interaction (fire-and-forget).
 */
export function logChat(
  agencyId: string,
  userId: string,
  provider: string,
  modelName: string
): void {
  logAudit({
    agencyId,
    userId,
    action: 'chat',
    provider,
    modelName,
  })
}

/**
 * Log a tool call (fire-and-forget).
 */
export function logToolCall(
  agencyId: string,
  userId: string,
  toolName: string,
  success: boolean,
  errorMessage?: string
): void {
  logAudit({
    agencyId,
    userId,
    action: 'tool_call',
    toolName,
    success,
    errorMessage,
  })
}

/**
 * Log a generate-reply call (fire-and-forget).
 */
export function logGenerateReply(
  agencyId: string,
  userId: string,
  provider: string,
  modelName: string
): void {
  logAudit({
    agencyId,
    userId,
    action: 'generate_reply',
    provider,
    modelName,
  })
}

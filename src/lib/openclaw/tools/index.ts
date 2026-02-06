/**
 * OpenClaw Tool Registry
 *
 * Exports all tools available to Alfred, organized by category.
 * Includes permission-based filtering — tools are only provided to the LLM
 * if the user has the required role.
 *
 * Tools are built as factory functions that close over agency context
 * (agencyId, userId) for data isolation.
 */

import { type UserRole, ROLE_HIERARCHY } from '@/lib/auth/permissions'
import { buildReadTools } from './read-tools'
import { buildSuggestTools, buildWriteTools } from './action-tools'

// ─── Permission Mapping ─────────────────────────────────────

type PermissionLevel = 'any' | 'chatter' | 'admin' | 'owner'

const TOOL_PERMISSIONS: Record<string, PermissionLevel> = {
  // Read tools — any role
  get_agency_kpis: 'any',
  get_model_stats: 'any',
  get_fan_profile: 'chatter',
  get_tracking_links: 'any',
  get_revenue_breakdown: 'any',
  search_vault: 'chatter',

  // Suggest tools — chatter+ for most, admin+ for underperformers
  draft_message: 'chatter',
  suggest_ppv_price: 'chatter',
  flag_underperformer: 'admin',

  // Write tools — admin+ or owner
  create_content_task: 'admin',
  adjust_recommended_price: 'admin',
  send_mass_message: 'owner',
}

// Minimum hierarchy level for each permission level
const PERMISSION_THRESHOLDS: Record<PermissionLevel, number> = {
  any: 0,
  chatter: ROLE_HIERARCHY.chatter, // 30
  admin: ROLE_HIERARCHY.paladin, // 70 (paladin is lowest "admin-level")
  owner: ROLE_HIERARCHY.owner, // 100
}

// ─── Permission-Filtered Tool Set ───────────────────────────

/**
 * Get the set of tools available to a user based on their role,
 * scoped to their agency.
 *
 * Pass the result to streamText({ tools: ... }) in the Alfred chat route.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getToolsForRole(
  role: UserRole | string | null,
  agencyId: string,
  userId: string
): Record<string, any> {
  const userLevel = role ? (ROLE_HIERARCHY[role as UserRole] ?? 0) : 0

  // Build all tools scoped to this agency
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTools: Record<string, any> = {
    ...buildReadTools(agencyId),
    ...buildSuggestTools(agencyId),
    ...buildWriteTools(agencyId, userId),
  }

  // Filter by permission level
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filtered: Record<string, any> = {}
  for (const [toolName, toolDef] of Object.entries(allTools)) {
    const requiredLevel = TOOL_PERMISSIONS[toolName]
    if (!requiredLevel) continue

    const threshold = PERMISSION_THRESHOLDS[requiredLevel]
    if (userLevel >= threshold) {
      filtered[toolName] = toolDef
    }
  }

  return filtered
}

/**
 * Check if a specific tool is allowed for a role.
 */
export function isToolAllowed(toolName: string, role: UserRole | string | null): boolean {
  const requiredLevel = TOOL_PERMISSIONS[toolName]
  if (!requiredLevel) return false

  const userLevel = role ? (ROLE_HIERARCHY[role as UserRole] ?? 0) : 0
  const threshold = PERMISSION_THRESHOLDS[requiredLevel]
  return userLevel >= threshold
}

// Re-export builders for direct use
export { buildReadTools } from './read-tools'
export { buildSuggestTools, buildWriteTools } from './action-tools'

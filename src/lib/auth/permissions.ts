/**
 * Role-Based Access Control (RBAC) Permissions
 * 
 * Defines what each role can access in the application.
 */

export type UserRole = 
  | 'owner' 
  | 'admin' 
  | 'grandmaster' 
  | 'paladin' 
  | 'alchemist' 
  | 'ranger' 
  | 'rogue' 
  | 'chatter' 
  | 'smm' 
  | 'recruiter'

// Role hierarchy (higher = more permissions)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 100,
  admin: 90,
  grandmaster: 80,
  paladin: 70,
  alchemist: 50,
  ranger: 50,
  rogue: 50,
  smm: 40,
  recruiter: 40,
  chatter: 30,
}

// Permission definitions
export interface Permissions {
  // Dashboard sections
  viewAgencyRevenue: boolean
  viewAllModels: boolean
  viewTeamManagement: boolean
  viewFinancials: boolean
  viewExpenses: boolean
  viewPayroll: boolean
  viewAnalytics: boolean
  viewCompetitors: boolean
  
  // Actions
  manageTeam: boolean
  manageShifts: boolean
  manageModels: boolean
  assignModels: boolean
  viewAllChats: boolean
  sendMassMessages: boolean
  accessVault: boolean
  
  // Settings
  viewAgencySettings: boolean
  editAgencySettings: boolean
  
  // Time tracking
  clockInOut: boolean
  viewOwnTimesheet: boolean
  viewAllTimesheets: boolean
  editTimesheets: boolean
}

// Default permissions by role
const ROLE_PERMISSIONS: Record<UserRole, Permissions> = {
  owner: {
    viewAgencyRevenue: true,
    viewAllModels: true,
    viewTeamManagement: true,
    viewFinancials: true,
    viewExpenses: true,
    viewPayroll: true,
    viewAnalytics: true,
    viewCompetitors: true,
    manageTeam: true,
    manageShifts: true,
    manageModels: true,
    assignModels: true,
    viewAllChats: true,
    sendMassMessages: true,
    accessVault: true,
    viewAgencySettings: true,
    editAgencySettings: true,
    clockInOut: false, // Owners don't need to clock in
    viewOwnTimesheet: false,
    viewAllTimesheets: true,
    editTimesheets: true,
  },
  admin: {
    viewAgencyRevenue: true,
    viewAllModels: true,
    viewTeamManagement: true,
    viewFinancials: true,
    viewExpenses: true,
    viewPayroll: true,
    viewAnalytics: true,
    viewCompetitors: true,
    manageTeam: true,
    manageShifts: true,
    manageModels: true,
    assignModels: true,
    viewAllChats: true,
    sendMassMessages: true,
    accessVault: true,
    viewAgencySettings: true,
    editAgencySettings: false,
    clockInOut: true,
    viewOwnTimesheet: true,
    viewAllTimesheets: true,
    editTimesheets: true,
  },
  grandmaster: {
    viewAgencyRevenue: true,
    viewAllModels: true,
    viewTeamManagement: true,
    viewFinancials: true,
    viewExpenses: true,
    viewPayroll: true,
    viewAnalytics: true,
    viewCompetitors: true,
    manageTeam: true,
    manageShifts: true,
    manageModels: true,
    assignModels: true,
    viewAllChats: true,
    sendMassMessages: true,
    accessVault: true,
    viewAgencySettings: true,
    editAgencySettings: false,
    clockInOut: true,
    viewOwnTimesheet: true,
    viewAllTimesheets: true,
    editTimesheets: false,
  },
  paladin: {
    viewAgencyRevenue: true,
    viewAllModels: true,
    viewTeamManagement: true,
    viewFinancials: true,
    viewExpenses: true,
    viewPayroll: false,
    viewAnalytics: true,
    viewCompetitors: true,
    manageTeam: false,
    manageShifts: true,
    manageModels: true,
    assignModels: true,
    viewAllChats: true,
    sendMassMessages: true,
    accessVault: true,
    viewAgencySettings: true,
    editAgencySettings: false,
    clockInOut: true,
    viewOwnTimesheet: true,
    viewAllTimesheets: true,
    editTimesheets: false,
  },
  alchemist: {
    viewAgencyRevenue: false,
    viewAllModels: true,
    viewTeamManagement: false,
    viewFinancials: false,
    viewExpenses: false,
    viewPayroll: false,
    viewAnalytics: true,
    viewCompetitors: true,
    manageTeam: false,
    manageShifts: false,
    manageModels: false,
    assignModels: false,
    viewAllChats: false,
    sendMassMessages: false,
    accessVault: true,
    viewAgencySettings: false,
    editAgencySettings: false,
    clockInOut: true,
    viewOwnTimesheet: true,
    viewAllTimesheets: false,
    editTimesheets: false,
  },
  ranger: {
    viewAgencyRevenue: false,
    viewAllModels: true,
    viewTeamManagement: false,
    viewFinancials: false,
    viewExpenses: false,
    viewPayroll: false,
    viewAnalytics: true,
    viewCompetitors: true,
    manageTeam: false,
    manageShifts: false,
    manageModels: false,
    assignModels: false,
    viewAllChats: false,
    sendMassMessages: false,
    accessVault: true,
    viewAgencySettings: false,
    editAgencySettings: false,
    clockInOut: true,
    viewOwnTimesheet: true,
    viewAllTimesheets: false,
    editTimesheets: false,
  },
  rogue: {
    viewAgencyRevenue: false,
    viewAllModels: true,
    viewTeamManagement: false,
    viewFinancials: false,
    viewExpenses: false,
    viewPayroll: false,
    viewAnalytics: false,
    viewCompetitors: false,
    manageTeam: false,
    manageShifts: false,
    manageModels: false,
    assignModels: false,
    viewAllChats: false,
    sendMassMessages: false,
    accessVault: true,
    viewAgencySettings: false,
    editAgencySettings: false,
    clockInOut: true,
    viewOwnTimesheet: true,
    viewAllTimesheets: false,
    editTimesheets: false,
  },
  chatter: {
    viewAgencyRevenue: false,
    viewAllModels: false, // Only assigned models
    viewTeamManagement: false,
    viewFinancials: false,
    viewExpenses: false,
    viewPayroll: false,
    viewAnalytics: false,
    viewCompetitors: false,
    manageTeam: false,
    manageShifts: false,
    manageModels: false,
    assignModels: false,
    viewAllChats: false, // Only assigned model chats
    sendMassMessages: false,
    accessVault: true,
    viewAgencySettings: false,
    editAgencySettings: false,
    clockInOut: true,
    viewOwnTimesheet: true,
    viewAllTimesheets: false,
    editTimesheets: false,
  },
  smm: {
    viewAgencyRevenue: false,
    viewAllModels: false, // Only assigned models
    viewTeamManagement: false,
    viewFinancials: false,
    viewExpenses: false,
    viewPayroll: false,
    viewAnalytics: true, // For social stats
    viewCompetitors: true,
    manageTeam: false,
    manageShifts: false,
    manageModels: false,
    assignModels: false,
    viewAllChats: false,
    sendMassMessages: false,
    accessVault: true,
    viewAgencySettings: false,
    editAgencySettings: false,
    clockInOut: true,
    viewOwnTimesheet: true,
    viewAllTimesheets: false,
    editTimesheets: false,
  },
  recruiter: {
    viewAgencyRevenue: false,
    viewAllModels: true,
    viewTeamManagement: false,
    viewFinancials: false,
    viewExpenses: false,
    viewPayroll: false,
    viewAnalytics: false,
    viewCompetitors: false,
    manageTeam: false,
    manageShifts: false,
    manageModels: false,
    assignModels: false,
    viewAllChats: false,
    sendMassMessages: false,
    accessVault: false,
    viewAgencySettings: false,
    editAgencySettings: false,
    clockInOut: true,
    viewOwnTimesheet: true,
    viewAllTimesheets: false,
    editTimesheets: false,
  },
}

/**
 * Get permissions for a role
 */
export function getPermissions(role: UserRole | string | null): Permissions {
  if (!role || !(role in ROLE_PERMISSIONS)) {
    // Default to most restrictive
    return ROLE_PERMISSIONS.chatter
  }
  return ROLE_PERMISSIONS[role as UserRole]
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  role: UserRole | string | null,
  permission: keyof Permissions
): boolean {
  const permissions = getPermissions(role as UserRole)
  return permissions[permission] || false
}

/**
 * Check if user can view a specific profile
 */
export function canViewProfile(
  userRole: UserRole | string | null,
  userId: string,
  targetProfileId: string
): boolean {
  // Users can always view their own profile
  if (userId === targetProfileId) return true
  
  // Admins can view all
  const permissions = getPermissions(userRole as UserRole)
  return permissions.viewTeamManagement
}

/**
 * Check if user can access a specific model
 * (Requires model_assignments check at runtime)
 */
export function canAccessAllModels(role: UserRole | string | null): boolean {
  const permissions = getPermissions(role as UserRole)
  return permissions.viewAllModels
}

/**
 * Check if user is admin level
 */
export function isAdmin(role: UserRole | string | null): boolean {
  if (!role) return false
  const hierarchy = ROLE_HIERARCHY[role as UserRole]
  return hierarchy >= ROLE_HIERARCHY.paladin
}

/**
 * Check if user is owner
 */
export function isOwner(role: UserRole | string | null): boolean {
  return role === 'owner'
}

/**
 * Get filtered navigation items based on role
 */
export function getNavigationForRole(role: UserRole | string | null) {
  const permissions = getPermissions(role as UserRole)
  
  return {
    showDashboard: true,
    showAnalytics: permissions.viewAnalytics,
    showMessages: true,
    showAlfred: true,
    showCreators: permissions.viewAllModels || true, // Show assigned models
    showCRM: true,
    showGhostTracker: permissions.viewCompetitors,
    showQuests: true,
    showContent: true,
    showCalendar: true,
    showVault: permissions.accessVault,
    showCampaigns: permissions.sendMassMessages,
    showExpenses: permissions.viewExpenses,
    showPayroll: permissions.viewPayroll,
    showTeam: permissions.viewTeamManagement,
    showAgencySettings: permissions.viewAgencySettings,
  }
}

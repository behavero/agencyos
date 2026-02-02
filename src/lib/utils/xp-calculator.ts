/**
 * XP Calculator - Pure Utility Functions
 *
 * These functions can be used in both client and server components.
 * No dependencies on server-only code.
 */

/**
 * Calculate user level based on total XP
 * Formula: level = floor(sqrt(xp / 100)) + 1
 */
export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1
}

/**
 * Calculate XP required to reach a specific level
 * Formula: xp = (level - 1)^2 * 100
 */
export function getXpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 100
}

/**
 * Calculate XP required for next level from current level
 */
export function getXpForNextLevel(currentLevel: number): number {
  return getXpForLevel(currentLevel + 1)
}

/**
 * Calculate progress to next level
 */
export function calculateLevelProgress(
  currentXp: number,
  currentLevel: number
): {
  currentLevelXp: number
  nextLevelXp: number
  xpIntoLevel: number
  xpNeeded: number
  progressPercent: number
} {
  const currentLevelXp = getXpForLevel(currentLevel)
  const nextLevelXp = getXpForLevel(currentLevel + 1)
  const xpIntoLevel = currentXp - currentLevelXp
  const xpNeeded = nextLevelXp - currentLevelXp
  const progressPercent = Math.min(100, (xpIntoLevel / xpNeeded) * 100)

  return {
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel,
    xpNeeded,
    progressPercent,
  }
}

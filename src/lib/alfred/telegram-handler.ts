/**
 * Telegram Handler - DISABLED
 *
 * Phase 70-Rollback: Custom AI integration removed.
 * This will be reconnected to OpenClaw VPS later.
 */

/**
 * Process a message from Telegram through Alfred's AI
 * DISABLED - Returns placeholder until OpenClaw is connected
 */
export async function processAlfredMessage(
  message: string,
  userId: string,
  username?: string
): Promise<string> {
  console.log(`[Telegram] Message from ${username || userId}: ${message.substring(0, 50)}...`)
  console.log('[Telegram] AI integration disabled - awaiting OpenClaw connection')

  return `🔧 **AI Temporarily Offline**

The AI brain is being upgraded to OpenClaw.

Your message has been received. Full AI capabilities will be restored shortly.`
}

/**
 * Format a quick status response
 */
export function getQuickStatus(): string {
  return `🤖 **Alfred Status: Upgrading**
  
AI brain is being migrated to OpenClaw engine.

Full capabilities returning soon.`
}

/**
 * Format an unauthorized response
 */
export function getUnauthorizedResponse(): string {
  return `⛔ **Unauthorized**

This bot is restricted to authorized OnyxOS users only.

If you believe this is an error, please contact your agency administrator.`
}

/**
 * Format a help response
 */
export function getHelpResponse(): string {
  return `📚 **Alfred Status: Upgrading**

AI brain is being migrated to OpenClaw engine.

Full capabilities returning soon.`
}

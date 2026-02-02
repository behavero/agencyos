/**
 * Centralized Logging Utility with Telegram Alerts
 * 
 * Features:
 * - Structured logging with timestamps and severity
 * - Automatic Telegram alerts for critical errors
 * - Sanitization of sensitive data
 * - Environment-aware output
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  stack?: string
}

// Sensitive keys to redact from logs
const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'api_key',
  'apiKey',
  'apiSecret',
  'access_token',
  'refresh_token',
  'authorization',
  'cookie',
  'session',
]

/**
 * Sanitize an object by removing/redacting sensitive data
 */
function sanitize(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitize(item))
  }

  const sanitized: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase()
    const isSensitive = SENSITIVE_KEYS.some(sensitive => 
      keyLower.includes(sensitive.toLowerCase())
    )

    if (isSensitive) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitize(value)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Format log entry for console output
 */
function formatLogEntry(entry: LogEntry): string {
  const emoji = {
    INFO: 'ℹ️',
    WARN: '⚠️',
    ERROR: '🔴',
    DEBUG: '🔍',
  }[entry.level]

  const parts = [
    `[${entry.timestamp}]`,
    `${emoji} ${entry.level}`,
    entry.message,
  ]

  if (entry.context && Object.keys(entry.context).length > 0) {
    parts.push('\nContext:', JSON.stringify(entry.context, null, 2))
  }

  if (entry.stack && process.env.NODE_ENV === 'development') {
    parts.push('\nStack:', entry.stack)
  }

  return parts.join(' ')
}

/**
 * Send Telegram alert for critical errors
 */
async function sendTelegramAlert(entry: LogEntry): Promise<void> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const allowedUsers = process.env.TELEGRAM_ALLOWED_USERS?.split(',') || []

    if (!botToken || allowedUsers.length === 0) {
      // Telegram not configured, skip alert
      return
    }

    const message = [
      `🔴 **CRITICAL ERROR**`,
      ``,
      `**Time:** ${entry.timestamp}`,
      `**Message:** ${entry.message}`,
      ``,
      entry.context ? `**Context:**\n\`\`\`json\n${JSON.stringify(entry.context, null, 2).substring(0, 500)}\n\`\`\`` : '',
      ``,
      `**Environment:** ${process.env.NODE_ENV || 'unknown'}`,
      `**App:** OnyxOS`,
    ].filter(Boolean).join('\n')

    // Send to all allowed users
    for (const userId of allowedUsers) {
      if (!userId) continue

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: userId,
          text: message,
          parse_mode: 'Markdown',
        }),
      }).catch(() => {
        // Silent fail - don't let Telegram errors break logging
      })
    }
  } catch (error) {
    // Silent fail - logging errors shouldn't break the app
    console.error('[Logger] Failed to send Telegram alert:', error)
  }
}

/**
 * Core logging function
 */
async function log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): Promise<void> {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: context ? sanitize(context) as Record<string, unknown> : undefined,
    stack: error?.stack,
  }

  // Console output
  const formatted = formatLogEntry(entry)
  
  switch (level) {
    case 'ERROR':
      console.error(formatted)
      // Send Telegram alert for errors in production
      if (process.env.NODE_ENV === 'production') {
        // Don't await - fire and forget
        sendTelegramAlert(entry).catch(() => {})
      }
      break
    case 'WARN':
      console.warn(formatted)
      break
    case 'DEBUG':
      if (process.env.NODE_ENV === 'development') {
        console.debug(formatted)
      }
      break
    default:
      console.log(formatted)
  }

  // TODO: In future, could also send to external logging service (Sentry, LogDNA, etc.)
}

/**
 * Logger interface
 */
export const logger = {
  /**
   * Log informational message
   */
  info: (message: string, context?: Record<string, unknown>) => {
    return log('INFO', message, context)
  },

  /**
   * Log warning
   */
  warn: (message: string, context?: Record<string, unknown>) => {
    return log('WARN', message, context)
  },

  /**
   * Log error (triggers Telegram alert in production)
   */
  error: (message: string, context?: Record<string, unknown>, error?: Error) => {
    return log('ERROR', message, context, error)
  },

  /**
   * Log debug info (only in development)
   */
  debug: (message: string, context?: Record<string, unknown>) => {
    return log('DEBUG', message, context)
  },

  /**
   * Create a child logger with a prefix
   */
  child: (prefix: string) => ({
    info: (message: string, context?: Record<string, unknown>) => 
      log('INFO', `[${prefix}] ${message}`, context),
    warn: (message: string, context?: Record<string, unknown>) => 
      log('WARN', `[${prefix}] ${message}`, context),
    error: (message: string, context?: Record<string, unknown>, error?: Error) => 
      log('ERROR', `[${prefix}] ${message}`, context, error),
    debug: (message: string, context?: Record<string, unknown>) => 
      log('DEBUG', `[${prefix}] ${message}`, context),
  }),
}

/**
 * Example usage:
 * 
 * import { logger } from '@/lib/utils/logger'
 * 
 * logger.info('User logged in', { userId: '123', email: 'user@example.com' })
 * logger.warn('API rate limit approaching', { remaining: 10 })
 * logger.error('Database connection failed', { dbHost: 'localhost' }, error)
 * 
 * const apiLogger = logger.child('FanvueAPI')
 * apiLogger.error('Sync failed', { modelId: 'xxx' })
 */

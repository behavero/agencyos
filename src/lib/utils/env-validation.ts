/**
 * Environment Variable Validation
 * Phase E: Fail fast if required variables are missing at startup
 *
 * Called from instrumentation.ts during server initialization.
 */

interface EnvVar {
  name: string
  required: boolean
  description: string
}

const ENV_VARS: EnvVar[] = [
  // Required - App will not function without these
  { name: 'NEXT_PUBLIC_SUPABASE_URL', required: true, description: 'Supabase project URL' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true, description: 'Supabase anonymous key' },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabase service role key (server-side)',
  },

  // Recommended - Features degrade without these
  { name: 'GROQ_API_KEY', required: false, description: 'Groq API key (Alfred AI chat)' },
  {
    name: 'FANVUE_CLIENT_ID',
    required: false,
    description: 'Fanvue OAuth client ID (or NEXT_PUBLIC_FANVUE_CLIENT_ID)',
  },
  { name: 'FANVUE_CLIENT_SECRET', required: false, description: 'Fanvue OAuth client secret' },
  {
    name: 'OAUTH_SCOPES',
    required: false,
    description:
      'Fanvue OAuth scopes — must exactly match what is configured in the Fanvue developer portal (e.g. "read:self read:creator read:insights")',
  },
  {
    name: 'FIRECRAWL_API_KEY',
    required: false,
    description: 'Firecrawl API key (Ghost Tracker web scraping)',
  },
  { name: 'CRON_SECRET', required: false, description: 'Secret for cron job authentication' },
  { name: 'NEXT_PUBLIC_APP_URL', required: false, description: 'App URL for OAuth callbacks' },
]

export function validateEnv(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name]
    const isEmpty = !value || value.trim() === '' || value.startsWith('your-')

    if (envVar.required && isEmpty) {
      errors.push(`MISSING: ${envVar.name} — ${envVar.description}`)
    } else if (!envVar.required && isEmpty) {
      warnings.push(`OPTIONAL: ${envVar.name} not set — ${envVar.description}`)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Log validation results at startup.
 * Only logs warnings in production, errors always logged.
 */
export function logEnvValidation(): void {
  const { valid, errors, warnings } = validateEnv()

  if (errors.length > 0) {
    console.error('=== ENV VALIDATION ERRORS ===')
    for (const error of errors) {
      console.error(`  [ERROR] ${error}`)
    }
    console.error('============================')
    console.error('The application may not function correctly without these variables.')
  }

  if (warnings.length > 0 && process.env.NODE_ENV !== 'production') {
    console.warn('=== ENV VALIDATION WARNINGS ===')
    for (const warning of warnings) {
      console.warn(`  [WARN] ${warning}`)
    }
    console.warn('==============================')
  }

  if (valid && errors.length === 0) {
    console.log('[ENV] All required environment variables are set.')
  }
}

#!/usr/bin/env tsx
/**
 * Configure Vercel Firewall Rules Programmatically
 *
 * This script uses the Vercel REST API to set up firewall rules
 * automatically instead of manually through the dashboard.
 *
 * Usage:
 *   npm install -g tsx
 *   tsx scripts/configure-firewall.ts
 *
 * Required Environment Variables:
 *   VERCEL_TOKEN - Your Vercel API token
 *   VERCEL_PROJECT_ID - Your project ID (default: prj_dpjb3dwc1yD6gYdHTBQAQjNlCGLf)
 *   VERCEL_TEAM_ID - Your team ID (default: team_6AhWbdS9iEGk1kBHfDIsIGfb)
 */

const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || 'prj_dpjb3dwc1yD6gYdHTBQAQjNlCGLf'
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || 'team_6AhWbdS9iEGk1kBHfDIsIGfb'

if (!VERCEL_TOKEN) {
  console.error('❌ Error: VERCEL_TOKEN environment variable is required')
  console.error('Create one at: https://vercel.com/account/tokens')
  process.exit(1)
}

interface FirewallRule {
  name: string
  active: boolean
  action: 'log' | 'challenge' | 'deny' | 'bypass' | 'rate_limit' | 'redirect'
  conditionGroup: {
    operator: 'and' | 'or'
    conditions: any[]
  }
  rateLimit?: {
    algo: 'fixed_window' | 'token_bucket'
    window: number
    limit: number
    keys: string[]
    action?: 'log' | 'challenge' | 'deny'
    actionDuration?: string
  }
  redirect?: {
    location: string
    permanent: boolean
  }
  bypassSystem?: boolean
}

// Define our firewall rules
const FIREWALL_RULES: FirewallRule[] = [
  // Rule 1: Rate limit API routes
  {
    name: 'API Rate Limiting',
    active: true,
    action: 'rate_limit',
    conditionGroup: {
      operator: 'and',
      conditions: [
        {
          type: 'path',
          op: 'pre',
          value: '/api/',
        },
      ],
    },
    rateLimit: {
      algo: 'fixed_window',
      window: 60, // 1 minute
      limit: 100, // 100 requests
      keys: ['ip'],
      action: 'deny',
      actionDuration: '60s',
    },
  },

  // Rule 2: Challenge suspicious bots
  {
    name: 'Challenge Suspicious Bots',
    active: true,
    action: 'challenge',
    conditionGroup: {
      operator: 'or',
      conditions: [
        {
          type: 'ja3',
          op: 'eq',
          value: 'bot', // This is a placeholder - actual JA3 fingerprints needed
        },
      ],
    },
  },

  // Rule 3: Block high-risk countries (optional - comment out if you need global access)
  {
    name: 'Block High-Risk Countries',
    active: false, // Disabled by default - enable if needed
    action: 'deny',
    conditionGroup: {
      operator: 'and',
      conditions: [
        {
          type: 'geo_country',
          op: 'in',
          value: ['CN', 'RU', 'KP', 'IR'],
        },
        {
          type: 'path',
          op: 'npre',
          value: '/api/webhook', // Exclude webhooks
        },
      ],
    },
  },

  // Rule 4: Protect authentication endpoints
  {
    name: 'Login Rate Limiting',
    active: true,
    action: 'rate_limit',
    conditionGroup: {
      operator: 'or',
      conditions: [
        {
          type: 'path',
          op: 'eq',
          value: '/api/auth/signin',
        },
        {
          type: 'path',
          op: 'pre',
          value: '/api/oauth/',
        },
      ],
    },
    rateLimit: {
      algo: 'fixed_window',
      window: 300, // 5 minutes
      limit: 5, // 5 attempts
      keys: ['ip'],
      action: 'deny',
      actionDuration: '600s', // Block for 10 minutes
    },
  },

  // Rule 5: Challenge analytics API (resource-intensive)
  {
    name: 'Challenge Analytics API',
    active: true,
    action: 'rate_limit',
    conditionGroup: {
      operator: 'and',
      conditions: [
        {
          type: 'path',
          op: 'pre',
          value: '/api/analytics/',
        },
      ],
    },
    rateLimit: {
      algo: 'token_bucket',
      window: 60,
      limit: 30,
      keys: ['ip'],
      action: 'challenge',
    },
  },
]

async function configureFirewall() {
  console.log('🔒 Configuring Vercel Firewall...\n')

  try {
    // Create each rule
    for (let i = 0; i < FIREWALL_RULES.length; i++) {
      const rule = FIREWALL_RULES[i]
      console.log(`📋 Creating rule ${i + 1}/${FIREWALL_RULES.length}: ${rule.name}`)

      const response = await fetch(
        `https://api.vercel.com/v1/security/firewall/config?projectId=${VERCEL_PROJECT_ID}&teamId=${VERCEL_TEAM_ID}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'rules.create',
            id: `rule-${i + 1}`,
            value: rule,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.text()
        console.error(`   ❌ Failed to create rule: ${error}`)
        continue
      }

      const result = await response.json()
      console.log(`   ✅ Created successfully`)

      // Set priority
      const priorityResponse = await fetch(
        `https://api.vercel.com/v1/security/firewall/config?projectId=${VERCEL_PROJECT_ID}&teamId=${VERCEL_TEAM_ID}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'rules.priority',
            id: `rule-${i + 1}`,
            value: i, // Priority based on order
          }),
        }
      )

      if (priorityResponse.ok) {
        console.log(`   📊 Priority set to ${i}`)
      }
    }

    console.log('\n✅ Firewall configuration complete!')
    console.log('\n📊 Summary:')
    console.log(`   - ${FIREWALL_RULES.length} rules created`)
    console.log(`   - ${FIREWALL_RULES.filter(r => r.active).length} rules active`)
    console.log(
      `   - ${FIREWALL_RULES.filter(r => !r.active).length} rules disabled (can be enabled in dashboard)`
    )
    console.log('\n🔗 View in dashboard:')
    console.log(
      `   https://vercel.com/${VERCEL_TEAM_ID.replace('team_', '')}/${VERCEL_PROJECT_ID.replace('prj_', '')}/settings/firewall`
    )
  } catch (error) {
    console.error('❌ Error configuring firewall:', error)
    process.exit(1)
  }
}

// Enable bot protection (free)
async function enableBotProtection() {
  console.log('\n🤖 Enabling Bot Protection...')

  try {
    const response = await fetch(
      `https://api.vercel.com/v1/security/firewall/config?projectId=${VERCEL_PROJECT_ID}&teamId=${VERCEL_TEAM_ID}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firewallEnabled: true,
          managedRules: {
            bot: {
              active: true,
              action: 'challenge',
            },
            aiBot: {
              active: true,
              action: 'deny', // Block AI scrapers
            },
          },
        }),
      }
    )

    if (response.ok) {
      console.log('   ✅ Bot protection enabled')
      console.log('   ✅ AI bot blocking enabled')
    } else {
      const error = await response.text()
      console.error(`   ❌ Failed to enable bot protection: ${error}`)
    }
  } catch (error) {
    console.error('❌ Error enabling bot protection:', error)
  }
}

// Main execution
async function main() {
  console.log('🚀 Vercel Firewall Configuration\n')
  console.log(`Project: ${VERCEL_PROJECT_ID}`)
  console.log(`Team: ${VERCEL_TEAM_ID}\n`)

  await configureFirewall()
  await enableBotProtection()

  console.log('\n🎉 All done! Your firewall is now configured.')
  console.log('\n💡 Next steps:')
  console.log('   1. Review rules in the Vercel dashboard')
  console.log('   2. Test your API endpoints to ensure they work')
  console.log('   3. Monitor firewall logs for blocked requests')
  console.log('   4. Adjust rate limits as needed based on usage')
}

main()

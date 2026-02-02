/**
 * Script: Seed Database
 *
 * This script populates the database with initial development data.
 * Run after fresh migration: npx ts-node scripts/seed-db.ts
 *
 * Prerequisites:
 * - SUPABASE_URL in .env.local
 * - SUPABASE_SERVICE_ROLE_KEY in .env.local (for admin access)
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function seedDatabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials')
    console.log('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🌱 Seeding database...')

  try {
    // Seed default quest templates
    const questTemplates = [
      {
        title: '🔥 Daily Revenue Check',
        description: "Review and confirm yesterday's revenue in the dashboard",
        xp_reward: 25,
        role_target: 'owner',
        category: 'revenue',
      },
      {
        title: '📸 Post 3 Stories',
        description: 'Post at least 3 Instagram stories for the model',
        xp_reward: 50,
        role_target: 'smm',
        category: 'content',
      },
      {
        title: '💬 Reply to 20 Fans',
        description: 'Send personalized replies to 20 fan messages',
        xp_reward: 75,
        role_target: 'chatter',
        category: 'engagement',
      },
      {
        title: '🐋 Land a Whale',
        description: 'Close a single tip or sale worth $100+',
        xp_reward: 200,
        role_target: 'chatter',
        category: 'sales',
      },
      {
        title: '📊 Content Analysis',
        description: 'Review and tag top 5 performing posts of the week',
        xp_reward: 40,
        role_target: 'smm',
        category: 'analytics',
      },
    ]

    console.log('📋 Quest templates ready for insertion when agency is created')

    // Seed default knowledge base categories
    const knowledgeCategories = [
      'SOPs',
      'Sales Training',
      'Content Guidelines',
      'HR & Policies',
      'Tools & Tutorials',
    ]

    console.log('📚 Knowledge base categories:', knowledgeCategories)

    // Seed script categories
    const scriptCategories = [
      'Openers',
      'Objection Handling',
      'Upselling',
      'PPV Promotion',
      'Closing',
      'Relationship Building',
    ]

    console.log('📝 Script categories:', scriptCategories)

    console.log('')
    console.log('✅ Seed data prepared successfully!')
    console.log('ℹ️  Note: Actual data will be inserted when agencies are created')
    console.log('ℹ️  This ensures proper agency_id linkage and RLS compliance')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

seedDatabase()

import { createClient } from '@/lib/supabase/server'

interface ModelContext {
  name: string
  revenue: number
  revenueChange: number
  subscribers: number
  followers: number
  unreadMessages: number
  postsCount: number
  socialStats: {
    instagram: { followers: number; views: number } | null
    tiktok: { followers: number; views: number } | null
    youtube: { followers: number; views: number } | null
    x: { followers: number; views: number } | null
  }
  questCompletionRate: number
  activeQuests: number
  completedQuests: number
}

interface AgencyContext {
  name: string
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  taxRate: number
  currency: string
  agencyLevel: number
  modelsCount: number
  models: ModelContext[]
}

/**
 * Build comprehensive context for a specific model
 */
export async function buildModelContext(modelId: string): Promise<string> {
  const supabase = await createClient()

  // Fetch model data
  const { data: model } = await supabase
    .from('models')
    .select('*')
    .eq('id', modelId)
    .single()

  if (!model) {
    return 'Model not found. Unable to provide context.'
  }

  // Fetch latest social stats
  const today = new Date().toISOString().split('T')[0]
  const { data: socialStats } = await supabase
    .from('social_stats')
    .select('*')
    .eq('model_id', modelId)
    .eq('date', today)

  // Fetch quest stats
  const { data: quests } = await supabase
    .from('quests')
    .select('*')
    .eq('model_id', modelId)

  const totalQuests = quests?.length || 0
  const completedQuests = quests?.filter(q => q.completed_at)?.length || 0
  const completionRate = totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0

  // Build social stats object
  const socialByPlatform: Record<string, { followers: number; views: number }> = {}
  socialStats?.forEach(stat => {
    socialByPlatform[stat.platform] = {
      followers: stat.followers || 0,
      views: stat.views || 0,
    }
  })

  // Format the context string
  const parts: string[] = [
    `MODEL: ${model.name || 'Unknown'}`,
    `FANVUE USERNAME: @${model.fanvue_username || 'N/A'}`,
    ``,
    `💰 FINANCIAL:`,
    `- Total Revenue: $${(model.revenue_total || 0).toLocaleString()}`,
    `- Active Subscribers: ${(model.subscribers_count || 0).toLocaleString()}`,
    `- Followers: ${(model.followers_count || 0).toLocaleString()}`,
    `- Unread Messages: ${model.unread_messages || 0}`,
    ``,
    `📊 CONTENT:`,
    `- Total Posts: ${model.posts_count || 0}`,
    `- Images: ${model.image_count || 0}`,
    `- Videos: ${model.video_count || 0}`,
    ``,
    `📱 SOCIAL MEDIA (Today):`,
  ]

  // Add social stats
  const platforms = ['instagram', 'tiktok', 'youtube', 'x']
  platforms.forEach(platform => {
    const stats = socialByPlatform[platform]
    if (stats) {
      const platformName = platform === 'x' ? 'X/Twitter' : platform.charAt(0).toUpperCase() + platform.slice(1)
      parts.push(`- ${platformName}: ${stats.followers.toLocaleString()} followers, ${stats.views.toLocaleString()} views today`)
    }
  })

  if (!Object.keys(socialByPlatform).length) {
    parts.push('- No social stats recorded today')
  }

  parts.push('')
  parts.push(`🎯 QUESTS:`)
  parts.push(`- Completion Rate: ${completionRate}%`)
  parts.push(`- Active Quests: ${totalQuests - completedQuests}`)
  parts.push(`- Completed: ${completedQuests}/${totalQuests}`)

  return parts.join('\n')
}

/**
 * Build comprehensive context for the entire agency
 */
export async function buildAgencyContext(): Promise<string> {
  const supabase = await createClient()

  // Get current user's agency
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return 'User not authenticated.'
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id, username, role, xp_count, current_streak')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) {
    return 'No agency found for this user.'
  }

  // Fetch agency
  const { data: agency } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', profile.agency_id)
    .single()

  // Fetch all models
  const { data: models } = await supabase
    .from('models')
    .select('*')
    .eq('agency_id', profile.agency_id)

  // Fetch expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount')
    .eq('agency_id', profile.agency_id)

  // Fetch all quests
  const { data: quests } = await supabase
    .from('quests')
    .select('*')
    .eq('agency_id', profile.agency_id)

  // Calculate totals
  const totalRevenue = models?.reduce((sum, m) => sum + (m.revenue_total || 0), 0) || 0
  const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
  const platformFee = totalRevenue * 0.20
  const taxRate = agency?.tax_rate || 0.20
  const profitBeforeTax = totalRevenue - platformFee - totalExpenses
  const taxes = Math.max(0, profitBeforeTax * taxRate)
  const netProfit = Math.max(0, profitBeforeTax - taxes)

  const totalQuests = quests?.length || 0
  const completedQuests = quests?.filter(q => q.completed_at)?.length || 0
  const questRate = totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0

  const totalSubscribers = models?.reduce((sum, m) => sum + (m.subscribers_count || 0), 0) || 0
  const totalFollowers = models?.reduce((sum, m) => sum + (m.followers_count || 0), 0) || 0
  const totalUnread = models?.reduce((sum, m) => sum + (m.unread_messages || 0), 0) || 0

  // Build context
  const parts: string[] = [
    `🏢 AGENCY: ${agency?.name || 'Unknown'}`,
    `👤 USER: ${profile.username || 'User'} (${profile.role || 'Member'})`,
    `📊 LEVEL: ${agency?.current_level || 1} | XP: ${profile.xp_count || 0} | STREAK: ${profile.current_streak || 0} days`,
    ``,
    `💰 FINANCIALS:`,
    `- Gross Revenue: $${totalRevenue.toLocaleString()}`,
    `- Platform Fee (20%): -$${platformFee.toLocaleString()}`,
    `- Operating Expenses: -$${totalExpenses.toLocaleString()}`,
    `- Taxes (${(taxRate * 100).toFixed(0)}%): -$${taxes.toLocaleString()}`,
    `- NET PROFIT: $${netProfit.toLocaleString()}`,
    `- Profit Margin: ${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%`,
    ``,
    `👥 MODELS (${models?.length || 0}):`,
  ]

  // Add model summaries
  models?.forEach((m, i) => {
    parts.push(`${i + 1}. ${m.name}: $${(m.revenue_total || 0).toLocaleString()} revenue, ${m.subscribers_count || 0} subs, ${m.unread_messages || 0} unread`)
  })

  parts.push('')
  parts.push(`📈 TOTALS:`)
  parts.push(`- Total Subscribers: ${totalSubscribers.toLocaleString()}`)
  parts.push(`- Total Followers: ${totalFollowers.toLocaleString()}`)
  parts.push(`- Unread Messages: ${totalUnread}`)
  parts.push('')
  parts.push(`🎯 QUESTS:`)
  parts.push(`- Completion Rate: ${questRate}%`)
  parts.push(`- Active: ${totalQuests - completedQuests} | Completed: ${completedQuests}`)

  return parts.join('\n')
}

/**
 * Get suggested prompts based on current data
 */
export async function getSuggestedPrompts(): Promise<string[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) return []

  // Fetch models to generate relevant prompts
  const { data: models } = await supabase
    .from('models')
    .select('name, unread_messages, revenue_total')
    .eq('agency_id', profile.agency_id)
    .limit(3)

  const prompts: string[] = [
    '📊 Give me a full agency performance report',
    '💡 What strategies can increase our revenue by 20%?',
    '🎯 Which quests should we prioritize today?',
  ]

  // Add model-specific prompts
  if (models && models.length > 0) {
    const topModel = models.reduce((max, m) => 
      (m.revenue_total || 0) > (max.revenue_total || 0) ? m : max
    , models[0])

    if (topModel) {
      prompts.push(`🌟 Analyze ${topModel.name}'s growth potential`)
    }

    const modelWithUnread = models.find(m => (m.unread_messages || 0) > 5)
    if (modelWithUnread) {
      prompts.push(`💬 ${modelWithUnread.name} has ${modelWithUnread.unread_messages} unread - help me prioritize`)
    }
  }

  prompts.push('📱 How can we improve our social media reach?')
  prompts.push('💰 Audit our expenses and find savings')

  return prompts.slice(0, 6)
}

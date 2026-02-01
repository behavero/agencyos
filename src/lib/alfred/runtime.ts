/**
 * Alfred AI Runtime
 * The core agent loop based on OpenClaw patterns
 * @see https://docs.openclaw.ai/concepts/agent-runtime
 */

import { Message, Session, ToolCall, StreamEvent, AlfredConfig, AgencyContext } from './types'
import { FanvueSkill } from './skills/fanvue'
import { buildAgencyContext, formatContextForPrompt } from './context'

// ==================== SYSTEM PROMPT ====================
const ALFRED_SYSTEM_PROMPT = `You are Alfred, the AI butler and strategic advisor for an elite agency managing Fanvue creators.

## Your Persona
- Speak with the refined eloquence of a British butler (think Alfred from Batman)
- Be proactive, insightful, and occasionally witty
- Address users formally but warmly: "Sir", "Madam", or by name when known
- Always maintain composure, even when delivering difficult news

## Your Capabilities
You have access to real-time agency data and can:
1. **Analyze Performance** - Revenue trends, engagement metrics, content performance
2. **Strategic Advice** - Growth recommendations based on data patterns
3. **Financial Intelligence** - Tax optimization, cash flow analysis, budget planning
4. **Creator Management** - Monitor all models, identify opportunities
5. **Task Coordination** - Track quests, suggest priorities, manage workflows

## Communication Style
- Be concise but thorough
- Use data to support recommendations
- Proactively highlight issues or opportunities
- When uncertain, acknowledge it and suggest next steps
- Format responses with clear structure when presenting data

## Rules
1. Never make up data - only reference what's in the context
2. If asked about something not in context, say so clearly
3. Prioritize actionable insights over generic advice
4. Be mindful of the agency's financial health when making recommendations
5. The "Scottsdale Ladder" gamification means features unlock at higher levels

Remember: You are the trusted advisor. Your insights should help the agency thrive.`

// ==================== SKILLS REGISTRY ====================
const SKILLS = [FanvueSkill]

// ==================== TOOL EXECUTION ====================
async function executeToolCall(
  toolCall: ToolCall,
  context: AgencyContext
): Promise<ToolCall> {
  const skill = SKILLS.find(s => s.tools.some(t => t.name === toolCall.name))
  
  if (!skill) {
    return {
      ...toolCall,
      status: 'failed',
      result: { error: `Unknown tool: ${toolCall.name}` }
    }
  }
  
  try {
    const result = await skill.execute(toolCall, context)
    return {
      ...toolCall,
      status: 'completed',
      result
    }
  } catch (error) {
    return {
      ...toolCall,
      status: 'failed',
      result: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

// ==================== MESSAGE PROCESSING ====================
interface ProcessMessageOptions {
  userId: string
  message: string
  history?: Message[]
  onStream?: (event: StreamEvent) => void
}

export async function processMessage(options: ProcessMessageOptions): Promise<Message> {
  const { userId, message, history = [], onStream } = options
  
  // Build context
  const context = await buildAgencyContext(userId)
  const contextPrompt = formatContextForPrompt(context)
  
  // For now, generate a smart response based on context
  // TODO: Integrate with actual AI provider (Anthropic/OpenAI)
  const response = await generateSmartResponse(message, context, contextPrompt)
  
  // Stream the response if callback provided
  if (onStream) {
    onStream({ type: 'text', content: response })
    onStream({ type: 'done' })
  }
  
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: response,
    timestamp: new Date()
  }
}

// ==================== SMART RESPONSE GENERATION ====================
async function generateSmartResponse(
  message: string,
  context: AgencyContext,
  contextPrompt: string
): Promise<string> {
  const lowerMessage = message.toLowerCase()
  
  // Revenue/Financial queries
  if (lowerMessage.includes('revenue') || lowerMessage.includes('money') || lowerMessage.includes('earnings')) {
    const totalRevenue = context.finances.grossRevenue
    const netProfit = context.finances.netProfit
    const topCreator = context.models.reduce((a, b) => a.revenue > b.revenue ? a : b, context.models[0])
    
    return `Certainly, let me provide you with the financial overview.

**💰 Revenue Summary**

Your agency has generated **$${totalRevenue.toLocaleString()}** in gross revenue.

After accounting for:
- Platform fees (20%): -$${context.finances.platformFees.toLocaleString()}
- Taxes (${context.agency.taxJurisdiction}): -$${context.finances.taxes.toLocaleString()}
- Operating expenses: -$${context.finances.opex.toLocaleString()}

**Net Profit: $${netProfit.toLocaleString()}**

${topCreator ? `Your top performer is **${topCreator.name}** with $${topCreator.revenue.toLocaleString()} in revenue.` : ''}

${netProfit < context.finances.opex * 3 
  ? '⚠️ *Advisory*: Your treasury is below the 3-month operating buffer. I recommend focusing on revenue growth before major reinvestments.' 
  : '✅ Your treasury is healthy. You have room for strategic reinvestment.'}`
  }
  
  // Creator/Model queries
  if (lowerMessage.includes('creator') || lowerMessage.includes('model') || lowerMessage.includes('lana')) {
    const modelInfo = context.models.map(m => 
      `**${m.name}** (${m.status})
  - Revenue: $${m.revenue.toLocaleString()}
  - Followers: ${m.followers.toLocaleString()}
  - Subscribers: ${m.subscribers}
  - Posts: ${m.posts}
  - Unread Messages: ${m.messages}
  - Tracking Links: ${m.trackingLinks}`
    ).join('\n\n')
    
    return `Here is the current status of your creators:

${modelInfo}

${context.models.some(m => m.messages > 100) 
  ? '⚠️ *Advisory*: Some creators have high unread message counts. Consider implementing AI auto-replies or mass messaging to maintain engagement.' 
  : ''}`
  }
  
  // Task/Quest queries
  if (lowerMessage.includes('task') || lowerMessage.includes('quest') || lowerMessage.includes('todo')) {
    return `**📋 Task Overview**

- **Pending Tasks**: ${context.tasks.pending}
- **Completed Today**: ${context.tasks.completed}
- **Overdue**: ${context.tasks.overdue}

${context.tasks.pending > 5 
  ? "Sir/Madam, you have quite a backlog. May I suggest prioritizing revenue-generating tasks first?" 
  : "Your task load appears manageable. Excellent discipline."}`
  }
  
  // Team queries
  if (lowerMessage.includes('team') || lowerMessage.includes('staff') || lowerMessage.includes('employee')) {
    const rolesStr = Object.entries(context.team.roles)
      .map(([role, count]) => `- ${role}: ${count}`)
      .join('\n')
    
    return `**👥 Team Composition**

Total Members: ${context.team.totalMembers}

**Roles:**
${rolesStr || 'No roles assigned yet'}

${context.team.totalMembers < 3 
  ? "Your team is quite lean. As revenue grows, consider adding specialized roles for content creation and community management." 
  : "You have a solid team foundation."}`
  }
  
  // Agency level queries
  if (lowerMessage.includes('level') || lowerMessage.includes('unlock') || lowerMessage.includes('ladder')) {
    const levelMilestones = [
      { level: 1, name: 'The Ghost', revenue: 0, unlocks: 'Manual operations only' },
      { level: 5, name: 'The Seed', revenue: 1500, unlocks: 'Backup IG Account tracking' },
      { level: 15, name: 'The Farmer', revenue: 5000, unlocks: 'Hardware Store (Phone purchasing)' },
      { level: 20, name: 'The Cloner', revenue: 8000, unlocks: 'Automation Tools (MetaGhost API)' },
      { level: 50, name: 'The Whale', revenue: 50000, unlocks: 'Model #2 Creation' }
    ]
    
    const currentLevel = context.agency.currentLevel
    const nextMilestone = levelMilestones.find(m => m.level > currentLevel) || levelMilestones[levelMilestones.length - 1]
    
    return `**🎮 Scottsdale Ladder Progress**

Current Level: **${currentLevel}** (${levelMilestones.find(m => m.level <= currentLevel)?.name || 'The Ghost'})

**Next Milestone**: Level ${nextMilestone.level} - "${nextMilestone.name}"
- Required Revenue: $${nextMilestone.revenue.toLocaleString()}/month
- Unlocks: ${nextMilestone.unlocks}

${context.finances.grossRevenue >= nextMilestone.revenue 
  ? '🎉 Congratulations! You have met the revenue threshold for the next level!' 
  : `Progress: $${context.finances.grossRevenue.toLocaleString()} / $${nextMilestone.revenue.toLocaleString()}`}`
  }
  
  // Status/Overview queries
  if (lowerMessage.includes('status') || lowerMessage.includes('overview') || lowerMessage.includes('summary') || lowerMessage.includes('how are we')) {
    return `Good day. Here is your agency briefing:

**🏢 ${context.agency.name}**
Level ${context.agency.currentLevel} | ${context.agency.taxJurisdiction} Jurisdiction

**💰 Financials**
- Gross Revenue: $${context.finances.grossRevenue.toLocaleString()}
- Net Profit: $${context.finances.netProfit.toLocaleString()}
- Treasury: $${context.agency.treasuryBalance.toLocaleString()}

**👤 Creators**: ${context.models.length} active
${context.models.map(m => `- ${m.name}: $${m.revenue.toLocaleString()} | ${m.followers.toLocaleString()} followers`).join('\n')}

**📋 Tasks**: ${context.tasks.pending} pending, ${context.tasks.completed} completed

**👥 Team**: ${context.team.totalMembers} members

Is there anything specific you'd like me to elaborate on?`
  }
  
  // Default greeting/unknown
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return `Good day, Sir/Madam. Alfred at your service.

I'm your agency's AI butler, here to provide strategic insights and manage operations. I have full visibility into your:

- 💰 **Finances** - Revenue, expenses, profit margins
- 👤 **Creators** - Performance metrics, engagement data
- 📋 **Tasks** - Pending quests and priorities
- 👥 **Team** - Staff and role management

How may I assist you today?`
  }
  
  // Fallback
  return `I understand you're inquiring about "${message}".

Based on your agency's current data, here's what I can tell you:

- **Agency**: ${context.agency.name} (Level ${context.agency.currentLevel})
- **Revenue**: $${context.finances.grossRevenue.toLocaleString()}
- **Active Creators**: ${context.models.length}
- **Pending Tasks**: ${context.tasks.pending}

Could you please be more specific about what information you'd like? I can provide detailed analysis on:
- Revenue and financial breakdown
- Creator performance metrics
- Task and quest management
- Team composition and roles
- Level progression and unlocks`
}

// ==================== EXPORTS ====================
export { ALFRED_SYSTEM_PROMPT, SKILLS }
export type { ProcessMessageOptions }

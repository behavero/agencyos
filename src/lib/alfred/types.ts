/**
 * Alfred AI Types - Based on OpenClaw Architecture
 * @see https://docs.openclaw.ai/
 */

// ==================== MESSAGES ====================
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  metadata?: {
    model?: string
    tokens?: number
    tools?: ToolCall[]
    thinking?: string
  }
}

// ==================== TOOLS/SKILLS ====================
export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, {
    type: string
    description: string
    required?: boolean
    enum?: string[]
  }>
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: unknown
  status: 'pending' | 'running' | 'completed' | 'failed'
}

// ==================== CONTEXT ====================
export interface AgencyContext {
  agency: {
    id: string
    name: string
    treasuryBalance: number
    taxJurisdiction: 'RO' | 'US' | 'EE' | 'FR'
    currentLevel: number
  }
  models: Array<{
    id: string
    name: string
    status: string
    revenue: number
    subscribers: number
    followers: number
    posts: number
    messages: number
    trackingLinks: number
  }>
  tasks: {
    pending: number
    completed: number
    overdue: number
  }
  team: {
    totalMembers: number
    activeToday: number
    roles: Record<string, number>
  }
  finances: {
    grossRevenue: number
    platformFees: number
    taxes: number
    opex: number
    netProfit: number
  }
}

// ==================== SESSIONS ====================
export interface Session {
  id: string
  userId: string
  agencyId: string
  messages: Message[]
  context: AgencyContext
  createdAt: Date
  updatedAt: Date
  metadata?: {
    model?: string
    tokensUsed?: number
    lastActivity?: Date
  }
}

// ==================== SKILLS (OpenClaw Pattern) ====================
export interface Skill {
  name: string
  description: string
  emoji: string
  category: 'fanvue' | 'social' | 'analytics' | 'finance' | 'team' | 'content'
  tools: ToolDefinition[]
  execute: (toolCall: ToolCall, context: AgencyContext) => Promise<unknown>
}

// ==================== STREAMING ====================
export interface StreamEvent {
  type: 'text' | 'tool_start' | 'tool_end' | 'thinking' | 'done' | 'error'
  content?: string
  toolCall?: ToolCall
  error?: string
}

// ==================== CONFIG ====================
export interface AlfredConfig {
  model: string
  provider: 'anthropic' | 'openai'
  maxTokens: number
  temperature: number
  systemPrompt: string
  skills: Skill[]
}

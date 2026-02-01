import { createOpenAI } from '@ai-sdk/openai'

/**
 * Groq AI Provider Configuration
 * 
 * Uses the OpenAI-compatible API with Groq's ultra-fast inference
 * Model: Llama 3.3 70B Versatile - Free tier, blazing fast
 * 
 * Get your free API key at: https://console.groq.com
 */
export const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY || '',
})

/**
 * Default model for Alfred AI Strategist
 * Llama 3.3 70B - Best balance of speed, quality, and cost (free!)
 */
export const ALFRED_MODEL = 'llama-3.3-70b-versatile'

/**
 * Alternative models available on Groq:
 * - 'llama-3.1-8b-instant' - Faster, less capable
 * - 'mixtral-8x7b-32768' - Good for longer context
 * - 'gemma2-9b-it' - Google's model
 */
export const GROQ_MODELS = {
  llama3_70b: 'llama-3.3-70b-versatile',
  llama3_8b: 'llama-3.1-8b-instant',
  mixtral: 'mixtral-8x7b-32768',
  gemma2: 'gemma2-9b-it',
} as const

/**
 * Check if Groq API key is configured
 */
export function isGroqConfigured(): boolean {
  return !!process.env.GROQ_API_KEY
}

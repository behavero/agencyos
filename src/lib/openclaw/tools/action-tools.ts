/**
 * OpenClaw Action Tools — Suggest & Write tools
 *
 * "Suggest" tools draft content but do NOT execute (user must confirm).
 * "Write" tools make real changes and are gated by permissions.
 *
 * Built as factory functions that close over agencyId + userId.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Build suggestion tools scoped to an agency.
 */
export function buildSuggestTools(agencyId: string) {
  return {
    /**
     * Draft a fan message (does NOT send)
     */
    draft_message: tool({
      description:
        'Draft a reply message for a fan conversation. Returns the suggested text without sending it. The user must copy/confirm before sending.',
      inputSchema: z.object({
        model_name: z.string().describe('Creator name to write as'),
        fan_tier: z.enum(['whale', 'spender', 'free', 'unknown']).describe('Fan spending tier'),
        context: z.string().describe('Brief context about the conversation or what the fan said'),
        tone: z
          .enum(['flirty', 'casual', 'upsell', 'warm', 'professional'])
          .default('flirty')
          .describe('Tone for the message'),
      }),
      execute: async ({ model_name, fan_tier, context, tone }) => {
        return {
          action: 'draft_message',
          status: 'suggestion_ready',
          model_name,
          fan_tier,
          context,
          tone,
          instruction: `Generate a ${tone} reply as ${model_name} to a ${fan_tier} fan. Context: ${context}. Keep under 100 words, use 1-2 emojis max.`,
        }
      },
    }),

    /**
     * Suggest a PPV price for content
     */
    suggest_ppv_price: tool({
      description:
        "Recommend an optimal PPV price for a piece of content based on the model's audience and historical performance. Returns a price suggestion with reasoning.",
      inputSchema: z.object({
        model_name: z.string().describe('Creator name'),
        media_type: z.enum(['image', 'video', 'audio']).describe('Type of content'),
        duration_seconds: z.number().optional().describe('Duration in seconds (for video/audio)'),
        is_explicit: z.boolean().default(false).describe('Whether the content is explicit'),
      }),
      execute: async ({ model_name, media_type, duration_seconds, is_explicit }) => {
        const supabase = createAdminClient()

        const { data: models } = await supabase
          .from('models')
          .select('id, subscribers_count, revenue_total')
          .eq('agency_id', agencyId)
          .or(`name.ilike.%${model_name}%,display_name.ilike.%${model_name}%`)
          .limit(1)

        const model = models?.[0]
        const arpu =
          model && model.subscribers_count
            ? Number(model.revenue_total || 0) / model.subscribers_count
            : 10

        let basePrice = 0
        if (media_type === 'video') {
          basePrice = duration_seconds && duration_seconds > 60 ? 15 : 10
        } else if (media_type === 'image') {
          basePrice = 5
        } else {
          basePrice = 8
        }

        if (is_explicit) basePrice *= 1.5
        if (arpu > 50) basePrice *= 1.3
        else if (arpu < 10) basePrice *= 0.8

        const suggestedPrice = Math.round(basePrice * 100) / 100

        return {
          suggested_price: suggestedPrice,
          reasoning: {
            base_price: basePrice,
            media_type,
            audience_arpu: arpu.toFixed(2),
            adjustments: [
              is_explicit ? 'Explicit content (+50%)' : null,
              arpu > 50
                ? 'High ARPU audience (+30%)'
                : arpu < 10
                  ? 'Low ARPU audience (-20%)'
                  : null,
              duration_seconds && duration_seconds > 60 ? 'Long-form video (higher base)' : null,
            ].filter(Boolean),
          },
          note: 'This is a suggestion. Adjust based on your knowledge of this audience.',
        }
      },
    }),

    /**
     * Flag underperforming content assets
     */
    flag_underperformer: tool({
      description:
        "Identify and flag content assets that are underperforming relative to their model's average. Returns a list of assets with recommendations.",
      inputSchema: z.object({
        model_name: z.string().describe('Creator name to analyze'),
        threshold: z
          .number()
          .default(0.5)
          .describe(
            'Performance threshold (0-1). Assets below this fraction of average are flagged.'
          ),
      }),
      execute: async ({ model_name, threshold }) => {
        const supabase = createAdminClient()

        const { data: models } = await supabase
          .from('models')
          .select('id, display_name')
          .eq('agency_id', agencyId)
          .or(`name.ilike.%${model_name}%,display_name.ilike.%${model_name}%`)
          .limit(1)

        if (!models?.[0]) {
          return { error: `No model found matching "${model_name}"` }
        }

        const { data: assets } = await supabase
          .from('content_assets')
          .select('id, media_type, price, created_at, unlock_count, view_count')
          .eq('model_id', models[0].id)
          .eq('agency_id', agencyId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (!assets || assets.length === 0) {
          return { message: 'No content assets found for this model.' }
        }

        const avgUnlocks = assets.reduce((s, a) => s + (a.unlock_count || 0), 0) / assets.length
        const avgViews = assets.reduce((s, a) => s + (a.view_count || 0), 0) / assets.length

        const flagged = assets.filter(
          a =>
            (a.unlock_count || 0) < avgUnlocks * threshold &&
            (a.view_count || 0) < avgViews * threshold
        )

        return {
          model: models[0].display_name,
          total_assets: assets.length,
          average_unlocks: Math.round(avgUnlocks * 10) / 10,
          average_views: Math.round(avgViews * 10) / 10,
          flagged_count: flagged.length,
          flagged_assets: flagged.slice(0, 10).map(a => ({
            id: a.id,
            type: a.media_type,
            price: a.price || 0,
            unlocks: a.unlock_count || 0,
            views: a.view_count || 0,
            recommendation: 'Consider repricing, reposting, or removing.',
          })),
        }
      },
    }),
  }
}

/**
 * Build write tools scoped to an agency + user.
 */
export function buildWriteTools(agencyId: string, userId: string) {
  return {
    /**
     * Create a content task
     */
    create_content_task: tool({
      description:
        'Create a new content task (e.g., "Shoot 3 bikini photos for Lanaa"). Requires admin+ role. Returns the created task.',
      inputSchema: z.object({
        title: z.string().describe('Task title'),
        description: z.string().optional().describe('Task description/details'),
        model_name: z.string().describe('Which model/creator this task is for'),
        priority: z
          .enum(['low', 'medium', 'high', 'urgent'])
          .default('medium')
          .describe('Task priority'),
        due_date: z.string().optional().describe('Due date (ISO format)'),
      }),
      execute: async ({ title, description, model_name, priority, due_date }) => {
        const supabase = createAdminClient()

        const { data: models } = await supabase
          .from('models')
          .select('id, display_name')
          .eq('agency_id', agencyId)
          .or(`name.ilike.%${model_name}%,display_name.ilike.%${model_name}%`)
          .limit(1)

        const modelId = models?.[0]?.id

        const { data: task, error } = await supabase
          .from('content_tasks')
          .insert({
            agency_id: agencyId,
            model_id: modelId || null,
            title,
            description: description || null,
            priority,
            status: 'pending',
            due_date: due_date || null,
            created_by: userId,
          })
          .select('id, title, priority, status, due_date')
          .single()

        if (error) {
          return { error: `Failed to create task: ${error.message}` }
        }

        return {
          success: true,
          task,
          message: `Content task "${title}" created for ${models?.[0]?.display_name || model_name}.`,
        }
      },
    }),

    /**
     * Adjust recommended price for a content asset
     */
    adjust_recommended_price: tool({
      description:
        'Update the recommended price for a content asset in the vault. Requires admin+ role.',
      inputSchema: z.object({
        asset_id: z.string().describe('ID of the content asset to reprice'),
        new_price: z.number().min(0).describe('New recommended price in dollars'),
        reason: z.string().optional().describe('Reason for price change'),
      }),
      execute: async ({ asset_id, new_price, reason }) => {
        const supabase = createAdminClient()

        const { data: asset } = await supabase
          .from('content_assets')
          .select('id, price, model_id')
          .eq('id', asset_id)
          .eq('agency_id', agencyId)
          .single()

        if (!asset) {
          return { error: 'Asset not found or does not belong to this agency.' }
        }

        const oldPrice = asset.price || 0

        const { error } = await supabase
          .from('content_assets')
          .update({ price: new_price })
          .eq('id', asset_id)

        if (error) {
          return { error: `Failed to update price: ${error.message}` }
        }

        return {
          success: true,
          asset_id,
          old_price: oldPrice,
          new_price,
          reason: reason || 'Price adjusted by OpenClaw',
        }
      },
    }),

    /**
     * Queue a mass message campaign (owner-only)
     */
    send_mass_message: tool({
      description:
        'Queue a mass message campaign to all subscribers of a model. OWNER ONLY. The message is queued, not sent immediately. Returns the campaign details for confirmation.',
      inputSchema: z.object({
        model_name: z.string().describe('Creator to send as'),
        message_text: z.string().max(500).describe('Message text to send'),
        target_tier: z
          .enum(['all', 'whale', 'spender', 'free'])
          .default('all')
          .describe('Target audience tier'),
        include_media: z.boolean().default(false).describe('Whether to include media'),
      }),
      execute: async ({ model_name, message_text, target_tier, include_media }) => {
        const supabase = createAdminClient()

        const { data: models } = await supabase
          .from('models')
          .select('id, display_name, subscribers_count')
          .eq('agency_id', agencyId)
          .or(`name.ilike.%${model_name}%,display_name.ilike.%${model_name}%`)
          .limit(1)

        if (!models?.[0]) {
          return { error: `No model found matching "${model_name}"` }
        }

        const targetCount = models[0].subscribers_count || 0

        const { data: campaign, error } = await supabase
          .from('message_queue')
          .insert({
            agency_id: agencyId,
            model_id: models[0].id,
            message_text,
            target_tier,
            include_media,
            status: 'pending_confirmation',
            target_count: targetCount,
          })
          .select('id, status, target_count')
          .single()

        if (error) {
          return { error: `Failed to queue campaign: ${error.message}` }
        }

        return {
          success: true,
          campaign_id: campaign?.id,
          model: models[0].display_name,
          target_tier,
          target_count: targetCount,
          message_preview:
            message_text.substring(0, 100) + (message_text.length > 100 ? '...' : ''),
          status: 'pending_confirmation',
          note: 'Campaign queued. Owner must confirm before sending.',
        }
      },
    }),
  }
}

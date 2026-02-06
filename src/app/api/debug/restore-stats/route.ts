/**
 * DEBUG: Restore model stats from existing transaction data and Fanvue API
 *
 * This endpoint:
 * 1. Recalculates revenue_total from fanvue_transactions
 * 2. Re-fetches subscribers, followers, posts, likes from Fanvue API
 * 3. Only writes non-zero values (never overwrites with 0)
 *
 * Protected by admin auth.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getAgencyFanvueToken } from '@/lib/services/agency-fanvue-auth'
import { createFanvueClient } from '@/lib/fanvue/client'
import { requireAdminAuth } from '@/lib/utils/debug-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError
  try {
    const supabase = createAdminClient()
    const results: any[] = []

    // Get all models
    const { data: models, error: modelsError } = await supabase
      .from('models')
      .select(
        'id, name, agency_id, fanvue_user_uuid, revenue_total, subscribers_count, followers_count, posts_count, likes_count'
      )
      .order('name')

    if (modelsError || !models?.length) {
      return NextResponse.json({ error: 'No models found', details: modelsError?.message })
    }

    // Step 1: Recalculate revenue from existing transactions
    for (const model of models) {
      const { data: txData } = await supabase
        .from('fanvue_transactions')
        .select('amount')
        .eq('model_id', model.id)

      const txRevenue = txData ? txData.reduce((sum, tx) => sum + Number(tx.amount || 0), 0) : 0

      const updateFields: Record<string, any> = {
        updated_at: new Date().toISOString(),
      }

      // Only update revenue if we calculated a positive value
      if (txRevenue > 0 && txRevenue > Number(model.revenue_total || 0)) {
        updateFields.revenue_total = txRevenue
      }

      results.push({
        id: model.id,
        name: model.name,
        current_revenue: model.revenue_total,
        tx_revenue: txRevenue,
        tx_count: txData?.length || 0,
        will_update_revenue: txRevenue > Number(model.revenue_total || 0),
      })

      if (Object.keys(updateFields).length > 1) {
        // Has more than just updated_at
        await supabase.from('models').update(updateFields).eq('id', model.id)
      }
    }

    // Step 2: Try to re-fetch live stats from Fanvue API
    let apiResults: any[] = []
    const agencyId = models[0]?.agency_id
    if (agencyId) {
      try {
        const token = await getAgencyFanvueToken(agencyId)
        const fanvue = createFanvueClient(token)

        for (const model of models) {
          if (!model.fanvue_user_uuid) continue

          const apiUpdate: Record<string, any> = {}

          // Fetch smart lists (subscribers, followers)
          try {
            const smartLists = await fanvue.getCreatorSmartLists(model.fanvue_user_uuid)
            if (smartLists) {
              const followers = smartLists.find((l: any) => l.uuid === 'followers')
              const subscribers = smartLists.find((l: any) => l.uuid === 'subscribers')

              if (followers?.count && followers.count > 0) {
                apiUpdate.followers_count = followers.count
              }
              if (subscribers?.count && subscribers.count > 0) {
                apiUpdate.subscribers_count = subscribers.count
              }
            }
          } catch (e: any) {
            console.log(`[Restore] Smart lists failed for ${model.name}:`, e.message)
          }

          // Fetch earnings total
          try {
            let totalCents = 0
            let earningsCount = 0
            let cursor: string | undefined

            do {
              const earnings = await fanvue.getCreatorEarnings(model.fanvue_user_uuid, {
                startDate: '2020-01-01T00:00:00Z',
                endDate: new Date().toISOString(),
                size: 50,
                cursor,
              })

              if (earnings?.data?.length) {
                totalCents += earnings.data.reduce(
                  (sum: number, item: any) => sum + (item.gross || 0),
                  0
                )
                earningsCount += earnings.data.length
                cursor = earnings.nextCursor || undefined
              } else {
                break
              }
            } while (cursor)

            if (totalCents > 0) {
              const totalDollars = totalCents / 100
              const currentRevenue = Number(model.revenue_total || 0)
              if (totalDollars > currentRevenue) {
                apiUpdate.revenue_total = totalDollars
              }
            }

            apiResults.push({
              name: model.name,
              earningsCount,
              totalCents,
              ...apiUpdate,
            })
          } catch (e: any) {
            console.log(`[Restore] Earnings failed for ${model.name}:`, e.message)
            apiResults.push({ name: model.name, error: e.message })
          }

          // Apply API updates
          if (Object.keys(apiUpdate).length > 0) {
            apiUpdate.stats_updated_at = new Date().toISOString()
            apiUpdate.updated_at = new Date().toISOString()
            await supabase.from('models').update(apiUpdate).eq('id', model.id)
          }
        }
      } catch (tokenErr: any) {
        apiResults = [{ error: `Token failed: ${tokenErr.message}` }]
      }
    }

    // Step 3: Read back final state
    const { data: finalModels } = await supabase
      .from('models')
      .select(
        'id, name, revenue_total, subscribers_count, followers_count, posts_count, likes_count'
      )
      .order('name')

    return NextResponse.json({
      success: true,
      transactionRestore: results,
      apiRestore: apiResults,
      finalState: finalModels,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

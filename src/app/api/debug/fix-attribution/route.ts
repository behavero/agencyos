/**
 * Fix Transaction Attribution
 * Phase 67 - Orphaned Transaction Recovery
 *
 * Finds transactions with null model_id and attempts to re-attribute them
 * based on fan_id matching or agency membership.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const maxDuration = 300 // 5 minutes

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const supabase = createAdminClient()

  try {
    // 1. Find orphaned transactions (null model_id)
    const { data: orphanedTx, error: orphanedError } = await supabase
      .from('fanvue_transactions')
      .select('id, agency_id, fan_id, fan_username, description, amount, transaction_date')
      .is('model_id', null)
      .limit(1000)

    if (orphanedError) {
      return NextResponse.json({ error: orphanedError.message }, { status: 500 })
    }

    console.log(`[fix-attribution] Found ${orphanedTx?.length || 0} orphaned transactions`)

    if (!orphanedTx || orphanedTx.length === 0) {
      return NextResponse.json({
        status: '✅ No orphaned transactions found!',
        orphanedCount: 0,
        fixed: 0,
      })
    }

    // 2. Get all models with their agency and fanvue info
    const { data: models } = await supabase
      .from('models')
      .select('id, agency_id, name, fanvue_user_uuid, fanvue_username')

    if (!models || models.length === 0) {
      return NextResponse.json({
        status: '⚠️ No models found to attribute to',
        orphanedCount: orphanedTx.length,
        fixed: 0,
      })
    }

    // Create lookup maps
    const modelsByAgency = new Map<string, typeof models>()
    for (const model of models) {
      const agencyModels = modelsByAgency.get(model.agency_id) || []
      agencyModels.push(model)
      modelsByAgency.set(model.agency_id, agencyModels)
    }

    // 3. Fix attribution
    let fixedCount = 0
    const fixResults: Array<{
      transactionId: string
      oldModelId: null
      newModelId: string
      modelName: string
      reason: string
    }> = []

    for (const tx of orphanedTx) {
      // Get models for this agency
      const agencyModels = modelsByAgency.get(tx.agency_id)

      if (!agencyModels || agencyModels.length === 0) {
        continue
      }

      let assignedModel = null
      let reason = ''

      // Strategy 1: If agency has only one model, assign to that model
      if (agencyModels.length === 1) {
        assignedModel = agencyModels[0]
        reason = 'Single model in agency'
      }
      // Strategy 2: Check if fan_username matches a model
      else if (tx.fan_username) {
        const matchingModel = agencyModels.find(
          m =>
            m.fanvue_username && m.fanvue_username.toLowerCase() === tx.fan_username?.toLowerCase()
        )
        if (matchingModel) {
          assignedModel = matchingModel
          reason = 'Fan username matched model'
        }
      }

      // If we found a model, update the transaction
      if (assignedModel) {
        const { error: updateError } = await supabase
          .from('fanvue_transactions')
          .update({ model_id: assignedModel.id })
          .eq('id', tx.id)

        if (!updateError) {
          fixedCount++
          fixResults.push({
            transactionId: tx.id,
            oldModelId: null,
            newModelId: assignedModel.id,
            modelName: assignedModel.name,
            reason,
          })
        }
      }
    }

    // 4. Also check for transactions with wrong model attribution
    // (model_id set but not matching agency)
    const { data: mismatchedTx, error: mismatchError } = await supabase
      .from('fanvue_transactions')
      .select(
        `
        id,
        agency_id,
        model_id,
        models!inner(agency_id)
      `
      )
      .not('model_id', 'is', null)
      .limit(100)

    const duration = Date.now() - startTime

    return NextResponse.json({
      status: fixedCount > 0 ? '🔧 Fixed attribution!' : '⚠️ Could not auto-fix',
      summary: {
        orphanedFound: orphanedTx.length,
        fixed: fixedCount,
        stillOrphaned: orphanedTx.length - fixedCount,
        durationMs: duration,
      },
      fixedDetails: fixResults.slice(0, 20), // Show first 20
      models: models.map(m => ({
        id: m.id,
        name: m.name,
        agencyId: m.agency_id,
        fanvueUuid: m.fanvue_user_uuid,
      })),
    })
  } catch (error) {
    console.error('[fix-attribution] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST: Force re-attribution of all transactions in an agency
 * This recalculates model_id for every transaction based on current model data
 */
export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  try {
    const body = await request.json()
    const agencyId = body.agencyId

    if (!agencyId) {
      return NextResponse.json({ error: 'agencyId required' }, { status: 400 })
    }

    // Get all models for this agency
    const { data: models } = await supabase
      .from('models')
      .select('id, name')
      .eq('agency_id', agencyId)

    if (!models || models.length === 0) {
      return NextResponse.json({ error: 'No models found' }, { status: 404 })
    }

    // If single model, assign all transactions to that model
    if (models.length === 1) {
      const { count, error } = await supabase
        .from('fanvue_transactions')
        .update({ model_id: models[0].id })
        .eq('agency_id', agencyId)
        .is('model_id', null)
        .select('id')

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        status: '✅ All transactions attributed!',
        updatedCount: count,
        assignedTo: models[0].name,
      })
    }

    return NextResponse.json({
      status: '⚠️ Multiple models - manual attribution required',
      models: models.map(m => ({ id: m.id, name: m.name })),
      hint: 'Use GET endpoint to see attribution breakdown',
    })
  } catch (error) {
    console.error('[fix-attribution] POST error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

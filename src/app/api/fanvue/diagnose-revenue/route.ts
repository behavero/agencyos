import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/fanvue/diagnose-revenue?modelId=xxx
 *
 * Diagnose revenue discrepancies by comparing:
 * - models.revenue_total (what's displayed)
 * - fanvue_transactions sum (what should be displayed)
 * - Fanvue API earnings (source of truth)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const modelId = searchParams.get('modelId')
    const modelName = searchParams.get('modelName') // Optional: search by name

    if (!modelId && !modelName) {
      return NextResponse.json({ error: 'modelId or modelName is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get user's agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 403 })
    }

    // Find model
    let modelQuery = adminClient
      .from('models')
      .select('id, name, agency_id, revenue_total, fanvue_access_token, fanvue_user_uuid')
      .eq('agency_id', profile.agency_id)

    if (modelId) {
      modelQuery = modelQuery.eq('id', modelId)
    } else if (modelName) {
      modelQuery = modelQuery.ilike('name', `%${modelName}%`)
    }

    const { data: models, error: modelError } = await modelQuery

    if (modelError || !models || models.length === 0) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    const results = []

    for (const model of models) {
      // 1. Current revenue_total in models table
      const currentRevenue = Number(model.revenue_total || 0)

      // 2. Calculate from fanvue_transactions
      const { data: transactions } = await adminClient
        .from('fanvue_transactions')
        .select('amount, transaction_type, transaction_date')
        .eq('model_id', model.id)

      const calculatedRevenue = transactions
        ? transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
        : 0

      // 3. Transaction breakdown
      const breakdown = transactions
        ? transactions.reduce(
            (acc, tx) => {
              const type = tx.transaction_type || 'other'
              acc[type] = (acc[type] || 0) + Number(tx.amount || 0)
              return acc
            },
            {} as Record<string, number>
          )
        : {}

      // 4. Check if there's a discrepancy
      const discrepancy = Math.abs(currentRevenue - calculatedRevenue)
      const isDiscrepant = discrepancy > 0.01 // More than 1 cent difference

      results.push({
        modelId: model.id,
        modelName: model.name,
        currentRevenue,
        calculatedRevenue,
        discrepancy,
        isDiscrepant,
        transactionCount: transactions?.length || 0,
        breakdown,
        hasAccessToken: !!model.fanvue_access_token,
        fanvueUserUuid: model.fanvue_user_uuid,
      })
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalModels: results.length,
        discrepantModels: results.filter(r => r.isDiscrepant).length,
      },
    })
  } catch (error) {
    console.error('[Diagnose Revenue] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

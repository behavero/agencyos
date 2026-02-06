/**
 * CRM Fans API
 * Returns aggregated fan data from fan_insights and fanvue_transactions.
 * Supports tabs: all, top-spenders, recent
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'No agency found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const tab = searchParams.get('tab') || 'all'
    const modelId = searchParams.get('modelId') || undefined
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const adminClient = createAdminClient()

    // Get models for this agency
    const { data: models } = await adminClient
      .from('models')
      .select('id, name')
      .eq('agency_id', profile.agency_id)

    const modelMap = new Map((models || []).map(m => [m.id, m.name]))

    if (tab === 'top-spenders') {
      // Get top spenders from fan_insights
      let query = adminClient
        .from('fan_insights')
        .select('*')
        .order('total_spend', { ascending: false })
        .range(offset, offset + limit - 1)

      if (modelId && modelId !== 'all') {
        query = query.eq('model_id', modelId)
      } else {
        // Filter to agency models
        const modelIds = (models || []).map(m => m.id)
        if (modelIds.length > 0) {
          query = query.in('model_id', modelIds)
        }
      }

      const { data: fans, count } = await query

      return NextResponse.json({
        success: true,
        fans: (fans || []).map(f => ({
          ...f,
          model_name: modelMap.get(f.model_id) || 'Unknown',
        })),
        total: count || (fans || []).length,
      })
    }

    if (tab === 'recent') {
      // Get recent unique fans from transactions (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      let query = adminClient
        .from('fanvue_transactions')
        .select('fan_id, fan_username, model_id, amount, transaction_type, transaction_date')
        .eq('agency_id', profile.agency_id)
        .gte('transaction_date', thirtyDaysAgo.toISOString())
        .order('transaction_date', { ascending: false })
        .limit(500)

      if (modelId && modelId !== 'all') {
        query = query.eq('model_id', modelId)
      }

      const { data: transactions } = await query

      // Aggregate by fan
      const fanMap = new Map<
        string,
        {
          fan_id: string
          fan_username: string | null
          model_id: string
          total_spent: number
          transaction_count: number
          last_active: string
          types: Set<string>
        }
      >()

      for (const tx of transactions || []) {
        const key = `${tx.fan_id}-${tx.model_id}`
        const existing = fanMap.get(key)
        if (existing) {
          existing.total_spent += Number(tx.amount) || 0
          existing.transaction_count++
          existing.types.add(tx.transaction_type)
          if (tx.transaction_date > existing.last_active) {
            existing.last_active = tx.transaction_date
          }
        } else {
          fanMap.set(key, {
            fan_id: tx.fan_id,
            fan_username: tx.fan_username,
            model_id: tx.model_id,
            total_spent: Number(tx.amount) || 0,
            transaction_count: 1,
            last_active: tx.transaction_date,
            types: new Set([tx.transaction_type]),
          })
        }
      }

      const recentFans = Array.from(fanMap.values())
        .sort((a, b) => new Date(b.last_active).getTime() - new Date(a.last_active).getTime())
        .slice(offset, offset + limit)
        .map(f => ({
          fan_id: f.fan_id,
          fan_username: f.fan_username,
          model_id: f.model_id,
          model_name: modelMap.get(f.model_id) || 'Unknown',
          total_spend: Math.round(f.total_spent * 100) / 100,
          transaction_count: f.transaction_count,
          last_active: f.last_active,
          activity_types: Array.from(f.types),
        }))

      return NextResponse.json({
        success: true,
        fans: recentFans,
        total: fanMap.size,
      })
    }

    // Default "all" tab: aggregate from fanvue_transactions
    let query = adminClient
      .from('fanvue_transactions')
      .select('fan_id, fan_username, model_id, amount, transaction_type, transaction_date')
      .eq('agency_id', profile.agency_id)
      .order('transaction_date', { ascending: false })
      .limit(5000)

    if (modelId && modelId !== 'all') {
      query = query.eq('model_id', modelId)
    }

    const { data: allTransactions } = await query

    // Aggregate by fan
    const allFanMap = new Map<
      string,
      {
        fan_id: string
        fan_username: string | null
        model_id: string
        total_spent: number
        transaction_count: number
        last_active: string
        first_seen: string
        types: Set<string>
      }
    >()

    for (const tx of allTransactions || []) {
      const key = `${tx.fan_id}-${tx.model_id}`
      const existing = allFanMap.get(key)
      if (existing) {
        existing.total_spent += Number(tx.amount) || 0
        existing.transaction_count++
        existing.types.add(tx.transaction_type)
        if (tx.transaction_date > existing.last_active) {
          existing.last_active = tx.transaction_date
        }
        if (tx.transaction_date < existing.first_seen) {
          existing.first_seen = tx.transaction_date
        }
      } else {
        allFanMap.set(key, {
          fan_id: tx.fan_id,
          fan_username: tx.fan_username,
          model_id: tx.model_id,
          total_spent: Number(tx.amount) || 0,
          transaction_count: 1,
          last_active: tx.transaction_date,
          first_seen: tx.transaction_date,
          types: new Set([tx.transaction_type]),
        })
      }
    }

    const allFans = Array.from(allFanMap.values())
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(offset, offset + limit)
      .map(f => ({
        fan_id: f.fan_id,
        fan_username: f.fan_username,
        model_id: f.model_id,
        model_name: modelMap.get(f.model_id) || 'Unknown',
        total_spend: Math.round(f.total_spent * 100) / 100,
        transaction_count: f.transaction_count,
        last_active: f.last_active,
        first_seen: f.first_seen,
        activity_types: Array.from(f.types),
      }))

    // Summary stats
    const totalFans = allFanMap.size
    const totalSpend = Array.from(allFanMap.values()).reduce((s, f) => s + f.total_spent, 0)
    const avgSpend = totalFans > 0 ? totalSpend / totalFans : 0

    return NextResponse.json({
      success: true,
      fans: allFans,
      total: totalFans,
      stats: {
        totalFans,
        totalSpend: Math.round(totalSpend * 100) / 100,
        avgSpend: Math.round(avgSpend * 100) / 100,
      },
    })
  } catch (error) {
    console.error('[CRM Fans API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminAuth } from '@/lib/utils/debug-auth'

/**
 * DEBUG ENDPOINT: Seed Financial Transaction Data
 * Use this to populate the database with test transactions
 * so the Dashboard can display real data.
 *
 * URL: /api/debug/seed-financials
 * Method: GET
 *
 * This creates 90 transactions spread over the last 30 days
 * with realistic amounts and categories.
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const supabase = await createAdminClient()

    // Get the first agency ID (or create logic to get user's agency)
    const { data: agencies } = await supabase.from('agencies').select('id').limit(1).single()

    if (!agencies) {
      return NextResponse.json(
        { error: 'No agency found. Create an agency first.' },
        { status: 404 }
      )
    }

    const agencyId = agencies.id

    // Create 90 transactions spread over 30 days
    const transactions = []
    const categories = ['message', 'subscription', 'tip', 'post']
    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

    for (let i = 0; i < 90; i++) {
      // Spread transactions evenly over 30 days
      const timestamp = thirtyDaysAgo + (i * (now - thirtyDaysAgo)) / 90

      // Random category
      const category = categories[Math.floor(Math.random() * categories.length)]

      // Realistic amounts based on category
      let amount
      switch (category) {
        case 'subscription':
          amount = Math.random() * 30 + 10 // $10-$40
          break
        case 'tip':
          amount = Math.random() * 100 + 5 // $5-$105
          break
        case 'message':
          amount = Math.random() * 20 + 3 // $3-$23
          break
        case 'post':
          amount = Math.random() * 50 + 5 // $5-$55
          break
        default:
          amount = Math.random() * 30 + 5
      }

      transactions.push({
        id: `seed_txn_${i}_${Date.now()}`,
        agency_id: agencyId,
        model_id: null, // Null for agency-wide transactions
        fanvue_id: `fanvue_seed_${i}_${Date.now()}`,
        amount: Math.round(amount * 100) / 100, // Round to 2 decimals
        currency: 'USD',
        category: category,
        description: `Test ${category} transaction #${i + 1}`,
        created_at: new Date(timestamp).toISOString(),
        updated_at: new Date(timestamp).toISOString(),
      })
    }

    // Insert transactions
    const { data, error } = await supabase.from('fanvue_transactions').upsert(transactions, {
      onConflict: 'fanvue_id',
    })

    if (error) {
      console.error('Seed error:', error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      )
    }

    // Get summary stats
    const { data: stats } = await supabase
      .from('fanvue_transactions')
      .select('amount, category, created_at')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })

    const totalAmount = stats?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
    const byCategory = stats?.reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + (t.amount || 0)
        return acc
      },
      {} as Record<string, number>
    )

    return NextResponse.json({
      success: true,
      message: `Seeded ${transactions.length} transactions for agency ${agencyId}`,
      stats: {
        totalTransactions: transactions.length,
        totalAmount: `$${totalAmount.toFixed(2)}`,
        byCategory,
        dateRange: {
          from: new Date(thirtyDaysAgo).toISOString(),
          to: new Date(now).toISOString(),
        },
      },
    })
  } catch (error) {
    console.error('Seed endpoint error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

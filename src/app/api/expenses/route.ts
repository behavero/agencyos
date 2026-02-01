import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ExpenseCreateSchema, badRequestResponse } from '@/lib/validation/schemas'

/**
 * GET /api/expenses - List all expenses for user's agency
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's agency
  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) {
    return NextResponse.json({ error: 'No agency found' }, { status: 404 })
  }

  // Fetch expenses
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select(`
      *,
      models(id, name)
    `)
    .eq('agency_id', profile.agency_id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: expenses })
}

/**
 * POST /api/expenses - Create a new expense
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's agency
  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) {
    return NextResponse.json({ error: 'No agency found' }, { status: 404 })
  }

  // Parse and validate request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = ExpenseCreateSchema.safeParse(body)
  if (!validation.success) {
    return badRequestResponse(validation.error)
  }

  const expenseData = validation.data

  // Insert expense
  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      agency_id: profile.agency_id,
      name: expenseData.name,
      amount: expenseData.amount,
      category: expenseData.category,
      description: expenseData.description,
      model_id: expenseData.model_id,
      is_recurring: expenseData.is_recurring,
      frequency: expenseData.frequency,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: expense }, { status: 201 })
}

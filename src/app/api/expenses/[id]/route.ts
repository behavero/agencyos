import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ExpenseUpdateSchema, badRequestResponse, UUIDSchema } from '@/lib/validation/schemas'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/expenses/[id] - Get a specific expense
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  
  // Validate ID
  const idValidation = UUIDSchema.safeParse(id)
  if (!idValidation.success) {
    return NextResponse.json({ error: 'Invalid expense ID' }, { status: 400 })
  }

  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: expense, error } = await supabase
    .from('expenses')
    .select(`
      *,
      models(id, name)
    `)
    .eq('id', id)
    .single()

  if (error || !expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  }

  return NextResponse.json({ data: expense })
}

/**
 * PATCH /api/expenses/[id] - Update an expense
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  
  // Validate ID
  const idValidation = UUIDSchema.safeParse(id)
  if (!idValidation.success) {
    return NextResponse.json({ error: 'Invalid expense ID' }, { status: 400 })
  }

  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse and validate request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = ExpenseUpdateSchema.safeParse(body)
  if (!validation.success) {
    return badRequestResponse(validation.error)
  }

  const updateData = validation.data

  // Update expense
  const { data: expense, error } = await supabase
    .from('expenses')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: expense })
}

/**
 * DELETE /api/expenses/[id] - Delete an expense
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  
  // Validate ID
  const idValidation = UUIDSchema.safeParse(id)
  if (!idValidation.success) {
    return NextResponse.json({ error: 'Invalid expense ID' }, { status: 400 })
  }

  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

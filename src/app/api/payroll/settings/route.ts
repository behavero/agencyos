import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const PayoutSettingsSchema = z.object({
  profile_id: z.string().uuid(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'RON']).default('USD'),
  pay_model: z.enum(['hourly', 'commission', 'hybrid']).default('hourly'),
  hourly_rate: z.number().min(0).default(0),
  commission_percent: z.number().min(0).max(1).default(0),
  payment_method: z.string().optional(),
  payment_details: z.record(z.any()).optional(),
})

/**
 * GET /api/payroll/settings
 * List all payout settings for the agency
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, role')
      .eq('id', user.id)
      .single()
    
    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const adminSupabase = await createAdminClient()
    
    // Get all staff with their payout settings
    const { data: staff } = await adminSupabase
      .from('profiles')
      .select(`
        id,
        username,
        role,
        payout_settings (*)
      `)
      .eq('agency_id', profile.agency_id)
      .neq('role', 'owner')
    
    return NextResponse.json({ staff })
  } catch (error) {
    console.error('GET /api/payroll/settings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payout settings' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/payroll/settings
 * Create or update payout settings for a staff member
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, role')
      .eq('id', user.id)
      .single()
    
    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const validated = PayoutSettingsSchema.parse(body)
    
    // Verify the target profile is in the same agency
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', validated.profile_id)
      .single()
    
    if (!targetProfile || targetProfile.agency_id !== profile.agency_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    const adminSupabase = await createAdminClient()
    
    // Upsert payout settings
    const { data, error } = await adminSupabase
      .from('payout_settings')
      .upsert({
        profile_id: validated.profile_id,
        agency_id: profile.agency_id,
        currency: validated.currency,
        pay_model: validated.pay_model,
        hourly_rate: validated.hourly_rate,
        commission_percent: validated.commission_percent,
        payment_method: validated.payment_method,
        payment_details: validated.payment_details,
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ settings: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('POST /api/payroll/settings error:', error)
    return NextResponse.json(
      { error: 'Failed to update payout settings' },
      { status: 500 }
    )
  }
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PayrollClient } from './payroll-client'

export default async function PayrollPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user's profile and agency
  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) {
    redirect('/dashboard')
  }

  // Fetch team members with payroll info
  const { data: employees } = await supabase
    .from('profiles')
    .select('id, username, role, base_salary, commission_rate, payment_method, avatar_url')
    .eq('agency_id', profile.agency_id)
    .not('role', 'is', null)
    .order('role')

  // Fetch recent payouts
  const { data: payouts } = await supabase
    .from('payouts')
    .select(`
      *,
      recipient:profiles(id, username, avatar_url, role)
    `)
    .eq('agency_id', profile.agency_id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Fetch models for assignment
  const { data: models } = await supabase
    .from('models')
    .select('id, name, total_revenue')
    .eq('agency_id', profile.agency_id)

  return (
    <PayrollClient 
      employees={employees || []}
      payouts={payouts || []}
      models={models || []}
      agencyId={profile.agency_id}
      userRole={profile.role}
    />
  )
}

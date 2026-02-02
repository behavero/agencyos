import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/auth/permissions'
import { PlanningClient } from './planning-client'

export default async function PlanningPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) {
    redirect('/onboarding')
  }

  // Check permission
  if (!isAdmin(profile.role)) {
    redirect('/dashboard')
  }

  const adminClient = await createAdminClient()

  // Get team members
  const { data: team } = await adminClient
    .from('profiles')
    .select('id, username, role')
    .eq('agency_id', profile.agency_id)
    .neq('role', 'owner') // Owners don't need shifts
    .order('username')

  // Get this week's shifts
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay()) // Sunday
  startOfWeek.setHours(0, 0, 0, 0)
  
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)

  const { data: shifts } = await adminClient
    .from('shifts')
    .select(`
      *,
      employee:profiles(id, username, role),
      model:models(id, name)
    `)
    .eq('agency_id', profile.agency_id)
    .gte('start_time', startOfWeek.toISOString())
    .lt('start_time', endOfWeek.toISOString())
    .order('start_time')

  // Get current clock-in status for online indicators
  const { data: activeTimesheets } = await adminClient
    .from('timesheets')
    .select('employee_id, clock_in')
    .eq('agency_id', profile.agency_id)
    .eq('status', 'active')
    .is('clock_out', null)

  const onlineEmployees = activeTimesheets?.map(t => t.employee_id) || []

  return (
    <PlanningClient
      team={team || []}
      initialShifts={shifts || []}
      onlineEmployees={onlineEmployees}
      weekStart={startOfWeek.toISOString()}
    />
  )
}

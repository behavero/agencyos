import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CalendarClient } from './calendar-client'

export default async function CalendarPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) {
    redirect('/dashboard')
  }

  // Fetch models for filter/assignment
  const { data: models } = await supabase
    .from('models')
    .select('id, name')
    .eq('agency_id', profile.agency_id)

  // Fetch team members for assignment
  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('id, username, role')
    .eq('agency_id', profile.agency_id)

  return (
    <CalendarClient 
      agencyId={profile.agency_id} 
      models={models || []}
      teamMembers={teamMembers || []}
    />
  )
}

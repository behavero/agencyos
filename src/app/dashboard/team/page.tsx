import { createClient } from '@/lib/supabase/server'
import TeamClient from './team-client'

export default async function TeamPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch user profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  // Fetch all team members
  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('*')
    .eq('agency_id', profile?.agency_id)

  return <TeamClient teamMembers={teamMembers || []} agencyId={profile?.agency_id} />
}

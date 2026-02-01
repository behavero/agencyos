import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AgencySettingsClient from './agency-settings-client'

export default async function AgencySettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get agency
  const { data: agency } = profile?.agency_id
    ? await supabase
        .from('agencies')
        .select('*')
        .eq('id', profile.agency_id)
        .single()
    : { data: null }

  // Get models for the agency
  const { data: models } = profile?.agency_id
    ? await supabase
        .from('models')
        .select('id, name, status')
        .eq('agency_id', profile.agency_id)
    : { data: [] }

  return <AgencySettingsClient profile={profile} agency={agency} models={models || []} />
}

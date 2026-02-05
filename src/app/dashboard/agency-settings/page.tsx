import { createClient } from '@/lib/supabase/server'
import AgencySettingsClient from './agency-settings-client'

export default async function AgencySettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get user's profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  // Get agency
  const { data: agency } = profile?.agency_id
    ? await supabase.from('agencies').select('*').eq('id', profile.agency_id).single()
    : { data: null }

  return <AgencySettingsClient agency={agency} />
}

import { createClient } from '@/lib/supabase/server'
import AlfredClient from './alfred-client'

export default async function AlfredPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  const { data: agency } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', profile?.agency_id)
    .single()

  return (
    <AlfredClient
      userName={profile?.username || 'Sir'}
      agencyName={agency?.name || 'Your Agency'}
    />
  )
}

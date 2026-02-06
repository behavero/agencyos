import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MessagesClient from './messages-client'

export default async function MessagesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Fetch user profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  // Fetch models
  const { data: models } = await supabase
    .from('models')
    .select('*')
    .eq('agency_id', profile?.agency_id)

  // Vault assets are now fetched live from Fanvue API per-model in the client
  return (
    <div className="-m-6">
      <MessagesClient models={models || []} />
    </div>
  )
}

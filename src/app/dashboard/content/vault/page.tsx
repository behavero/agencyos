import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VaultClient } from './vault-client'

export default async function VaultPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user's agency
  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) {
    redirect('/dashboard')
  }

  // Fetch only uploaded assets (Fanvue media is fetched live from API)
  const { data: assets } = await supabase
    .from('content_assets')
    .select('*')
    .eq('agency_id', profile.agency_id)
    .is('fanvue_media_uuid', null) // Only manually uploaded content
    .order('created_at', { ascending: false })

  // Fetch models for the model selector
  const { data: models } = await supabase
    .from('models')
    .select('id, name')
    .eq('agency_id', profile.agency_id)
    .eq('status', 'active')

  return (
    <VaultClient initialAssets={assets || []} models={models || []} agencyId={profile.agency_id} />
  )
}

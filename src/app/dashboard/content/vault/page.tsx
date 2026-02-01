import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VaultClient } from './vault-client'

export default async function VaultPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
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

  // Fetch content assets
  const { data: assets } = await supabase
    .from('content_assets')
    .select(`
      *,
      models(id, name)
    `)
    .eq('agency_id', profile.agency_id)
    .order('created_at', { ascending: false })

  // Fetch models for the dropdown
  const { data: models } = await supabase
    .from('models')
    .select('id, name')
    .eq('agency_id', profile.agency_id)

  return (
    <VaultClient 
      initialAssets={assets || []} 
      models={models || []}
      agencyId={profile.agency_id}
    />
  )
}

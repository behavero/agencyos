import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CampaignClient } from './campaign-client'

export default async function CampaignsPage() {
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

  // Fetch models
  const { data: models } = await supabase
    .from('models')
    .select('id, name, subscribers_count, followers_count')
    .eq('agency_id', profile.agency_id)

  // Fetch recent campaigns
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('agency_id', profile.agency_id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Fetch vault assets for attachment
  const { data: vaultAssets } = await supabase
    .from('content_assets')
    .select('id, title, file_name, url, file_type, price, content_type')
    .eq('agency_id', profile.agency_id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <CampaignClient 
      models={models || []}
      campaigns={campaigns || []}
      vaultAssets={vaultAssets || []}
      agencyId={profile.agency_id}
    />
  )
}

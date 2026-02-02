import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import MarketingClient from './marketing-client'

export default async function MarketingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Fetch user profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  if (!profile) {
    redirect('/')
  }

  // Fetch models for the agency
  const { data: models } = await supabase
    .from('models')
    .select('id, name, avatar_url')
    .eq('agency_id', profile.agency_id)

  // Fetch campaigns
  const { data: campaigns } = await supabase
    .from('marketing_campaigns')
    .select(
      `
      *,
      model:models(id, name, avatar_url),
      segment:marketing_segments(id, name)
    `
    )
    .eq('agency_id', profile.agency_id)
    .order('created_at', { ascending: false })

  // Fetch segments
  const { data: segments } = await supabase
    .from('marketing_segments')
    .select('*')
    .eq('agency_id', profile.agency_id)

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-[250px]">
        <Header />
        <main className="p-6">
          <MarketingClient
            initialCampaigns={campaigns || []}
            initialSegments={segments || []}
            models={models || []}
            profile={profile}
          />
        </main>
      </div>
    </div>
  )
}

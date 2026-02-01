import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
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

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-[250px]">
        <Header />
        <main className="p-6">
          <AgencySettingsClient agency={agency} />
        </main>
      </div>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import QuestsClient from './quests-client'

export default async function QuestsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch agency for level
  const { data: agency } = await supabase
    .from('agencies')
    .select('current_level')
    .eq('id', profile?.agency_id)
    .single()

  // Fetch quests for the agency
  const { data: quests } = await supabase
    .from('quests')
    .select('*')
    .or(`agency_id.eq.${profile?.agency_id},agency_id.is.null`)
    .order('completed_at', { ascending: true, nullsFirst: true })

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-[250px]">
        <Header />
        <main className="p-6">
          <QuestsClient 
            quests={quests || []} 
            profile={profile}
            agencyLevel={agency?.current_level || 1}
          />
        </main>
      </div>
    </div>
  )
}

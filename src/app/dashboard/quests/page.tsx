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

  // Fetch quests
  const { data: quests } = await supabase
    .from('quests')
    .select('*')
    .order('completed_at', { ascending: true })

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header />
        <main className="p-6">
          <QuestsClient 
            quests={quests || []} 
            profile={profile}
          />
        </main>
      </div>
    </div>
  )
}

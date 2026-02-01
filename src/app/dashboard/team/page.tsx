import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import TeamClient from './team-client'

export default async function TeamPage() {
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

  // Fetch all team members
  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('*')
    .eq('agency_id', profile?.agency_id)

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-[250px]">
        <Header />
        <main className="p-6">
          <TeamClient teamMembers={teamMembers || []} agencyId={profile?.agency_id} />
        </main>
      </div>
    </div>
  )
}

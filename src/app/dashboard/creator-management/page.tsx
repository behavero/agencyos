import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import CreatorManagementClient from './creator-management-client'

export default async function CreatorManagementPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: models } = await supabase
    .from('models')
    .select('*')
    .eq('agency_id', profile?.agency_id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-[250px]">
        <Header />
        <main className="p-6">
          <CreatorManagementClient models={models || []} agencyId={profile?.agency_id} />
        </main>
      </div>
    </div>
  )
}

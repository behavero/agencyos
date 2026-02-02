import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import CreatorDetailClient from './creator-detail-client'

export default async function CreatorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) {
    redirect('/dashboard')
  }

  // Fetch the model with social accounts
  const { data: model } = await supabase
    .from('models')
    .select('*, social_accounts(*)')
    .eq('id', id)
    .eq('agency_id', profile.agency_id)
    .single()

  if (!model) {
    redirect('/dashboard/creator-management')
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-[250px]">
        <Header />
        <main className="p-6">
          <CreatorDetailClient model={model} agencyId={profile.agency_id} />
        </main>
      </div>
    </div>
  )
}

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BioListClient } from './bio-list-client'

export default async function BioListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) {
    redirect('/onboarding')
  }

  const adminClient = await createAdminClient()

  // Get all bio pages
  const { data: pages } = await adminClient
    .from('bio_pages')
    .select(`
      *,
      model:models(id, name, avatar_url)
    `)
    .eq('agency_id', profile.agency_id)
    .order('created_at', { ascending: false })

  // Get all models for creation
  const { data: models } = await adminClient
    .from('models')
    .select('id, name, avatar_url')
    .eq('agency_id', profile.agency_id)
    .order('name')

  return (
    <BioListClient
      pages={pages || []}
      models={models || []}
    />
  )
}

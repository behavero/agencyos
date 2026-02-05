import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CreatorDetailClient from './creator-detail-client'

export default async function CreatorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user!.id)
    .single()

  if (!profile?.agency_id) {
    redirect('/dashboard')
  }

  // Fetch the model with social accounts and Instagram connection
  const { data: model } = await supabase
    .from('models')
    .select(
      '*, social_accounts(*), instagram_business_id, instagram_username, instagram_token_expires_at'
    )
    .eq('id', id)
    .eq('agency_id', profile.agency_id)
    .single()

  if (!model) {
    redirect('/dashboard/creator-management')
  }

  return <CreatorDetailClient model={model} agencyId={profile.agency_id} />
}

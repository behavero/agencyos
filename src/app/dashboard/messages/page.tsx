import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MessagesClient from './messages-client'

export default async function MessagesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Fetch user profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  // Fetch models
  const { data: models } = await supabase
    .from('models')
    .select('*')
    .eq('agency_id', profile?.agency_id)

  // Fetch vault assets for message attachments (includes model_id for per-model filtering)
  const { data: vaultAssets } = await supabase
    .from('content_assets')
    .select('id, title, file_name, url, file_type, price, content_type, model_id')
    .eq('agency_id', profile?.agency_id)
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="-m-6">
      <MessagesClient models={models || []} vaultAssets={vaultAssets || []} />
    </div>
  )
}

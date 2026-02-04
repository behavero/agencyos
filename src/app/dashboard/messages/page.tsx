import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { QueryProvider } from '@/providers/query-provider'
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

  // Fetch vault assets for message attachments
  const { data: vaultAssets } = await supabase
    .from('content_assets')
    .select('id, title, file_name, url, file_type, price, content_type')
    .eq('agency_id', profile?.agency_id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <QueryProvider>
      <div className="flex min-h-screen bg-zinc-950">
        <Sidebar />
        <div className="flex-1 ml-[250px]">
          <Header />
          <main className="p-0">
            <MessagesClient models={models || []} vaultAssets={vaultAssets || []} />
          </main>
        </div>
      </div>
    </QueryProvider>
  )
}

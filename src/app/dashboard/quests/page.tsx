import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { QuestsClient } from './quests-client'

export const metadata = {
  title: 'Quests | OnyxOS',
  description: 'Complete quests to earn XP and rewards',
}

export default async function QuestsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-[250px]">
        <Header />
        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Quest Board</h1>
            <p className="text-zinc-500">Complete quests to earn XP and climb the leaderboard</p>
          </div>
          <QuestsClient />
        </main>
      </div>
    </div>
  )
}

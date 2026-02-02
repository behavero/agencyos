import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ScriptsClient from './scripts-client'

export const metadata = {
  title: 'Script Arsenal | OnyxOS',
  description: 'Chat scripts and templates for chatters',
}

export default async function ScriptsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id, role')
    .eq('id', user.id)
    .single()
  
  if (!profile) redirect('/login')
  
  const isAdmin = ['owner', 'admin', 'grandmaster', 'paladin'].includes(profile.role)
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Script Arsenal</h1>
        <p className="text-zinc-400">
          Winning chat scripts organized by category. Use these to close more sales.
        </p>
      </div>
      
      <Suspense fallback={<div className="text-zinc-400">Loading scripts...</div>}>
        <ScriptsClient isAdmin={isAdmin} />
      </Suspense>
    </div>
  )
}

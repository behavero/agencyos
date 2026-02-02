import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AcademyClient from './academy-client'

export const metadata = {
  title: 'Academy | OnyxOS',
  description: 'Internal knowledge base and training materials',
}

export default async function AcademyPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id, role')
    .eq('id', user.id)
    .single()
  
  if (!profile) redirect('/login')
  
  const isAdmin = ['owner', 'admin', 'grandmaster'].includes(profile.role)
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">The Academy</h1>
        <p className="text-zinc-400">
          Internal playbook, SOPs, and training materials for your team.
        </p>
      </div>
      
      <Suspense fallback={<div className="text-zinc-400">Loading playbook...</div>}>
        <AcademyClient isAdmin={isAdmin} />
      </Suspense>
    </div>
  )
}

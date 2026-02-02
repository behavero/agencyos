import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InviteClient from './invite-client'

export const metadata = {
  title: 'Invite Team | OnyxOS',
  description: 'Send magic link invitations to new team members',
}

export default async function InvitePage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id, role')
    .eq('id', user.id)
    .single()
  
  if (!profile || !['owner', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Invite Team Members</h1>
        <p className="text-zinc-400">
          Send secure magic link invitations to onboard new staff.
        </p>
      </div>
      
      <Suspense fallback={<div className="text-zinc-400">Loading...</div>}>
        <InviteClient />
      </Suspense>
    </div>
  )
}

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PayrollClient from './payroll-client'

export const metadata = {
  title: 'Payroll | OnyxOS',
  description: 'Manage staff payroll and generate payment statements',
}

export default async function PayrollPage() {
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
        <h1 className="text-3xl font-bold text-white mb-2">The Treasury</h1>
        <p className="text-zinc-400">
          Hybrid payroll engine for hourly, commission, and mixed compensation models.
        </p>
      </div>
      
      <Suspense fallback={<div className="text-zinc-400">Loading payroll...</div>}>
        <PayrollClient userId={user.id} agencyId={profile.agency_id} />
      </Suspense>
    </div>
  )
}

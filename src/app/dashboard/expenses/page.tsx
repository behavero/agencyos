import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExpensesClient from './expenses-client'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) {
    redirect('/dashboard')
  }

  // Get agency
  const { data: agency } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', profile.agency_id)
    .single()

  // Get expenses for the agency
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('agency_id', profile.agency_id)
    .order('created_at', { ascending: false })

  // Get models for the dropdown
  const { data: models } = await supabase
    .from('models')
    .select('id, name')
    .eq('agency_id', profile.agency_id)

  return (
    <ExpensesClient 
      agencyId={profile.agency_id} 
      expenses={expenses || []} 
      models={models || []}
      agency={agency}
    />
  )
}

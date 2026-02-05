import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExpensesClient from './expenses-client'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user!.id)
    .single()

  if (!profile?.agency_id) {
    redirect('/dashboard')
  }

  // Get models for the dropdown (simplified type)
  const { data: modelsData } = await supabase
    .from('models')
    .select('id, name')
    .eq('agency_id', profile.agency_id)

  // Cast to the expected type
  const models = (modelsData || []) as Array<{ id: string; name: string }>

  return <ExpensesClient agencyId={profile.agency_id} models={models as any} />
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch agency data (including tax_rate and currency)
  const { data: agency } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', profile?.agency_id)
    .single()

  // Fetch models
  const { data: models } = await supabase
    .from('models')
    .select('*')
    .eq('agency_id', profile?.agency_id)

  // Fetch expenses for the agency (to calculate total monthly expenses)
  const { data: expenses } = profile?.agency_id
    ? await supabase
        .from('expenses')
        .select('*')
        .eq('agency_id', profile.agency_id)
        .eq('status', 'active')
    : { data: [] }

  // Calculate total monthly expenses
  const totalMonthlyExpenses = (expenses || [])
    .filter(e => e.is_recurring && e.frequency === 'monthly')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  // Calculate yearly expenses prorated to monthly
  const yearlyToMonthly = (expenses || [])
    .filter(e => e.is_recurring && e.frequency === 'yearly')
    .reduce((sum, e) => sum + Number(e.amount) / 12, 0)

  const totalExpenses = totalMonthlyExpenses + yearlyToMonthly

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header />
        <main className="p-6">
          <DashboardClient
            user={user}
            profile={profile}
            agency={agency}
            models={models || []}
            totalExpenses={totalExpenses}
          />
        </main>
      </div>
    </div>
  )
}

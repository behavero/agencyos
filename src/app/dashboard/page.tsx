import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import DashboardClient from './dashboard-client'
import * as DashboardAnalytics from '@/lib/services/dashboard-analytics'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Fetch user profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

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

  // Fetch real-time analytics data (Phase 48)
  const agencyId = profile?.agency_id || ''

  const [
    revenueHistory,
    revenueBreakdown,
    conversionStats,
    trafficSources,
    subscriberGrowth,
    modelPerformance,
    dashboardKPIs,
    expenseHistory,
  ] = await Promise.all([
    DashboardAnalytics.getRevenueHistory(agencyId, 30),
    DashboardAnalytics.getRevenueBreakdown(agencyId, 30),
    DashboardAnalytics.getConversionStats(agencyId),
    DashboardAnalytics.getTrafficSources(agencyId, 30),
    DashboardAnalytics.getSubscriberGrowth(agencyId, 30),
    DashboardAnalytics.getModelPerformance(agencyId),
    DashboardAnalytics.getDashboardKPIs(agencyId),
    DashboardAnalytics.getExpenseHistory(agencyId, 6),
  ])

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-[250px]">
        <Header />
        <main className="p-6">
          <DashboardClient
            user={user}
            profile={profile}
            agency={agency}
            models={models || []}
            totalExpenses={totalExpenses}
            revenueHistory={revenueHistory}
            revenueBreakdown={revenueBreakdown}
            conversionStats={conversionStats}
            trafficSources={trafficSources}
            subscriberGrowth={subscriberGrowth}
            modelPerformance={modelPerformance}
            dashboardKPIs={dashboardKPIs}
            expenseHistory={expenseHistory}
          />
        </main>
      </div>
    </div>
  )
}

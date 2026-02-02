/**
 * Financial Analytics Dashboard
 * Phase 49 - Granular revenue analytics with filtering
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import FinancialAnalyticsClient from './analytics-client'
import { getChartData, getKPIMetrics, getCategoryBreakdown } from '@/lib/services/analytics-engine'

export const metadata = {
  title: 'Financial Analytics | OnyxOS',
  description: 'Detailed revenue analytics and insights',
}

export default async function FinancialAnalyticsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Fetch user profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  // Fetch agency data
  const { data: agency } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', profile?.agency_id)
    .single()

  // Fetch models for filtering
  const { data: models } = await supabase
    .from('models')
    .select('id, name, avatar_url, status')
    .eq('agency_id', profile?.agency_id)
    .eq('status', 'active')

  const agencyId = profile?.agency_id || ''

  // Fetch initial analytics data (default: last 30 days, all models)
  const [chartData, kpiMetrics, categoryBreakdown] = await Promise.all([
    getChartData(agencyId, { timeRange: '30d' }),
    getKPIMetrics(agencyId, { timeRange: '30d' }),
    getCategoryBreakdown(agencyId, { timeRange: '30d' }),
  ])

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-[250px]">
        <Header />
        <main className="p-6">
          <FinancialAnalyticsClient
            user={user}
            profile={profile}
            agency={agency}
            models={models || []}
            initialChartData={chartData}
            initialKPIMetrics={kpiMetrics}
            initialCategoryBreakdown={categoryBreakdown}
          />
        </main>
      </div>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { AgencyProvider } from '@/providers/agency-data-provider'
import { QueryProvider } from '@/providers/query-provider'

/**
 * Dashboard Layout
 * Phase 64 - Unified Data Architecture
 *
 * Wraps all dashboard pages with:
 * 1. Authentication check
 * 2. AgencyProvider for global state
 * 3. Sidebar and Header layout
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Fetch user profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  if (!profile?.agency_id) {
    redirect('/join')
  }

  // Fetch agency data
  const { data: agency } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', profile.agency_id)
    .single()

  // Fetch models
  const { data: models } = await supabase
    .from('models')
    .select('*')
    .eq('agency_id', profile.agency_id)
    .order('name')

  return (
    <QueryProvider>
      <AgencyProvider
        initialUser={user}
        initialProfile={profile}
        initialAgency={agency}
        initialModels={models || []}
      >
        <div className="flex min-h-screen bg-zinc-950">
          <Sidebar />
          <div className="flex-1 ml-[250px]">
            <Header />
            <main className="p-6">{children}</main>
          </div>
        </div>
      </AgencyProvider>
    </QueryProvider>
  )
}

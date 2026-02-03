import DashboardClient from './dashboard-client'

/**
 * Dashboard Page
 * Phase 64 - Unified Data Architecture
 *
 * Now simplified - auth and data fetching moved to layout.tsx
 * The DashboardClient uses useAgencyData() context for all data.
 */
export default async function DashboardPage() {
  return <DashboardClient />
}

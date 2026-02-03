import CreatorManagementClient from './creator-management-client'

/**
 * Creator Management Page
 * Phase 64 - Unified Data Architecture
 *
 * Now simplified - auth and data fetching handled by layout.tsx
 * The CreatorManagementClient uses useAgencyData() context for all data.
 */
export default async function CreatorManagementPage() {
  return <CreatorManagementClient />
}

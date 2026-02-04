'use client'

import { useQuery } from '@tanstack/react-query'
import { useAgencyData } from '@/providers/agency-data-provider'

/**
 * useRevenueHeartbeat - Live Revenue Polling Hook
 *
 * Polls revenue data every 60 seconds to keep dashboard live.
 * Shows visual indicators for data freshness.
 *
 * Features:
 * - 60-second refresh interval
 * - Data freshness tracking (< 5 mins = "Live")
 * - Subtle loading indicators
 * - Automatic refetch on window focus
 */
interface RevenueHeartbeatResult {
  // Revenue data
  totalRevenue: number
  modelsRevenue: Array<{
    id: string
    name: string
    revenue: number
  }>

  // Status indicators
  isLive: boolean // Data is fresh (< 5 mins old)
  isSyncing: boolean // Currently fetching
  lastUpdated: Date | null
  timeSinceUpdate: number // seconds

  // Actions
  refresh: () => void
}

export function useRevenueHeartbeat(): RevenueHeartbeatResult {
  const { agency, models, refreshData, lastRefreshed } = useAgencyData()

  // Poll revenue data every 60 seconds
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['revenue-heartbeat', agency?.id],
    queryFn: async () => {
      if (!agency?.id) return null

      // Fetch latest revenue from API
      const response = await fetch(`/api/analytics/dashboard?agencyId=${agency.id}&timeRange=all`)
      if (!response.ok) {
        throw new Error('Failed to fetch revenue')
      }

      const data = await response.json()
      return {
        totalRevenue: data.kpiMetrics?.totalRevenue || 0,
        models: data.models || [],
        timestamp: new Date(),
      }
    },
    enabled: !!agency?.id,
    // Poll every 60 seconds
    refetchInterval: 60000,
    // Refetch on window focus
    refetchOnWindowFocus: true,
    // Consider data stale after 5 minutes
    staleTime: 5 * 60 * 1000,
    // Keep previous data while fetching
    placeholderData: previousData => previousData,
  })

  // Calculate data freshness
  const lastUpdated = data?.timestamp || lastRefreshed
  const timeSinceUpdate = lastUpdated
    ? Math.floor((Date.now() - lastUpdated.getTime()) / 1000)
    : Infinity
  const isLive = timeSinceUpdate < 5 * 60 // Less than 5 minutes = "Live"

  // Calculate total revenue from models if API data not available
  const totalRevenue =
    data?.totalRevenue || models.reduce((sum, m) => sum + Number(m.revenue_total || 0), 0)

  // Map models with revenue
  const modelsRevenue = models.map(m => ({
    id: m.id,
    name: m.name || 'Unknown',
    revenue: Number(m.revenue_total || 0),
  }))

  return {
    totalRevenue,
    modelsRevenue,
    isLive,
    isSyncing: isFetching,
    lastUpdated,
    timeSinceUpdate,
    refresh: () => {
      refetch()
      refreshData()
    },
  }
}

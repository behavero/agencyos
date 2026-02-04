'use client'

/**
 * Agency Data Provider
 * Phase 64 - Unified Data Architecture
 *
 * Single Source of Truth for all agency data across the application.
 * Eliminates data inconsistencies by sharing state globally.
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { ChartDataPoint, KPIMetrics, CategoryBreakdown } from '@/lib/services/analytics-engine'

// Database types
type Profile = Database['public']['Tables']['profiles']['Row']
type Agency = Database['public']['Tables']['agencies']['Row']
type Model = Database['public']['Tables']['models']['Row']

// Extended model with computed stats
export interface ModelWithStats extends Model {
  revenue: number
  transactionCount: number
  messageRevenue: number
  tipRevenue: number
  postRevenue: number
  subscriptionRevenue: number
}

// Aggregated agency stats
export interface AgencyStats {
  totalRevenue: number
  netRevenue: number
  totalSubscribers: number
  totalFollowers: number
  activeModels: number
  arpu: number
  ltv: number
  transactionCount: number
  revenueGrowth: number
}

// Transaction summary for charts
export interface TransactionSummary {
  id: string
  date: string
  type: 'subscription' | 'tip' | 'message' | 'post'
  amount: number
  netAmount: number
  modelId: string
  fanId: string
}

// Context state interface
export interface AgencyDataState {
  // Core data
  user: User | null
  profile: Profile | null
  agency: Agency | null
  models: ModelWithStats[]

  // Analytics
  agencyStats: AgencyStats
  chartData: ChartDataPoint[]
  categoryBreakdown: CategoryBreakdown[]
  kpiMetrics: KPIMetrics | null

  // Loading states
  isLoading: boolean
  isRefreshing: boolean
  error: string | null

  // Metadata
  lastRefreshed: Date | null

  // Actions
  refreshData: () => Promise<void>
  setTimeRange: (range: string) => void
  setSelectedModel: (modelId: string | null) => void
  getMetricsForModel: (modelId: string) => ModelWithStats | null

  // Filters
  timeRange: string
  selectedModelId: string | null
}

// Default empty states
const emptyStats: AgencyStats = {
  totalRevenue: 0,
  netRevenue: 0,
  totalSubscribers: 0,
  totalFollowers: 0,
  activeModels: 0,
  arpu: 0,
  ltv: 0,
  transactionCount: 0,
  revenueGrowth: 0,
}

const emptyKPIs: KPIMetrics = {
  totalRevenue: 0,
  netRevenue: 0,
  activeSubscribers: 0,
  arpu: 0,
  messageConversionRate: 0,
  ppvConversionRate: 0,
  tipAverage: 0,
  transactionCount: 0,
  revenueGrowth: 0,
  ltv: 0,
  goldenRatio: 0,
  totalMessagesSent: 0,
  totalPPVSent: 0,
  newFans: 0,
  unlockRate: 0,
}

// Create context with default values
const AgencyDataContext = createContext<AgencyDataState | null>(null)

// Provider props
interface AgencyProviderProps {
  children: ReactNode
  initialUser?: User | null
  initialProfile?: Profile | null
  initialAgency?: Agency | null
  initialModels?: Model[]
}

export function AgencyProvider({
  children,
  initialUser = null,
  initialProfile = null,
  initialAgency = null,
  initialModels = [],
}: AgencyProviderProps) {
  // Core state
  const [user, setUser] = useState<User | null>(initialUser)
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  const [agency, setAgency] = useState<Agency | null>(initialAgency)
  const [models, setModels] = useState<ModelWithStats[]>(
    initialModels.map(m => ({
      ...m,
      revenue: 0,
      transactionCount: 0,
      messageRevenue: 0,
      tipRevenue: 0,
      postRevenue: 0,
      subscriptionRevenue: 0,
    }))
  )

  // Analytics state
  const [agencyStats, setAgencyStats] = useState<AgencyStats>(emptyStats)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([])
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics | null>(null)

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Metadata
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  // Filters
  const [timeRange, setTimeRangeState] = useState<string>('all')
  const [selectedModelId, setSelectedModelIdState] = useState<string | null>(null)

  // Fetch all data from the unified API
  const refreshData = useCallback(async () => {
    if (!agency?.id) {
      console.log('[AgencyProvider] No agency ID, skipping refresh')
      setIsLoading(false)
      return
    }

    const isInitialLoad = !lastRefreshed
    if (isInitialLoad) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }

    try {
      console.log('[AgencyProvider] Fetching data...', {
        agencyId: agency.id,
        timeRange,
        modelId: selectedModelId,
      })

      // Build API URL with filters
      const params = new URLSearchParams({
        agencyId: agency.id,
        timeRange: timeRange,
      })
      if (selectedModelId) {
        params.append('modelId', selectedModelId)
      }

      const response = await fetch(`/api/analytics/dashboard?${params}`)

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      console.log('[AgencyProvider] Received data:', {
        chartDataPoints: data.chartData?.length || 0,
        totalRevenue: data.kpiMetrics?.totalRevenue || 0,
        categories: data.categoryBreakdown?.length || 0,
      })

      // Update analytics state
      if (data.chartData) {
        setChartData(data.chartData)
      }
      if (data.kpiMetrics) {
        setKpiMetrics(data.kpiMetrics)

        // Update agency stats from KPI metrics
        setAgencyStats({
          totalRevenue: data.kpiMetrics.totalRevenue || 0,
          netRevenue: data.kpiMetrics.netRevenue || 0,
          totalSubscribers: data.kpiMetrics.activeSubscribers || 0,
          totalFollowers: 0, // Will be calculated from models
          activeModels: models.length,
          arpu: data.kpiMetrics.arpu || 0,
          ltv: data.kpiMetrics.ltv || 0,
          transactionCount: data.kpiMetrics.transactionCount || 0,
          revenueGrowth: data.kpiMetrics.revenueGrowth || 0,
        })
      }
      if (data.categoryBreakdown) {
        setCategoryBreakdown(data.categoryBreakdown)
      }

      // Fetch model-level revenue breakdown
      await fetchModelStats()

      setError(null)
      setLastRefreshed(new Date())
    } catch (err) {
      console.error('[AgencyProvider] Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [agency?.id, timeRange, selectedModelId, models.length])

  // Fetch per-model revenue stats
  const fetchModelStats = useCallback(async () => {
    if (!agency?.id || models.length === 0) return

    const supabase = createClient()

    try {
      // Get revenue breakdown per model
      const { data: modelRevenue, error } = await supabase
        .from('fanvue_transactions')
        .select('model_id, transaction_type, amount, net_amount')
        .eq('agency_id', agency.id)

      if (error) {
        console.error('[AgencyProvider] Error fetching model stats:', error)
        return
      }

      // Aggregate by model
      const modelStatsMap = new Map<
        string,
        {
          revenue: number
          transactionCount: number
          messageRevenue: number
          tipRevenue: number
          postRevenue: number
          subscriptionRevenue: number
        }
      >()

      for (const tx of modelRevenue || []) {
        const existing = modelStatsMap.get(tx.model_id) || {
          revenue: 0,
          transactionCount: 0,
          messageRevenue: 0,
          tipRevenue: 0,
          postRevenue: 0,
          subscriptionRevenue: 0,
        }

        existing.revenue += tx.amount || 0
        existing.transactionCount += 1

        switch (tx.transaction_type) {
          case 'message':
            existing.messageRevenue += tx.amount || 0
            break
          case 'tip':
            existing.tipRevenue += tx.amount || 0
            break
          case 'post':
            existing.postRevenue += tx.amount || 0
            break
          case 'subscription':
            existing.subscriptionRevenue += tx.amount || 0
            break
        }

        modelStatsMap.set(tx.model_id, existing)
      }

      // Update models with stats
      setModels(prevModels =>
        prevModels.map(model => ({
          ...model,
          ...(modelStatsMap.get(model.id) || {
            revenue: 0,
            transactionCount: 0,
            messageRevenue: 0,
            tipRevenue: 0,
            postRevenue: 0,
            subscriptionRevenue: 0,
          }),
        }))
      )

      // Update total followers from models
      const totalFollowers = models.reduce((sum, m) => sum + (m.followers_count || 0), 0)
      setAgencyStats(prev => ({ ...prev, totalFollowers }))
    } catch (err) {
      console.error('[AgencyProvider] Error in fetchModelStats:', err)
    }
  }, [agency?.id, models])

  // Set time range and trigger refresh
  const setTimeRange = useCallback((range: string) => {
    setTimeRangeState(range)
  }, [])

  // Set selected model and trigger refresh
  const setSelectedModel = useCallback((modelId: string | null) => {
    setSelectedModelIdState(modelId)
  }, [])

  // Get metrics for a specific model
  const getMetricsForModel = useCallback(
    (modelId: string): ModelWithStats | null => {
      return models.find(m => m.id === modelId) || null
    },
    [models]
  )

  // Initial data fetch
  useEffect(() => {
    if (agency?.id) {
      refreshData()
    }
  }, [agency?.id]) // Only on initial mount

  // Refetch when filters change
  useEffect(() => {
    if (agency?.id && lastRefreshed) {
      refreshData()
    }
  }, [timeRange, selectedModelId]) // When filters change

  // Revenue Heartbeat: Auto-refresh every 60 seconds for live updates
  useEffect(() => {
    if (!agency?.id) return

    const interval = setInterval(() => {
      console.log('[AgencyProvider] Revenue heartbeat - refreshing data...')
      refreshData()
    }, 60 * 1000) // 60 seconds (Revenue Heartbeat)

    return () => clearInterval(interval)
  }, [agency?.id, refreshData])

  // Context value
  const value: AgencyDataState = {
    // Core data
    user,
    profile,
    agency,
    models,

    // Analytics
    agencyStats,
    chartData,
    categoryBreakdown,
    kpiMetrics,

    // Loading states
    isLoading,
    isRefreshing,
    error,

    // Metadata
    lastRefreshed,

    // Actions
    refreshData,
    setTimeRange,
    setSelectedModel,
    getMetricsForModel,

    // Filters
    timeRange,
    selectedModelId,
  }

  return <AgencyDataContext.Provider value={value}>{children}</AgencyDataContext.Provider>
}

// Custom hook to use agency data
export function useAgencyData(): AgencyDataState {
  const context = useContext(AgencyDataContext)

  if (!context) {
    throw new Error('useAgencyData must be used within an AgencyProvider')
  }

  return context
}

// Optional hook that returns null if no provider (for optional use)
export function useAgencyDataOptional(): AgencyDataState | null {
  return useContext(AgencyDataContext)
}

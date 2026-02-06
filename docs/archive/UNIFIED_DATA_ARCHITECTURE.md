# Phase 64: Unified Data Architecture

## Overview

This phase implements a **Single Source of Truth** pattern using React Context to eliminate data inconsistencies and reduce API calls across the application.

## Architecture

### The Problem (Before)

- Multiple pages fetching the same data independently
- Data inconsistencies (e.g., $13k on one page, $0 on another)
- Redundant API calls on every page navigation
- No shared state between dashboard views

### The Solution (After)

- **AgencyProvider** wraps all dashboard pages
- Data fetched once, shared everywhere
- Automatic refresh every 2 minutes
- Consistent KPIs across all views

## Files Created/Modified

### New Files

| File                                     | Purpose                                  |
| ---------------------------------------- | ---------------------------------------- |
| `src/providers/agency-data-provider.tsx` | React Context provider with global state |
| `src/lib/services/agency-service.ts`     | Consolidated data fetching service       |
| `src/app/dashboard/layout.tsx`           | Dashboard layout wrapping with provider  |

### Modified Files

| File                                                                 | Change                               |
| -------------------------------------------------------------------- | ------------------------------------ |
| `src/app/dashboard/page.tsx`                                         | Simplified - now just renders client |
| `src/app/dashboard/dashboard-client.tsx`                             | Uses `useAgencyData()` hook          |
| `src/app/dashboard/creator-management/page.tsx`                      | Simplified                           |
| `src/app/dashboard/creator-management/creator-management-client.tsx` | Uses `useAgencyData()` hook          |

## How It Works

### 1. AgencyProvider (Context)

```typescript
// src/providers/agency-data-provider.tsx
export function AgencyProvider({ children, initialUser, initialProfile, initialAgency, initialModels }) {
  // State
  const [models, setModels] = useState(initialModels)
  const [agencyStats, setAgencyStats] = useState(emptyStats)
  const [chartData, setChartData] = useState([])
  const [kpiMetrics, setKpiMetrics] = useState(null)

  // Actions
  const refreshData = async () => { /* fetch from API */ }
  const setTimeRange = (range) => { /* update filter */ }
  const setSelectedModel = (id) => { /* update filter */ }

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(refreshData, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <AgencyDataContext.Provider value={{ models, agencyStats, chartData, ... }}>
      {children}
    </AgencyDataContext.Provider>
  )
}
```

### 2. Dashboard Layout (Wrapper)

```typescript
// src/app/dashboard/layout.tsx
export default async function DashboardLayout({ children }) {
  // Auth check
  // Fetch initial data server-side

  return (
    <AgencyProvider
      initialUser={user}
      initialProfile={profile}
      initialAgency={agency}
      initialModels={models}
    >
      <Sidebar />
      <Header />
      {children}
    </AgencyProvider>
  )
}
```

### 3. Using the Context

```typescript
// Any dashboard component
import { useAgencyData } from '@/providers/agency-data-provider'

function MyComponent() {
  const {
    models,
    agencyStats,
    chartData,
    kpiMetrics,
    isLoading,
    refreshData,
    setTimeRange,
    setSelectedModel,
  } = useAgencyData()

  // Use the data...
}
```

## State Shape

```typescript
interface AgencyDataState {
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
```

## Benefits

1. **Consistency**: Same data shown everywhere
2. **Performance**: Fewer API calls (data cached in context)
3. **Simplicity**: Components just consume from context
4. **Real-time**: Auto-refresh keeps data fresh
5. **Filter Sync**: Time range and model filters apply globally

## Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     DashboardLayout                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    AgencyProvider                        │ │
│  │  ┌─────────────────────────────────────────────────────┐│ │
│  │  │ State: models, chartData, kpiMetrics, agencyStats   ││ │
│  │  │ Actions: refreshData, setTimeRange, setSelectedModel││ │
│  │  └─────────────────────────────────────────────────────┘│ │
│  │         ↓                    ↓                    ↓      │ │
│  │  ┌──────────┐        ┌──────────────┐     ┌───────────┐ │ │
│  │  │ Overview │        │ Creator Mgmt │     │ Analytics │ │ │
│  │  │  Page    │        │    Page      │     │   Page    │ │ │
│  │  └──────────┘        └──────────────┘     └───────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## API Endpoints Used

| Endpoint                   | Purpose                              |
| -------------------------- | ------------------------------------ |
| `/api/analytics/dashboard` | KPIs, chart data, category breakdown |
| `/api/creators/[id]/stats` | Per-creator stats refresh            |
| `/api/agency/sync`         | Full Fanvue data sync                |

## Future Improvements

1. **Optimistic Updates**: Update local state before API confirms
2. **Cache Persistence**: Store in localStorage for faster initial loads
3. **WebSocket Integration**: Real-time updates without polling
4. **Partial Updates**: Only refresh changed data

---

**Phase 64 Complete** ✅

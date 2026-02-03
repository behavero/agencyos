# Unified Data Architecture

**Last Updated**: February 3, 2026  
**Status**: ✅ Production Ready

---

## 🎯 **Core Principle**

**ONE API, ONE DATABASE TABLE, ONE SOURCE OF TRUTH**

All analytics, KPIs, and insights MUST use the **same data pipeline** to ensure consistency across the entire application.

---

## 📊 **Data Flow**

```
Fanvue API
    ↓
[Transaction Syncer] (Cron Job @ Midnight)
    ↓
fanvue_transactions (Database)
    ↓
analytics-engine.ts (Business Logic)
    ↓
/api/analytics/dashboard (API Endpoint)
    ↓
Dashboard Client Components (UI)
```

---

## 🔧 **Single Source of Truth**

### **Database Tables**

#### **1. `fanvue_transactions`** (Primary Data Source)

- Stores ALL Fanvue earnings data
- Synced daily via `/api/cron/sync-transactions`
- Columns:
  - `transaction_type`: 'subscription', 'tip', 'ppv', 'message', 'post', 'stream', 'other'
  - `amount`: Gross revenue in dollars
  - `net_amount`: Revenue after platform fees (generated column)
  - `fan_id`, `fan_username`: Fan identification
  - `transaction_date`: When the transaction occurred
  - `model_id`, `agency_id`: Ownership relationships

**Usage**: ALL revenue calculations, KPIs, and charts MUST query this table.

#### **2. `models`** (Current State Snapshot)

- Stores current subscriber/follower counts
- Updated daily via `/api/cron/daily-refresh`
- Columns:
  - `subscribers_count`: Current subscriber count
  - `followers_count`: Current follower count
  - `revenue_total`: Total all-time revenue (updated after transaction sync)
  - `posts_count`, `likes_count`: Content metrics

**Usage**: Current audience metrics ONLY. For historical trends, use `subscriber_history`.

#### **3. `subscriber_history`** (Historical Trends)

- Daily snapshots of subscriber/follower counts
- Enables "Audience Growth" chart with historical data
- Columns:
  - `date`: Snapshot date
  - `subscribers_count`: Subscribers on that date
  - `followers_count`: Followers on that date
  - `model_id`, `agency_id`: Ownership

**Usage**: Historical trend charts (Audience Growth).

---

### **Business Logic Layer**

#### **`src/lib/services/analytics-engine.ts`**

This is the **ONLY** file that should calculate KPIs and analytics from raw data.

**Functions**:

1. **`getChartData(agencyId, options)`**
   - Returns revenue over time (daily/weekly/monthly aggregation)
   - Queries: `fanvue_transactions` table
   - Used by: "Revenue Over Time" chart

2. **`getKPIMetrics(agencyId, options)`**
   - Calculates ALL KPI metrics
   - Queries: `fanvue_transactions` + `models` tables
   - Returns:
     ```typescript
     {
       totalRevenue: number
       netRevenue: number
       activeSubscribers: number
       arpu: number // Total Revenue / (Subs + Followers)
       tipAverage: number // Total Tips / Tip Count
       ltv: number // Total Revenue / Subscribers
       goldenRatio: number // Interaction Revenue / Subscription Revenue
       messageConversionRate: number // Messages Bought / Subscribers * 100
       ppvConversionRate: number // PPV Bought / Subscribers * 100
       totalMessagesSent: number
       totalPPVSent: number
       newFans: number // Unique buyers in period
       unlockRate: number // N/A (requires chat tracking)
       revenueGrowth: number // % change vs previous period
       transactionCount: number // Total transactions in period
     }
     ```

3. **`getCategoryBreakdown(agencyId, options)`**
   - Returns revenue breakdown by transaction type
   - Queries: `fanvue_transactions` table
   - Used by: "Earnings by Type" chart

**Critical Rules**:

- ✅ Always use `COUNT(*)` queries for accurate transaction counts (not array length)
- ✅ Use `.limit(50000)` for large datasets to bypass Supabase 1,000-row default limit
- ✅ Respect date range filters (`startDate`, `endDate`, `timeRange`)
- ✅ Handle model filtering (`modelId` parameter)

---

### **API Layer**

#### **`src/app/api/analytics/dashboard/route.ts`**

This is the **ONLY** API endpoint that should serve dashboard analytics data.

**Parameters**:

- `agencyId` (required): Which agency's data to fetch
- `modelId` (optional): Filter by specific model (omit for "All Models")
- `timeRange` (optional): '7d', '30d', '90d', '1y', 'all'
- `startDate` (optional): Custom date range start
- `endDate` (optional): Custom date range end

**Response**:

```typescript
{
  chartData: ChartDataPoint[],
  kpiMetrics: KPIMetrics,
  categoryBreakdown: CategoryBreakdown[]
}
```

**Usage**: ALL dashboard tabs (Overview, Fanvue & Finance) fetch from this endpoint.

---

### **Client Layer**

#### **`src/app/dashboard/dashboard-client.tsx`**

**State Management**:

```typescript
// Overview tab data
const [overviewData, setOverviewData] = useState<{
  chartData: ChartDataPoint[]
  kpiMetrics: KPIMetrics
  categoryBreakdown: CategoryBreakdown[]
} | null>(null)

// Fanvue tab data
const [modelChartData, setModelChartData] = useState<ChartDataPoint[]>([])
const [modelKPIMetrics, setModelKPIMetrics] = useState<KPIMetrics>(...)
const [modelCategoryBreakdown, setModelCategoryBreakdown] = useState<CategoryBreakdown[]>([])
```

**Data Fetching**:

- Both Overview and Fanvue tabs call `/api/analytics/dashboard` dynamically
- ✅ NO server-side props for analytics data (100% client-side)
- ✅ Auto-refresh every 5 minutes for live data
- ✅ Refetch on date range change or model filter change

**Display Formatting**:

- `formatCurrency(amount, showCents = false)`: Use `showCents=true` for small values (ARPU, Avg Tip, LTV)
- Example: `formatCurrency(0.03, true)` → "$0.03" (not "$0")

---

## ⚙️ **Automatic Data Syncing**

### **1. Vercel Cron Jobs** (Daily Automatic Sync)

Configured in `vercel.json`:

```json
"crons": [
  {
    "path": "/api/cron/sync-transactions",
    "schedule": "0 0 * * *"  // Midnight UTC
  },
  {
    "path": "/api/cron/daily-refresh",
    "schedule": "0 1 * * *"  // 1:00 AM UTC
  }
]
```

**Sync Flow**:

1. **Midnight (00:00 UTC)**: `/api/cron/sync-transactions`
   - Syncs new Fanvue transactions
   - Updates `fanvue_transactions` table
   - Updates `models.revenue_total`

2. **1:00 AM (01:00 UTC)**: `/api/cron/daily-refresh`
   - Fetches current subscriber/follower counts
   - Updates `models` table stats
   - Resets daily quests

### **2. Client-Side Auto-Refresh** (5-Minute Polling)

Dashboard automatically refetches data every 5 minutes without page reload.

```typescript
// Auto-refresh every 5 minutes (300000ms) for live data
const refreshInterval = setInterval(() => {
  console.log('[Overview] Auto-refreshing data...')
  fetchOverviewData()
}, 300000)

return () => clearInterval(refreshInterval)
```

**Benefits**:

- ✅ No manual "Sync Data" button needed
- ✅ Dashboard stays up-to-date without page refresh
- ✅ Users see new transactions within 5 minutes

### **3. Manual Sync** (On-Demand)

Users can still trigger manual sync via:

- **"Sync Agency" button** in dashboard header
- **API call**: `POST /api/agency/sync`

---

## 🚀 **Adding New Features (Template)**

When adding new analytics features, follow this pattern:

### **Step 1: Database Schema** (if needed)

```sql
-- Add column to existing table or create new table
ALTER TABLE fanvue_transactions ADD COLUMN IF NOT EXISTS new_field TEXT;
```

### **Step 2: Update `analytics-engine.ts`**

```typescript
export async function getNewMetric(
  agencyId: string,
  options: { modelId?: string; timeRange?: TimeRange }
): Promise<NewMetricType> {
  const supabase = await createClient()
  const { startDate, endDate } = getDateRange(options.timeRange)

  let query = supabase
    .from('fanvue_transactions')
    .select('*')
    .eq('agency_id', agencyId)
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString())

  if (options.modelId) {
    query = query.eq('model_id', options.modelId)
  }

  const { data, error } = await query

  // Calculate metric from data
  const result =
    data?.reduce((acc, tx) => {
      // Your calculation logic
      return acc
    }, 0) || 0

  return result
}
```

### **Step 3: Extend API Endpoint**

```typescript
// src/app/api/analytics/dashboard/route.ts
const [chartData, kpiMetrics, categoryBreakdown, newMetric] = await Promise.all([
  getChartData(profile.agency_id, { modelId, timeRange, startDate, endDate }),
  getKPIMetrics(profile.agency_id, { modelId, timeRange, startDate, endDate }),
  getCategoryBreakdown(profile.agency_id, { modelId, timeRange, startDate, endDate }),
  getNewMetric(profile.agency_id, { modelId, timeRange }), // NEW
])

return NextResponse.json({
  chartData,
  kpiMetrics,
  categoryBreakdown,
  newMetric, // NEW
})
```

### **Step 4: Update Client State**

```typescript
// src/app/dashboard/dashboard-client.tsx
const [newMetricData, setNewMetricData] = useState<NewMetricType | null>(null)

// In fetchOverviewData or fetchModelData:
const data = await response.json()
setNewMetricData(data.newMetric)
```

### **Step 5: Display in UI**

```typescript
<Card className="glass">
  <CardHeader>
    <CardTitle>New Metric</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">
      {newMetricData ? formatValue(newMetricData) : '0'}
    </div>
  </CardContent>
</Card>
```

---

## ✅ **Checklist for New Features**

Before deploying new analytics features, ensure:

- [ ] Data comes from `fanvue_transactions` or `models` table (not hardcoded)
- [ ] Business logic is in `analytics-engine.ts` (not in API route or client)
- [ ] API endpoint is `/api/analytics/dashboard` (not a new endpoint)
- [ ] Client fetches dynamically (no server-side props)
- [ ] Auto-refresh is enabled (uses existing `useEffect` hooks)
- [ ] Date range filters are respected (`startDate`, `endDate`, `timeRange`)
- [ ] Model filter is respected (`modelId` parameter)
- [ ] Metrics use accurate COUNT queries (not array length)
- [ ] Large datasets use `.limit(50000)` to bypass Supabase limits
- [ ] Currency formatting shows cents for small values (`formatCurrency(value, true)`)

---

## 🔍 **Common Pitfalls to Avoid**

### **❌ BAD: Multiple Data Sources**

```typescript
// DON'T DO THIS
const revenueFromProps = revenueHistory.reduce(...)  // Server-side
const revenueFromAPI = overviewData.kpiMetrics.totalRevenue  // Client-side
const revenueFromDB = models.reduce(...)  // Static snapshot

// Which one is correct? 🤷‍♂️
```

### **✅ GOOD: Single Source**

```typescript
// DO THIS
const totalRevenue = overviewData?.kpiMetrics?.totalRevenue ?? 0 // From API only
```

---

### **❌ BAD: Server-Side Props**

```typescript
// DON'T DO THIS
export default async function DashboardPage() {
  const revenue = await getRevenueHistory(agencyId)  // Server-side
  return <DashboardClient revenueHistory={revenue} />  // Stale data!
}
```

### **✅ GOOD: Client-Side Dynamic Fetch**

```typescript
// DO THIS
export default function DashboardClient() {
  useEffect(() => {
    fetch('/api/analytics/dashboard?...') // Dynamic, always fresh
      .then(res => res.json())
      .then(data => setOverviewData(data))
  }, [dateRange])
}
```

---

### **❌ BAD: Hardcoded Calculations**

```typescript
// DON'T DO THIS
const arpu = totalRevenue / 100 // Hardcoded divisor
```

### **✅ GOOD: Database-Driven Calculations**

```typescript
// DO THIS
const { data: models } = await supabase.from('models').select('subscribers_count, followers_count')

const totalAudience = models.reduce((sum, m) => sum + m.subscribers_count + m.followers_count, 0)
const arpu = totalAudience > 0 ? totalRevenue / totalAudience : 0
```

---

## 📚 **Related Documentation**

- **KPI Formulas**: `/KPI_FORMULAS_REFERENCE.md`
- **Fanvue API Docs**: `/docs/fanvue-api-docs/`
- **Development Rules**: `/docs/DEVELOPMENT_RULES.md`
- **Dashboard Fix Summary**: `/DASHBOARD_FIX_SUMMARY.md`
- **Sync Verification**: `/docs/SYNC_VERIFICATION_GUIDE.md`

---

## 🎯 **Key Takeaways**

1. ✅ **One API**: `/api/analytics/dashboard` for all analytics data
2. ✅ **One Table**: `fanvue_transactions` for all transaction data
3. ✅ **One Logic File**: `analytics-engine.ts` for all KPI calculations
4. ✅ **Auto-Sync**: Daily cron jobs + 5-minute client polling
5. ✅ **No Server Props**: 100% client-side dynamic data fetching
6. ✅ **Consistent Display**: Same numbers in Overview, Fanvue, and all future tabs

**Questions?** Refer to this document before adding new analytics features!

# PHASE 54 - ARCHITECTURE DIAGRAM

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FANVUE API                              │
│                    (External Service)                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ GET /insights/earnings
                         │ (date, gross, net, source, user)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│               TRANSACTION SYNCER SERVICE                        │
│         src/lib/services/transaction-syncer.ts                  │
│                                                                 │
│  • syncModelTransactions(modelId)                              │
│  • syncAgencyTransactions(agencyId)                            │
│  • Date parsing: earning.date → ISO timestamp                 │
│  • Category mapping: source → enum                             │
│  • Deduplication: fanvue_id + model_id                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ INSERT/UPSERT
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                            │
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐    │
│  │         fanvue_transactions TABLE                     │    │
│  │  • id (UUID)                                          │    │
│  │  • agency_id (UUID) → agencies.id                    │    │
│  │  • model_id (UUID) → models.id                       │    │
│  │  • fanvue_id (TEXT) - Unique transaction ID          │    │
│  │  • fanvue_user_id (TEXT) - Fan UUID                  │    │
│  │  • amount (NUMERIC) - Gross revenue                  │    │
│  │  • net_amount (NUMERIC) - After fees                 │    │
│  │  • currency (TEXT) - USD, EUR, etc.                  │    │
│  │  • category (ENUM) - subscription, tip, message, post│    │
│  │  • description (TEXT) - Transaction details          │    │
│  │  • fanvue_created_at (TIMESTAMPTZ) - Original date   │    │
│  │  • synced_at (TIMESTAMPTZ) - Sync timestamp          │    │
│  │  UNIQUE(fanvue_id, model_id)                         │    │
│  └───────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         │ RPC CALL                              │
│                         ▼                                       │
│  ┌───────────────────────────────────────────────────────┐    │
│  │    get_revenue_by_date_range(                         │    │
│  │      p_agency_id UUID,                                │    │
│  │      p_model_id UUID DEFAULT NULL,                    │    │
│  │      p_start_date TIMESTAMPTZ,                        │    │
│  │      p_end_date TIMESTAMPTZ                           │    │
│  │    )                                                  │    │
│  │    RETURNS TABLE (                                    │    │
│  │      date DATE,                                       │    │
│  │      subscriptions NUMERIC,                           │    │
│  │      tips NUMERIC,                                    │    │
│  │      messages NUMERIC,                                │    │
│  │      posts NUMERIC,                                   │    │
│  │      total NUMERIC                                    │    │
│  │    )                                                  │    │
│  │                                                       │    │
│  │  • Aggregates by DATE(fanvue_created_at)            │    │
│  │  • Groups by category                                │    │
│  │  • Returns daily totals                              │    │
│  └───────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Query Results
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ANALYTICS ENGINE SERVICE                       │
│            src/lib/services/analytics-engine.ts                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐      │
│  │  getChartData(agencyId, options)                    │      │
│  │  • Calls get_revenue_by_date_range RPC              │      │
│  │  • Fills missing dates with zeros                   │      │
│  │  • Returns ChartDataPoint[]                         │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐      │
│  │  getKPIMetrics(agencyId, options)                   │      │
│  │  • Queries fanvue_transactions directly             │      │
│  │  • Calculates: totalRevenue, netRevenue, ARPU, etc. │      │
│  │  • Returns KPIMetrics                               │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐      │
│  │  getCategoryBreakdown(agencyId, options)            │      │
│  │  • Groups transactions by category                  │      │
│  │  • Calculates percentages                           │      │
│  │  • Returns CategoryBreakdown[]                      │      │
│  └─────────────────────────────────────────────────────┘      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Server-side fetch
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DASHBOARD PAGE (SERVER)                       │
│                 src/app/dashboard/page.tsx                      │
│                                                                 │
│  • Fetches user, profile, agency, models                       │
│  • Calls analytics-engine functions:                           │
│    - getChartData(agencyId, { timeRange: '30d' })             │
│    - getKPIMetrics(agencyId, { timeRange: '30d' })            │
│    - getCategoryBreakdown(agencyId, { timeRange: '30d' })     │
│  • Passes data as props to DashboardClient                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Props
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                 DASHBOARD CLIENT (CLIENT)                       │
│              src/app/dashboard/dashboard-client.tsx             │
│                                                                 │
│  Props:                                                         │
│  • fanvueChartData: ChartDataPoint[]                           │
│  • fanvueKPIMetrics: KPIMetrics                                │
│  • fanvueCategoryBreakdown: CategoryBreakdown[]                │
│                                                                 │
│  Renders:                                                       │
│  ┌─────────────────────────────────────────────────────┐      │
│  │  <Tabs>                                             │      │
│  │    <TabsContent value="fanvue">                     │      │
│  │      <RevenueChart data={fanvueChartData} />        │      │
│  │      <EarningsBreakdown data={fanvueCategoryBreakdown} /> │
│  │      <KPICards metrics={fanvueKPIMetrics} />        │      │
│  │    </TabsContent>                                   │      │
│  │  </Tabs>                                            │      │
│  └─────────────────────────────────────────────────────┘      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Render
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      UI COMPONENTS                              │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐         │
│  │         RevenueChart Component                   │         │
│  │  src/components/dashboard/charts/revenue-chart.tsx│        │
│  │                                                  │         │
│  │  • Stacked BarChart (Recharts)                  │         │
│  │  • 4 bars: subscriptions, tips, messages, posts │         │
│  │  • Color-coded (Lime, Cyan, Purple, Amber)      │         │
│  │  • Empty state handling                         │         │
│  └──────────────────────────────────────────────────┘         │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐         │
│  │       EarningsBreakdown Component                │         │
│  │  src/components/dashboard/finance/earnings-breakdown.tsx│  │
│  │                                                  │         │
│  │  • List with icons + progress bars              │         │
│  │  • Shows: category, amount, %, transaction count│         │
│  │  • Color-coded progress bars                    │         │
│  │  • Empty state handling                         │         │
│  └──────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Summary

1. **Fanvue API** → Transaction data (earnings)
2. **Transaction Syncer** → Parse & store in database
3. **Database** → Store in `fanvue_transactions` table
4. **RPC Function** → Aggregate by date & category
5. **Analytics Engine** → Format for charts
6. **Dashboard Page** → Fetch data (server-side)
7. **Dashboard Client** → Render UI (client-side)
8. **UI Components** → Display charts & breakdowns

---

## 📊 Component Hierarchy

```
DashboardPage (Server Component)
└── DashboardClient (Client Component)
    └── Tabs
        └── TabsContent value="fanvue"
            ├── Card (Revenue Chart)
            │   └── RevenueChart
            │       └── ChartContainer
            │           └── BarChart (Recharts)
            │
            ├── Card (Earnings Breakdown)
            │   └── EarningsBreakdown
            │       └── List with progress bars
            │
            └── KPI Cards Grid
                ├── Total Revenue Card
                ├── Net Revenue Card
                ├── ARPU Card
                └── Avg Tip Card
```

---

## 🗄️ Database Schema

```sql
-- Main table
fanvue_transactions (
  id UUID PRIMARY KEY,
  agency_id UUID → agencies(id),
  model_id UUID → models(id),
  fanvue_id TEXT UNIQUE,
  fanvue_user_id TEXT,
  amount NUMERIC,
  net_amount NUMERIC,
  currency TEXT,
  category TEXT CHECK (subscription|tip|message|post|referral|other),
  description TEXT,
  fanvue_created_at TIMESTAMPTZ,  ← Used for charts
  synced_at TIMESTAMPTZ
)

-- Indexes
idx_fanvue_transactions_agency (agency_id)
idx_fanvue_transactions_model (model_id)
idx_fanvue_transactions_category (category)
idx_fanvue_transactions_fanvue_created_at (fanvue_created_at DESC)
idx_fanvue_transactions_agency_date (agency_id, created_at DESC)

-- RPC Function
get_revenue_by_date_range(
  p_agency_id UUID,
  p_model_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) → TABLE (date, subscriptions, tips, messages, posts, total)
```

---

## 🎨 Color Mapping

```typescript
Category         Color      Hex       Usage
─────────────────────────────────────────────
Subscription  →  Lime    → #a3e635 → Bar, Icon, Progress
Tip           →  Cyan    → #22d3ee → Bar, Icon, Progress
Message       →  Purple  → #a855f7 → Bar, Icon, Progress
Post          →  Amber   → #f59e0b → Bar, Icon, Progress
Renewal       →  Emerald → #10b981 → Icon, Progress
Referral      →  Pink    → #ec4899 → Icon, Progress
Other         →  Gray    → #6b7280 → Icon, Progress
```

---

## 🔐 Security (RLS)

```sql
-- Users can only view their agency's transactions
CREATE POLICY "Users can view transactions for their agency"
  ON fanvue_transactions FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  );

-- System can insert transactions (via service role)
CREATE POLICY "System can insert transactions"
  ON fanvue_transactions FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  );
```

---

## ⚡ Performance Optimizations

1. **Server-side Rendering** - Data fetched on server, no client-side loading
2. **Indexed Queries** - Fast lookups by agency_id, model_id, date
3. **RPC Function** - Database-level aggregation (faster than client-side)
4. **Date Filling** - Done in analytics-engine, not in component
5. **Caching** - Next.js automatic caching for static data

---

## 🧪 Testing Strategy

1. **Unit Tests** - Test analytics-engine functions
2. **Integration Tests** - Test RPC function with sample data
3. **E2E Tests** - Test full flow from sync to UI
4. **Manual Tests** - Use verification & seed scripts

---

**Phase 54 Architecture Complete!** 🎉  
Scalable, performant, and maintainable analytics system.

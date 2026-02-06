# 🔴 LIVE DATA SYSTEM

**Status:** FULLY OPERATIONAL ✅

---

## 🎯 OBJECTIVE

Provide **REAL-TIME** dashboard updates without manual "Sync Data" clicks.

---

## 📡 THREE-LAYER LIVE DATA ARCHITECTURE

### **Layer 1: SERVER-SIDE CRON JOBS (Vercel Automated)**

| Cron Job                       | Frequency            | Purpose                                                                   | Critical?       |
| ------------------------------ | -------------------- | ------------------------------------------------------------------------- | --------------- |
| `/api/cron/sync-transactions`  | **Every 15 minutes** | Syncs Fanvue transactions (revenue, tips, messages, subscriptions, posts) | 🔴 CRITICAL     |
| `/api/cron/daily-refresh`      | **Every 5 minutes**  | Updates subscriber counts, follower counts, message counts, post counts   | 🔴 CRITICAL     |
| `/api/cron/check-late-shifts`  | Every 6 hours        | Checks for late shifts (gamification)                                     | 🟡 LOW PRIORITY |
| `/api/cron/check-missed-posts` | Every 6 hours        | Checks for missed posts (gamification)                                    | 🟡 LOW PRIORITY |

**Cron Schedule Syntax:**

```cron
*/15 * * * *  → Every 15 minutes
*/5 * * * *   → Every 5 minutes
0 */6 * * *   → Every 6 hours
```

---

### **Layer 2: CLIENT-SIDE AUTO-REFRESH (Browser Polling)**

**Dashboard refreshes data automatically every 2 minutes:**

```typescript
// Overview Tab: Auto-refresh every 2 minutes
setInterval(() => {
  fetchOverviewData() // Fetch agency-wide KPIs, charts, breakdowns
}, 120000)

// Fanvue Tab: Auto-refresh every 2 minutes
setInterval(() => {
  fetchModelData() // Fetch model-specific KPIs, charts, breakdowns
}, 120000)
```

**Console Logging:**

- `[Overview] Auto-refreshing data...` → Logged every 2 minutes
- `[Fanvue] Auto-refreshing data...` → Logged every 2 minutes

**Benefits:**

- No page reload required
- Updates happen in the background
- User sees fresh data without clicking "Sync Data"

---

### **Layer 3: UNIFIED DATA SOURCE (Single API Endpoint)**

All dashboard data flows through **ONE API endpoint:**

```
/api/analytics/dashboard
```

**Query Parameters:**

- `agencyId` → Filter by agency
- `modelId` → Filter by specific model (or omit for agency-wide)
- `timeRange` → 'all', '7d', '30d', '1y'
- `startDate` / `endDate` → Custom date ranges

**Response Structure:**

```json
{
  "chartData": [...],        // Daily/weekly/monthly revenue data points
  "kpiMetrics": {...},       // Total revenue, ARPU, LTV, conversion rates
  "categoryBreakdown": [...] // Revenue by type (messages, tips, subs, posts)
}
```

**Business Logic:**

- All calculations done in `src/lib/services/analytics-engine.ts`
- Queries `fanvue_transactions` table (single source of truth)
- Applies date filters consistently across all metrics

---

## 🔄 DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                        FANVUE API                                │
│         (transactions, subscribers, followers, chats)            │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Every 15 min (transactions)
                                 │ Every 5 min (stats)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL CRON JOBS                              │
│  /api/cron/sync-transactions  +  /api/cron/daily-refresh        │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Upsert to Supabase
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                  SUPABASE DATABASE                               │
│  - fanvue_transactions (revenue, tips, messages, posts, subs)   │
│  - models (aggregated stats: revenue_total, subscribers, etc.)  │
│  - subscriber_history (daily snapshots for trend charts)        │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ API Request
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              /api/analytics/dashboard                            │
│          (analytics-engine.ts business logic)                    │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ JSON Response
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                 DASHBOARD CLIENT                                 │
│  - Auto-refresh every 2 minutes                                  │
│  - Dynamic filters (model, date range)                           │
│  - Real-time KPIs, charts, breakdowns                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⏱️ DATA FRESHNESS GUARANTEE

| Metric                      | Max Delay  | Update Frequency                       |
| --------------------------- | ---------- | -------------------------------------- |
| **Revenue / Transactions**  | 15 minutes | Cron every 15 min + Client every 2 min |
| **Subscribers / Followers** | 5 minutes  | Cron every 5 min + Client every 2 min  |
| **Message Counts**          | 5 minutes  | Cron every 5 min + Client every 2 min  |
| **Dashboard KPIs**          | 2 minutes  | Client-side auto-refresh               |
| **Charts & Graphs**         | 2 minutes  | Client-side auto-refresh               |

**Result:** Users see data that is **at most 2-15 minutes old**, depending on the metric.

---

## 🚀 DEPLOYMENT STATUS

### **Vercel Cron Jobs (Configured in `vercel.json`)**

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-transactions",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/daily-refresh",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### **Client-Side Auto-Refresh (Implemented in `dashboard-client.tsx`)**

```typescript
// Overview Tab
setInterval(() => fetchOverviewData(), 120000) // 2 minutes

// Fanvue Tab
setInterval(() => fetchModelData(), 120000) // 2 minutes
```

---

## 🔧 DEBUGGING & MONITORING

### **Check if Cron Jobs are Running**

1. Go to Vercel Dashboard → Project → Deployments → Cron Jobs
2. Look for:
   - `/api/cron/sync-transactions` → Should run every 15 minutes
   - `/api/cron/daily-refresh` → Should run every 5 minutes
3. Click on each cron job to see logs and execution history

### **Check Client-Side Auto-Refresh**

1. Open dashboard in browser
2. Open Developer Console (F12)
3. Look for console logs:
   - `[Overview] Auto-refreshing data...` → Every 2 minutes
   - `[Fanvue] Auto-refreshing data...` → Every 2 minutes

### **Manual Sync (If Needed)**

If you suspect data is stale:

1. Go to Dashboard → Click "Sync Data" button
2. This will trigger an immediate full sync of all creators

---

## 📊 RATE LIMITS & OPTIMIZATION

**Fanvue API Rate Limits:**

- 100 requests per minute per token
- 1 request per second recommended

**Our Usage:**

- **Sync Transactions (every 15 min):** ~3 API calls per model → 9 calls/15min for 3 models
- **Daily Refresh (every 5 min):** ~5 API calls per model → 15 calls/5min for 3 models
- **Total:** ~24 API calls per 5 minutes → **Well within limits**

**Optimizations:**

- Cursor-based pagination (only fetch new transactions since `last_transaction_sync`)
- Smart Lists for exact subscriber/follower counts (1 API call instead of paginating)
- Rate limit handling with exponential backoff (429 errors)

---

## ✅ RESULT: TRULY LIVE DATA

**Before:**

- Data only updated once per day (midnight + 1 AM)
- Users had to click "Sync Data" manually
- Dashboard showed stale data

**After:**

- Transactions sync **every 15 minutes** (Vercel cron)
- Subscribers/followers sync **every 5 minutes** (Vercel cron)
- Dashboard auto-refreshes **every 2 minutes** (client-side)
- **NO MANUAL SYNC REQUIRED** ✅

---

## 📚 RELATED DOCUMENTATION

- `UNIFIED_DATA_ARCHITECTURE.md` → How all data sources are unified
- `docs/PHASE48_REAL_TIME_DATA_WIRING.md` → Real-time data wiring details
- `docs/PHASE50B_FANVUE_VAULT_INTEGRATION.md` → Fanvue API integration guide
- `docs/SYNC_VERIFICATION_GUIDE.md` → How to verify sync is working

---

**Last Updated:** 2026-02-03  
**Status:** ✅ PRODUCTION READY

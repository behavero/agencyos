# 💰 Revenue Sync Issue Diagnosis

## Problem Statement

**Expected:** $13,000+ total revenue
**Actual:** $5,093 shown in dashboard
**Discrepancy:** ~$8,000 missing

## Root Cause Analysis

### Where Revenue Data Comes From

```typescript
// src/app/dashboard/dashboard-client.tsx (line 444)
const liveTotalRevenue = models.reduce((sum, m) => sum + Number(m.revenue_total || 0), 0)
const totalGrossRevenue =
  liveTotalRevenue > 0 ? liveTotalRevenue : (overviewData?.kpiMetrics?.totalRevenue ?? 0)
```

**The dashboard shows:** `models.revenue_total` field from the database

### How revenue_total Gets Updated

1. **Automatic Cron Job** (`/api/cron/revenue-heartbeat`)
   - Runs every 10 minutes
   - Calls `syncModelTransactions(modelId)` for each model
   - Should update `revenue_total` automatically

2. **Manual Sync Endpoint** (`/api/fanvue/force-sync-revenue`)
   - Can be triggered on-demand
   - Forces a full re-sync from Fanvue API
   - Recalculates `revenue_total` from `fanvue_transactions` table

### Data Flow

```
Fanvue API
  ↓
syncModelTransactions() [lib/services/transaction-syncer.ts]
  ↓
fanvue_transactions table (inserts new transactions)
  ↓
updateModelStats() [calculates SUM(amount)]
  ↓
models.revenue_total (updated in DB)
  ↓
Dashboard displays value
```

## Possible Causes

### 1. **Incomplete Transaction Sync**

- The `fanvue_transactions` table might not have all transactions from Fanvue
- Cursor-based pagination might have missed some records
- API rate limits might have stopped sync early

### 2. **Stale Cursor Position**

- The `last_transaction_sync` cursor might be pointing to a wrong position
- This causes the sync to skip older transactions
- **Solution:** Reset cursor to fetch ALL transactions

### 3. **Multiple Models Not Aggregated**

- If you have multiple models (Lanaa + others), they might not be summing correctly
- Check if all models are connected and syncing

### 4. **Fanvue API Data Lag**

- The Fanvue API itself might not be returning all historical data
- Their API might have pagination issues

## Diagnostic Steps

### Step 1: Check Database Directly

```sql
-- See what's in fanvue_transactions
SELECT
  model_id,
  COUNT(*) as transaction_count,
  SUM(amount) as total_from_transactions,
  MIN(transaction_date) as oldest_transaction,
  MAX(transaction_date) as newest_transaction
FROM fanvue_transactions
GROUP BY model_id;

-- Compare with models table
SELECT
  id,
  name,
  revenue_total,
  last_transaction_sync
FROM models
WHERE fanvue_access_token IS NOT NULL;
```

### Step 2: Force Full Re-Sync

**Option A: Via API** (requires authentication)

```bash
curl -X POST "https://onyxos.vercel.app/api/fanvue/force-sync-revenue?modelId=<MODEL_ID>"
```

**Option B: Via Dashboard Button** (if implemented)

- Add a "Force Sync" button next to the revenue widget
- Clicking it triggers the force-sync endpoint

**Option C: Reset Sync Cursor**

```sql
-- Reset last_transaction_sync to NULL to force full re-fetch
UPDATE models
SET last_transaction_sync = NULL
WHERE name = 'Lanaa';

-- Then trigger the cron job or manual sync
```

### Step 3: Check Fanvue API Directly

```bash
# Manually fetch transactions from Fanvue API
curl "https://api.fanvue.com/v1/transactions?limit=100" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Immediate Fix Options

### Option 1: Add Manual Sync Button (RECOMMENDED)

Add a button to the dashboard that calls `/api/fanvue/force-sync-revenue`:

```tsx
<Button
  onClick={async () => {
    const res = await fetch(`/api/fanvue/force-sync-revenue?modelId=${selectedModel.id}`, {
      method: 'POST',
    })
    if (res.ok) {
      toast.success('Revenue synced!')
      refreshData()
    }
  }}
>
  Force Sync Revenue
</Button>
```

### Option 2: Reset Sync Cursor via SQL

Run `scripts/fix-revenue-calculation.sql` in Supabase dashboard

### Option 3: Debug Cron Job

Check Vercel logs to see if the cron job is running:

```bash
vercel logs --follow
```

## Next Steps

1. **Add manual sync button** to dashboard (quick win)
2. **Check Supabase logs** for failed sync attempts
3. **Verify Fanvue API** is returning all transactions
4. **Run diagnostic SQL** to compare DB vs expected values

---

**Generated:** 2026-02-04
**Status:** Awaiting user input on preferred fix approach

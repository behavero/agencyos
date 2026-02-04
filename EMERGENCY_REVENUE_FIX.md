# 🚨 Emergency Revenue Fix

## Problem

Revenue showing $5,093 instead of $13k+ (data not syncing correctly)

## Quick Fix (1-Click Solution)

### Option 1: Use the API Endpoint

```bash
curl -X POST "https://onyxos.vercel.app/api/debug/fix-revenue?modelId=YOUR_MODEL_ID"
```

Replace `YOUR_MODEL_ID` with Lanaa's model ID from the dashboard.

### Option 2: SQL Direct Fix (If API fails)

Run this in Supabase SQL Editor:

```sql
-- 1. Check current revenue
SELECT
  name,
  revenue_total as "Current Revenue in DB",
  (SELECT SUM(amount) FROM fanvue_transactions WHERE model_id = models.id) as "Calculated from Transactions"
FROM models
WHERE name ILIKE '%lanaa%';

-- 2. If discrepancy found, force recalculation
UPDATE models
SET revenue_total = (
  SELECT COALESCE(SUM(amount), 0)
  FROM fanvue_transactions
  WHERE model_id = models.id
),
updated_at = NOW()
WHERE name ILIKE '%lanaa%';

-- 3. Verify fix
SELECT name, revenue_total FROM models WHERE name ILIKE '%lanaa%';
```

## What Caused This?

1. **Stale Sync Cursor:** The `last_transaction_sync` timestamp got stuck, preventing new transactions from being fetched.
2. **Missing Transactions:** Some transactions from Fanvue API weren't imported to `fanvue_transactions` table.
3. **Cache Issue:** The dashboard was showing cached data.

## Prevention

The **Revenue Heartbeat** (Vercel Cron) runs every 10 minutes to prevent this:

- `/api/cron/revenue-heartbeat` - Auto-syncs transactions
- Updates `models.revenue_total` in real-time
- Shows green "Live" indicator when data is fresh

## If Revenue is STILL Wrong After Fix

1. **Check Fanvue API Connection:**

   ```bash
   curl -X GET "https://onyxos.vercel.app/api/fanvue/diagnose-revenue?modelId=YOUR_MODEL_ID"
   ```

2. **Force Full Re-Sync:**
   - Go to Dashboard
   - Click "Sync Agency" dropdown
   - Select "🔴 Force Full Sync"
   - Wait 30-60 seconds
   - Refresh page

3. **Manual Transaction Import:**

   ```sql
   -- Clear old transactions (DANGER: This deletes data!)
   DELETE FROM fanvue_transactions WHERE model_id = 'YOUR_MODEL_ID';

   -- Reset sync cursor to force full re-fetch
   UPDATE models
   SET last_transaction_sync = NULL
   WHERE id = 'YOUR_MODEL_ID';
   ```

## Support

If nothing works, contact support with:

- Model name: "Lanaa"
- Expected revenue: "$13k+"
- Current showing: "$5,093"
- Fanvue API connection status
- Last sync timestamp

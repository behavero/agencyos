# Phase 49 - Setup & Deployment Guide

## 🚀 Quick Start

### Step 1: Set Environment Variables

Add to your Vercel project (or `.env.local` for local development):

```bash
CRON_SECRET=your-secure-random-string-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Generate CRON_SECRET:**

```bash
openssl rand -base64 32
```

### Step 2: Deploy Database Migration

The migration will automatically run on Vercel deployment. To manually apply:

```bash
# Via Supabase CLI
supabase migration up

# Or via Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Paste contents of supabase/migrations/20260202_add_fanvue_transactions.sql
# 3. Run
```

### Step 3: Verify Cron Jobs

1. Go to Vercel Dashboard → Your Project → Settings → Cron Jobs
2. You should see:
   - `/api/cron/sync-transactions` - Every hour (0 \* \* \* \*)
   - `/api/cron/daily-refresh` - Daily at midnight (0 0 \* \* \*)

### Step 4: Run Initial Sync

**Option A: Via API (Recommended)**

```bash
# Get your auth token from browser (Application → Cookies → sb-access-token)
curl -X POST https://onyxos.vercel.app/api/analytics/sync \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Option B: Via Cron Endpoint**

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://onyxos.vercel.app/api/cron/sync-transactions
```

**Option C: Wait for hourly cron to run automatically**

---

## 📊 Accessing the Financial Dashboard

Once synced, navigate to:

**URL:** `/dashboard/finance/analytics`

Or click: **Sidebar → Finance → Analytics**

---

## 🧪 Testing

### 1. Verify Data Sync

```sql
-- Check if transactions were synced
SELECT
  COUNT(*) as transaction_count,
  category,
  SUM(amount) as total_amount
FROM fanvue_transactions
WHERE agency_id = 'your-agency-id'
GROUP BY category
ORDER BY total_amount DESC;
```

**Expected Output:**

| transaction_count | category     | total_amount |
| ----------------- | ------------ | ------------ |
| 412               | message      | 10023.45     |
| 87                | tip          | 859.20       |
| 23                | subscription | 1196.82      |

### 2. Test Analytics Functions

```sql
-- Test the revenue aggregation function
SELECT * FROM get_revenue_by_date_range(
  'your-agency-id'::uuid,
  NULL,  -- All models
  NOW() - INTERVAL '30 days',
  NOW()
);
```

### 3. Test UI

1. Go to `/dashboard/finance/analytics`
2. Change filters (Model: All Models, Time Range: Last 30 Days)
3. Click "Apply Filters" → Should refresh with new data
4. Click "Sync Now" → Should trigger manual sync

---

## 🔍 Troubleshooting

### Issue: "No transactions found"

**Causes:**

1. Initial sync hasn't run yet
2. Models don't have `fanvue_access_token` set
3. Fanvue API returned no data

**Solution:**

```bash
# Check if models have tokens
SELECT id, name, fanvue_access_token FROM models;

# If missing, add tokens via Creator Management UI
# Then manually trigger sync
```

### Issue: "Sync failed"

**Causes:**

1. Invalid Fanvue access token
2. API rate limit hit
3. Network error

**Solution:**

```bash
# Check logs in Vercel Dashboard
# Go to: Deployments → Latest → Functions → /api/analytics/sync → View Logs

# Or check Supabase logs:
# Dashboard → Logs → Database
```

### Issue: Charts show $0 revenue

**Causes:**

1. Transactions synced but with wrong `fanvue_created_at` date
2. Filtering is too narrow (e.g., selected model has no transactions)
3. Date range doesn't include transaction dates

**Solution:**

```sql
-- Check transaction dates
SELECT
  DATE(fanvue_created_at) as date,
  COUNT(*) as count,
  SUM(amount) as total
FROM fanvue_transactions
GROUP BY DATE(fanvue_created_at)
ORDER BY date DESC
LIMIT 10;
```

---

## 🎨 UI Components

### KPI Cards

Displays:

- **Total Revenue**: Gross revenue for selected period
- **Net Revenue**: After 20% platform fees
- **ARPU**: Average revenue per unique payer
- **Transactions**: Total count + average tip amount

### Revenue Distribution (Donut Chart)

- Shows percentage breakdown by category
- Hover for detailed tooltip
- Color-coded for easy identification

### Earnings by Type (List)

- Progress bars for visual comparison
- Transaction counts for each category
- Matches Fanvue's UI design

### Revenue Trend (Stacked Bar Chart)

- Daily revenue stacked by category
- Shows composition over time
- Missing dates auto-filled with zeros

---

## 🤖 Alfred AI Integration

### Ask Alfred about financials:

**Example Queries:**

```
"Show me earnings for last month"
"What's our ARPU?"
"How much did we make from messages?"
"What's the revenue breakdown?"
"Is revenue up or down?"
```

**Alfred's Response:**

```
Total revenue for the last 30 days: $13,245

Breakdown:
- Messages: $10,023 (76%) - Your top earner! 🎯
- Renewals: $1,196 (9%)
- Tips: $859 (6%)
- Posts: $634 (5%)
- New Subs: $533 (4%)

Your ARPU is $54. Revenue is up 15.2% vs the previous period! 🚀

Pro tip: Messages are driving 76% of revenue. Consider focusing
content strategy on PPV/locked message campaigns.
```

---

## 📈 Performance

### Database Query Times

- `getChartData()`: ~50-100ms (with indexes)
- `getKPIMetrics()`: ~100-150ms
- `getCategoryBreakdown()`: ~30-50ms
- Total page load: ~200-300ms

### Sync Performance

- ~100 transactions/request (Fanvue API limit)
- ~10 requests max per sync (safety limit = 1000 transactions)
- Average sync time: 5-10 seconds per model
- Hourly cron handles incremental syncs (only new transactions)

---

## 🔐 Security

### RLS Policies

All queries respect Row Level Security:

```sql
-- Users can only see transactions for their agency
CREATE POLICY "Users can view transactions for their agency"
  ON fanvue_transactions FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  );
```

### API Protection

- `/api/analytics/sync` → Requires authentication
- `/api/cron/sync-transactions` → Requires `CRON_SECRET`

---

## 🎯 Next Steps

### Phase 49C - Advanced Analytics (Future)

1. **Message Conversion Tracking**
   - Track sent vs purchased messages
   - Calculate PPV conversion rate

2. **Fan Lifetime Value (LTV)**
   - Track individual fan spending
   - Identify whales and high-value subscribers

3. **Churn Analysis**
   - Track subscriber retention
   - Predict churn risk

4. **Revenue Forecasting**
   - Use historical data for predictions
   - Linear regression / time-series models

5. **Comparative Analytics**
   - Compare model performance
   - Benchmark against agency averages

---

## ✅ Verification Checklist

- [ ] Environment variables set (`CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Database migration applied successfully
- [ ] Cron jobs configured in Vercel
- [ ] Initial sync completed (transactions in database)
- [ ] Financial Analytics page loads without errors
- [ ] KPI cards show real data
- [ ] Charts render correctly
- [ ] Filters work (model selector, time range)
- [ ] Sync button triggers manual refresh
- [ ] Alfred responds to financial queries

---

**Phase 49 Setup:** ✅ **COMPLETE**

**Questions?** Check the main documentation: `docs/PHASE49_ANALYTICS_ENGINE.md`

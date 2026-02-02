# PHASE 54 - QUICK REFERENCE GUIDE

## 🎯 What Changed?

**Before:** Analytics at `/dashboard/finance/analytics` with empty graphs  
**After:** Analytics in `/dashboard` → Fanvue tab with working graphs

---

## 📍 Where to Find It

1. Navigate to `/dashboard`
2. Click **"💰 Fanvue & Finance"** tab
3. Scroll to top to see:
   - Revenue Over Time chart (left, 4 columns)
   - Earnings Breakdown list (right, 3 columns)
   - 4 KPI cards below

---

## 🔧 How to Sync Data

### Method 1: API Endpoint

```bash
curl -X POST http://localhost:3000/api/analytics/sync \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Method 2: Browser Console

```javascript
fetch('/api/analytics/sync', {
  method: 'POST',
  body: JSON.stringify({}),
})
  .then(r => r.json())
  .then(console.log)
```

### Method 3: Cron Job (Production)

- Endpoint: `/api/cron/sync-transactions`
- Already configured in Vercel
- Runs every 6 hours automatically

---

## 🐛 Troubleshooting

### Empty Graphs?

**Check 1: Do you have transactions?**

```sql
SELECT COUNT(*) FROM fanvue_transactions WHERE agency_id = 'YOUR_ID';
```

**Check 2: Do you have Fanvue tokens?**

```sql
SELECT name, fanvue_access_token IS NOT NULL as has_token
FROM models WHERE agency_id = 'YOUR_ID';
```

**Check 3: Run verification script**

```bash
# In Supabase SQL Editor
scripts/verify-phase54.sql
```

**Check 4: Seed test data**

```bash
# In Supabase SQL Editor (update IDs first!)
scripts/seed-phase54-test-data.sql
```

---

## 📊 Component Usage

### RevenueChart

```tsx
import { RevenueChart } from '@/components/dashboard/charts/revenue-chart'
import { getChartData } from '@/lib/services/analytics-engine'

const data = await getChartData(agencyId, { timeRange: '30d' })
<RevenueChart data={data} />
```

### EarningsBreakdown

```tsx
import { EarningsBreakdown } from '@/components/dashboard/finance/earnings-breakdown'
import { getCategoryBreakdown } from '@/lib/services/analytics-engine'

const data = await getCategoryBreakdown(agencyId, { timeRange: '30d' })
<EarningsBreakdown data={data} currency="USD" />
```

---

## 🎨 Color Codes

```typescript
const CATEGORY_COLORS = {
  Subscription: '#a3e635', // Lime
  Tip: '#22d3ee', // Cyan
  Message: '#a855f7', // Purple
  Post: '#f59e0b', // Amber
  Renewal: '#10b981', // Emerald
  Referral: '#ec4899', // Pink
  Other: '#6b7280', // Gray
}
```

---

## 📁 Key Files

### New Components

- `src/components/dashboard/charts/revenue-chart.tsx`
- `src/components/dashboard/finance/earnings-breakdown.tsx`

### Modified Files

- `src/app/dashboard/page.tsx` - Data fetching
- `src/app/dashboard/dashboard-client.tsx` - UI integration
- `src/lib/services/transaction-syncer.ts` - Date fix

### Deleted Files

- `src/app/dashboard/finance/analytics/page.tsx` ❌
- `src/app/dashboard/finance/analytics/analytics-client.tsx` ❌

---

## 🔍 Database Queries

### Check Transaction Count

```sql
SELECT
  COUNT(*) as total,
  MIN(fanvue_created_at) as earliest,
  MAX(fanvue_created_at) as latest
FROM fanvue_transactions
WHERE agency_id = 'YOUR_AGENCY_ID';
```

### View Category Breakdown

```sql
SELECT
  category,
  COUNT(*) as count,
  SUM(amount)::numeric(10,2) as total
FROM fanvue_transactions
WHERE agency_id = 'YOUR_AGENCY_ID'
GROUP BY category
ORDER BY total DESC;
```

### Test RPC Function

```sql
SELECT * FROM get_revenue_by_date_range(
  'YOUR_AGENCY_ID'::uuid,
  NULL,
  NOW() - INTERVAL '30 days',
  NOW()
);
```

---

## ⚡ Quick Commands

### Build

```bash
npm run build
```

### Dev Server

```bash
npm run dev
```

### Lint

```bash
npm run lint
```

### Type Check

```bash
npx tsc --noEmit
```

---

## 📝 Notes

- Charts use `fanvue_created_at` (not `created_at`) for accurate dates
- Empty states show helpful messages
- All currency formatting uses agency's currency setting
- RPC function automatically fills missing dates with zeros
- Data is fetched server-side for optimal performance

---

## 🚀 Next Steps

1. **Sync your data:** Run `/api/analytics/sync`
2. **View dashboard:** Navigate to `/dashboard` → Fanvue tab
3. **Verify charts:** Should show 30 days of data
4. **Enable auto-sync:** Already configured via cron

---

## 📞 Support

If you encounter issues:

1. Run `scripts/verify-phase54.sql` in Supabase
2. Check browser console for errors
3. Verify Fanvue API tokens are valid
4. Try seeding test data with `scripts/seed-phase54-test-data.sql`

---

**Phase 54 Complete!** 🎉  
Unified dashboard with working Fanvue analytics.

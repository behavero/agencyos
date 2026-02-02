# 🔄 AUTO-SYNC SETUP GUIDE

**Mission:** Keep your dashboard data fresh with automatic Fanvue syncing.

---

## 🎯 CURRENT AUTO-SYNC STATUS

### ✅ **Configured:**

- **Transaction Sync:** Every 4 hours (0, 4, 8, 12, 16, 20)
- **Model Stats Refresh:** Daily at 1 AM UTC
- **Deployment:** Live on Vercel

### 📊 **What Gets Synced:**

**Every 4 Hours (Transaction Sync):**

- All earnings from Fanvue API
- Revenue by category (subscriptions, tips, messages, posts)
- Transaction dates and amounts
- Net revenue after platform fees

**Daily at 1 AM (Model Stats):**

- Subscriber counts
- Follower counts
- Unread message counts
- Avatar and profile updates
- Total revenue calculations

---

## 🚀 SETUP INSTRUCTIONS

### Step 1: Verify Fanvue Connection

**Check if you have models connected:**

1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/gcfinlqhodkbnqeidksp
2. Run: `scripts/check-fanvue-connections.sql`
3. Look for "✅ Ready to sync" status

**If no models connected:**

1. Go to: https://onyxos.vercel.app/dashboard
2. Click **"Add Model"** button
3. Authorize with Fanvue OAuth
4. Wait for redirect back to dashboard

---

### Step 2: Trigger Initial Sync

**Option A: Browser Console (Easiest)**

```javascript
// Login to dashboard first, then open console (F12) and run:
fetch('/api/analytics/sync', {
  method: 'POST',
  body: JSON.stringify({}),
})
  .then(r => r.json())
  .then(console.log)
```

**Option B: Using Script (Requires CRON_SECRET)**

```bash
# Set your cron secret first
export CRON_SECRET='your-cron-secret-from-vercel'

# Run the sync script
./scripts/force-sync-fanvue.sh
```

**Option C: API Call (Requires Auth)**

```bash
curl -X POST https://onyxos.vercel.app/api/analytics/sync \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -d '{}'
```

---

### Step 3: Verify Data Appears

1. **Refresh Dashboard:** https://onyxos.vercel.app/dashboard
2. **Navigate to:** "💰 Fanvue & Finance" tab
3. **Check:**
   - Revenue Over Time chart should show bars
   - Earnings Breakdown should list categories
   - KPI cards should show non-zero values

**If still empty:**

```sql
-- Check transaction count in Supabase
SELECT COUNT(*) FROM fanvue_transactions;

-- Check last sync time
SELECT MAX(synced_at) FROM fanvue_transactions;
```

---

## 🔧 CRON JOB CONFIGURATION

### Current Schedule (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-transactions",
      "schedule": "0 */4 * * *" // Every 4 hours
    },
    {
      "path": "/api/cron/daily-refresh",
      "schedule": "0 1 * * *" // Daily at 1 AM
    }
  ]
}
```

### Change Sync Frequency

**To sync every 2 hours:**

```json
"schedule": "0 */2 * * *"
```

**To sync every hour:**

```json
"schedule": "0 * * * *"
```

**To sync every 30 minutes:**

```json
"schedule": "*/30 * * * *"
```

After changing, commit and push:

```bash
git add vercel.json
git commit -m "Update sync frequency"
git push origin main
```

---

## 🐛 TROUBLESHOOTING

### Issue 1: No Data After Sync

**Diagnosis:**

```sql
-- Check if models are connected
SELECT COUNT(*) FROM models WHERE fanvue_access_token IS NOT NULL;

-- Check if sync ran
SELECT MAX(synced_at) FROM fanvue_transactions;
```

**Solutions:**

1. Verify Fanvue OAuth tokens are valid
2. Check Vercel function logs: https://vercel.com/behaveros-projects/agencyos-react
3. Re-authorize model: Go to dashboard → Add Model
4. Check Fanvue API status: https://api.fanvue.com/docs

---

### Issue 2: Cron Not Running

**Check Vercel Cron:**

1. Go to: https://vercel.com/behaveros-projects/agencyos-react/settings/cron
2. Verify crons are enabled
3. Check execution logs

**Manual Trigger:**

```bash
# Trigger sync manually (requires CRON_SECRET)
curl -X GET https://onyxos.vercel.app/api/cron/sync-transactions \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

### Issue 3: Stale Data

**Force Immediate Sync:**

```bash
# Option 1: Use script
./scripts/force-sync-fanvue.sh

# Option 2: Browser console
fetch('/api/analytics/sync', { method: 'POST', body: '{}' })
  .then(r => r.json())
  .then(console.log)
```

---

### Issue 4: Sync Errors

**Check Logs:**

```bash
# View Vercel logs
vercel logs agencyos-react --follow

# Or in Vercel Dashboard
https://vercel.com/behaveros-projects/agencyos-react/logs
```

**Common Errors:**

- **401 Unauthorized:** Fanvue token expired → Re-authorize model
- **429 Rate Limit:** Too many requests → Wait 1 hour
- **500 Server Error:** Check Supabase connection

---

## 📊 MONITORING

### Dashboard Indicators

**Good Status:**

- ✅ Charts show data
- ✅ KPI cards have values
- ✅ Transaction counts > 0
- ✅ Last sync < 4 hours ago

**Needs Attention:**

- ⚠️ Empty charts
- ⚠️ All values = $0
- ⚠️ Last sync > 6 hours ago
- ⚠️ No transaction growth

### Check Sync Health

```sql
-- Run in Supabase SQL Editor
SELECT
  name as model,
  stats_updated_at as last_model_update,
  (SELECT MAX(synced_at) FROM fanvue_transactions WHERE model_id = models.id) as last_transaction_sync,
  (SELECT COUNT(*) FROM fanvue_transactions WHERE model_id = models.id) as transaction_count
FROM models
WHERE fanvue_access_token IS NOT NULL;
```

---

## 🎯 BEST PRACTICES

### 1. Regular Monitoring

- Check dashboard daily
- Verify charts update
- Monitor transaction counts

### 2. Token Management

- Re-authorize models every 90 days
- Keep refresh tokens secure
- Monitor auth errors in logs

### 3. Performance Optimization

- Sync frequency: 4 hours (balanced)
- Avoid over-syncing (rate limits)
- Use pagination for large datasets

### 4. Data Quality

- Verify date accuracy
- Check category mapping
- Monitor for duplicates

---

## 🚀 AUTOMATION CHECKLIST

- [x] Cron jobs configured in vercel.json
- [x] Transaction sync: Every 4 hours
- [x] Model stats refresh: Daily
- [x] Deployed to Vercel
- [ ] Fanvue models connected (YOUR ACTION)
- [ ] Initial sync completed (YOUR ACTION)
- [ ] Dashboard data verified (YOUR ACTION)

---

## 📞 SUPPORT

### Scripts

- `scripts/check-fanvue-connections.sql` - Diagnose issues
- `scripts/force-sync-fanvue.sh` - Manual sync
- `scripts/seed-phase54-test-data.sql` - Test data

### Endpoints

- Sync Transactions: `/api/cron/sync-transactions`
- Refresh Models: `/api/cron/daily-refresh`
- Manual Sync: `/api/analytics/sync`

### Resources

- Vercel Dashboard: https://vercel.com/behaveros-projects/agencyos-react
- Supabase Dashboard: https://supabase.com/dashboard/project/gcfinlqhodkbnqeidksp
- Fanvue API Docs: https://api.fanvue.com/docs

---

## 🎉 SUCCESS CRITERIA

Your auto-sync is working when:

1. ✅ Dashboard shows real data
2. ✅ Charts update every 4 hours
3. ✅ New transactions appear automatically
4. ✅ Model stats refresh daily
5. ✅ No manual intervention needed

**Current Status:** 🟡 Configured, awaiting initial sync

---

**Next Action:** Connect your first Fanvue model and trigger the initial sync!

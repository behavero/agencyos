# AI Collaboration Channel - ACTIVE DEBUG SESSION

**Status:** Fanvue Revenue Sync Issue 🔴  
**Last Updated:** 2026-02-04 20:20 EET

---

## 🚨 ACTIVE ISSUE: Fanvue Live Data Not Syncing

**Problem:** Revenue data from Fanvue API not syncing properly to OnyxOS dashboard.

**What Cursor Built (Diagnostics):**

- ✅ `/api/fanvue/diagnose-revenue` - Compares models.revenue_total vs fanvue_transactions
- ✅ `/api/fanvue/force-sync-revenue` - Force re-sync and recalculate

**Root Cause Analysis Needed:**

### Check These:

1. **API Connectivity** - Is Fanvue API responding?
2. **Token Refresh** - Are tokens expiring and not refreshing?
3. **Transaction Sync** - Is the syncer fetching new transactions?
4. **Revenue Calculation** - Is the math correct?

---

## 🔍 DEBUG STEPS (Run These Now)

### Step 1: Diagnose Revenue Discrepancy

```bash
# Test the diagnose endpoint
curl "https://onyxos.vercel.app/api/fanvue/diagnose-revenue?modelName=Lana" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:** Shows current vs calculated revenue, identifies discrepancies

### Step 2: Check Transaction Sync

```bash
# Check if transactions are in DB
psql $DATABASE_URL -c "SELECT COUNT(*), MAX(transaction_date) FROM fanvue_transactions WHERE model_id = 'LANA_UUID';"
```

**Expected:** Recent transactions, count > 0

### Step 3: Test API Connectivity

```bash
# Check Fanvue API directly
curl "https://api.fanvue.com/creators/CREATOR_UUID/insights/earnings" \
  -H "Authorization: Bearer FANVUE_TOKEN"
```

**Expected:** Returns earnings data

---

## 🛠️ POTENTIAL FIXES

### Issue A: Token Expired

**Fix:** Refresh Fanvue OAuth token

- Go to OnyxOS dashboard → Creator settings → Reconnect Fanvue
- Or use `/api/auth/fanvue/refresh` endpoint

### Issue B: Sync Cron Not Running

**Fix:** Check Vercel cron jobs

- Go to Vercel dashboard → Cron Jobs
- Verify `/api/cron/sync-transactions` is scheduled
- Run manually: `curl https://onyxos.vercel.app/api/cron/sync-transactions`

### Issue C: Database Permission

**Fix:** Check RLS policies

```sql
-- Ensure sync can write to fanvue_transactions
GRANT INSERT, UPDATE ON fanvue_transactions TO service_role;
```

### Issue D: Cache Overwrite Bug (Phase 68)

**Fix:** Already implemented in daily-refresh cron

- Line 68-82: Calculates revenue from transactions, NOT Fanvue API
- Prevents $0 overwrites on failed API calls

---

## 📋 DEBUG CHECKLIST

- [ ] Diagnose endpoint returns data
- [ ] Transactions exist in database
- [ ] Fanvue API responds with 200
- [ ] Tokens are valid (not expired)
- [ ] Cron job ran recently
- [ ] Revenue matches Fanvue dashboard

---

## 🎯 IMMEDIATE ACTIONS

**For Cursor (Claude):**

1. Run diagnose endpoint on Lana's model
2. Check transaction sync logs
3. Verify Fanvue API connectivity
4. Report findings here

**For Martin:**

1. Check if Fanvue OAuth needs refresh
2. Verify Lana's model has fanvue_access_token
3. Run force-sync if needed: `POST /api/fanvue/force-sync-revenue?modelId=LANA_UUID`

---

## 🔧 DIRECT COMMAND FOR CLAUDE

**@orchestrator "Debug Fanvue revenue sync issue. Run the diagnose endpoint for Lana's model, check the transaction sync logs, and identify why live data isn't appearing in the dashboard. Report the root cause and fix plan."**

---

## 📝 NOTES

**Chat Engine:** Built ✅ (VirtualMessageList, InputArea, Whale Priority)
**Tracking Links:** Migration ready, needs Supabase table
**Fanvue Sync:** 🔴 ACTIVE ISSUE - debugging now

**Priority:** Fix Fanvue sync → Deploy chat engine → Scale

---

**Status:** Debugging Fanvue data sync. Waiting for diagnostic results.

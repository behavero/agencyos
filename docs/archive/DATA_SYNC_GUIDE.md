# 🔄 DATA SYNC GUIDE - KEEP YOUR DASHBOARD FRESH

**Problem:** Your dashboard shows $0 because Fanvue data hasn't been synced yet.  
**Solution:** Use the **"Sync Fanvue Data"** button! 🎉

---

## 🚀 QUICK START (3 STEPS)

### Step 1: Connect Fanvue Model

1. Go to: https://onyxos.vercel.app/dashboard
2. Click **"Add Model"** button (top right)
3. Authorize with your Fanvue account
4. Wait for redirect back to dashboard

### Step 2: Click "Sync Fanvue Data"

1. Look for the **"Sync Fanvue Data"** button (next to "Add Model")
2. Click it
3. Wait for "✅ Synced X transactions!" notification
4. Dashboard will auto-refresh

### Step 3: View Your Data

1. Navigate to **"💰 Fanvue & Finance"** tab
2. Scroll to top
3. See your beautiful charts! 📊

---

## 🔄 SYNC OPTIONS

### Option 1: Manual Sync Button (EASIEST) ⭐

**Where:** Dashboard header, next to "Add Model"  
**When:** Anytime you want fresh data  
**How:**

1. Click **"Sync Fanvue Data"** button
2. Wait 5-10 seconds
3. Dashboard auto-refreshes with new data

**Perfect for:**

- Checking latest earnings
- After posting new content
- Before important meetings
- Whenever you want up-to-date numbers

---

### Option 2: Automatic Daily Sync 🌙

**When:** Every night at midnight UTC  
**What:** Syncs all transactions automatically  
**Status:** ✅ Already configured

**You don't need to do anything!** Just wake up to fresh data.

**Note:** Vercel Hobby plan limits to daily sync. For more frequent auto-sync (every 4 hours), upgrade to Pro plan.

---

### Option 3: Browser Console (Advanced)

**When:** Manual sync alternative  
**How:**

1. Login to dashboard
2. Press `F12` to open console
3. Run:

```javascript
fetch('/api/analytics/sync', {
  method: 'POST',
  body: JSON.stringify({}),
})
  .then(r => r.json())
  .then(console.log)
```

4. Refresh page

---

## 📊 WHAT GETS SYNCED

### Transaction Data

- ✅ All earnings from Fanvue
- ✅ Subscriptions, tips, messages, posts
- ✅ Gross & net revenue
- ✅ Transaction dates & counts
- ✅ Fan information

### Model Stats

- ✅ Subscriber counts
- ✅ Follower counts
- ✅ Unread messages
- ✅ Profile updates
- ✅ Avatar changes

---

## 🐛 TROUBLESHOOTING

### "No data available yet"

**Cause:** No Fanvue models connected  
**Solution:**

1. Click "Add Model" button
2. Authorize Fanvue OAuth
3. Click "Sync Fanvue Data"

---

### "Sync failed" error

**Possible causes:**

1. **Fanvue token expired**
   - Solution: Re-add model via "Add Model" button

2. **No internet connection**
   - Solution: Check your connection and try again

3. **Fanvue API down**
   - Solution: Wait 10 minutes and try again

---

### Sync button stuck on "Syncing..."

**Solution:**

1. Wait 30 seconds
2. Refresh page
3. Try again

---

### Charts still empty after sync

**Check in Supabase SQL Editor:**

```sql
-- Check if transactions were synced
SELECT COUNT(*) FROM fanvue_transactions;

-- If 0, check if model is connected
SELECT COUNT(*) FROM models WHERE fanvue_access_token IS NOT NULL;
```

**If no models:** Click "Add Model"  
**If no transactions:** Run diagnostic script: `scripts/check-fanvue-connections.sql`

---

## ⚡ PRO TIPS

### 1. Sync After Big Sales Days

Made a lot of sales? Click sync to see updated charts immediately!

### 2. Sync Before Reports

Need to share numbers with your team? Sync first for latest data.

### 3. Daily Morning Routine

- Auto-sync ran overnight ✅
- Just refresh dashboard to see yesterday's earnings

### 4. Multiple Models

Sync button syncs ALL connected models at once!

---

## 🎯 SYNC FREQUENCY RECOMMENDATIONS

### Hobby Plan (Current)

- **Auto:** Daily at midnight
- **Manual:** Anytime via button
- **Recommended:** Click sync button when you need fresh data

### Pro Plan (Upgrade)

- **Auto:** Every 4 hours
- **Manual:** Anytime via button
- **Benefit:** Always fresh data, no manual clicks needed

**Upgrade Link:** https://vercel.com/behaveros-projects/agencyos-react/settings/billing

---

## 📱 MOBILE SYNC

The sync button works on mobile too!

1. Open dashboard on phone
2. Tap "☰" menu
3. Tap "Sync Fanvue Data"
4. Wait for notification
5. Refresh page

---

## 🔐 SECURITY

**Your data is safe:**

- ✅ OAuth tokens encrypted in database
- ✅ Sync API requires authentication
- ✅ No passwords stored
- ✅ Fanvue API uses HTTPS
- ✅ Automatic token refresh

**Never share:**

- ❌ Your Fanvue password
- ❌ Access tokens
- ❌ API keys

---

## 📊 SYNC STATUS INDICATORS

### Good Status ✅

- Charts show data
- KPI cards have values
- "Last sync: X minutes ago"
- Transaction count > 0

### Needs Sync ⚠️

- Empty charts
- All values = $0
- "No data available yet"
- "Sync your Fanvue transactions"

### Error Status ❌

- "Sync failed" message
- Red error notifications
- Cron job failures in logs

---

## 🎉 SUCCESS CHECKLIST

- [ ] Fanvue model connected
- [ ] Clicked "Sync Fanvue Data" button
- [ ] Saw "✅ Synced X transactions!" notification
- [ ] Charts display in Fanvue tab
- [ ] KPI cards show non-zero values
- [ ] Daily auto-sync configured ✅

---

## 📞 NEED HELP?

### Documentation

- **Full Setup:** `AUTO_SYNC_SETUP.md`
- **Diagnostics:** `scripts/check-fanvue-connections.sql`
- **Force Sync:** `scripts/force-sync-fanvue.sh`

### Quick Checks

1. **Models connected?**

   ```sql
   SELECT COUNT(*) FROM models WHERE fanvue_access_token IS NOT NULL;
   ```

2. **Transactions synced?**

   ```sql
   SELECT COUNT(*) FROM fanvue_transactions;
   ```

3. **Last sync time?**
   ```sql
   SELECT MAX(synced_at) FROM fanvue_transactions;
   ```

---

## 🎯 REMEMBER

**The "Sync Fanvue Data" button is your friend!**

Click it anytime you want fresh data. It's:

- ✅ Fast (5-10 seconds)
- ✅ Safe (doesn't break anything)
- ✅ Unlimited (click as many times as you want)
- ✅ Easy (one click, that's it!)

---

**Your dashboard is now ready for real-time Fanvue insights!** 🚀

# Phase 50 & 50B Deployment Guide

## 🚀 Quick Deployment Checklist

- [ ] Run database migrations
- [ ] Verify tables created
- [ ] Sync Fanvue Vault content
- [ ] Calculate initial ROI
- [ ] Test Best Sellers widget
- [ ] Test Alfred AI recommendations

---

## Step 1: Run Database Migrations

You need to apply **2 migrations** for Phase 50:

### **Option A: Via Supabase CLI (Recommended)**

```bash
# Navigate to project directory
cd /Volumes/KINGSTON/agencyos-react

# Run migrations
supabase migration up

# Verify migrations applied
supabase migration list
```

**Expected Output:**

```
✓ Applied migration 20260202_add_vault_performance.sql
✓ Applied migration 20260202_add_fanvue_vault_fields.sql
```

---

### **Option B: Via Supabase Dashboard (Manual)**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Click **"+ New Query"**

**Run Migration 1:**

```sql
-- Paste contents of: supabase/migrations/20260202_add_vault_performance.sql
-- Then click "Run"
```

**Run Migration 2:**

```sql
-- Paste contents of: supabase/migrations/20260202_add_fanvue_vault_fields.sql
-- Then click "Run"
```

---

## Step 2: Verify Database Setup

Run this query to confirm everything is created:

```sql
-- Check if vault_performance table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'vault_performance'
) as vault_performance_exists;

-- Check if fanvue_vault_fields were added
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'content_assets'
  AND column_name IN ('fanvue_media_uuid', 'fanvue_folder');

-- Check if functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('update_asset_performance', 'get_best_sellers');
```

**Expected Results:**

- `vault_performance_exists: true`
- 2 columns returned (fanvue_media_uuid, fanvue_folder)
- 2 functions returned (update_asset_performance, get_best_sellers)

---

## Step 3: Sync Fanvue Vault (First Time Setup)

### **Option A: Via UI (Easiest)**

1. Navigate to https://onyxos.vercel.app/dashboard/content/vault
2. Click **"Sync from Fanvue"** button
3. Wait for toast notification: "Synced X assets from Fanvue Vault"
4. Page will auto-reload to show imported content

---

### **Option B: Via API**

```bash
# Get your auth token from browser:
# 1. Open DevTools (F12)
# 2. Go to Application tab
# 3. Cookies → sb-access-token
# 4. Copy the value

curl -X POST https://onyxos.vercel.app/api/vault/sync-fanvue \
  -H "Authorization: Bearer YOUR_SB_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Synced 47 assets from Fanvue Vault",
  "assetsSynced": 47,
  "errors": []
}
```

**Verify Assets Imported:**

```sql
SELECT
  file_name,
  fanvue_folder,
  fanvue_media_uuid,
  created_at
FROM content_assets
WHERE fanvue_media_uuid IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

---

## Step 4: Calculate Initial ROI

### **Option A: Via UI**

1. Navigate to `/dashboard/content/vault`
2. Click **"Calculate ROI"** button
3. Wait for toast: "Calculated ROI for X assets"

---

### **Option B: Via API**

```bash
curl -X POST https://onyxos.vercel.app/api/vault/calculate-roi \
  -H "Authorization: Bearer YOUR_SB_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Calculated ROI for 47 assets",
  "assetsUpdated": 47,
  "totalRevenue": 0,
  "errors": []
}
```

**Note:** Initial ROI will be $0 because you haven't sent content yet. This is expected!

---

### **Seed Test Data (Optional)**

If you want to see the system working immediately with demo data:

```sql
-- Insert test performance data for 3 assets
DO $$
DECLARE
  asset_record RECORD;
  test_count INT := 0;
BEGIN
  FOR asset_record IN
    SELECT id, agency_id
    FROM content_assets
    LIMIT 3
  LOOP
    INSERT INTO vault_performance (
      asset_id,
      agency_id,
      times_sent,
      times_unlocked,
      total_revenue,
      revenue_from_ppv,
      last_sent_at,
      last_sold_at
    ) VALUES (
      asset_record.id,
      asset_record.agency_id,
      50 - (test_count * 10),  -- Decreasing sends
      25 - (test_count * 5),   -- Decreasing unlocks
      (750 - (test_count * 200))::NUMERIC,  -- Decreasing revenue
      (750 - (test_count * 200))::NUMERIC,
      NOW() - (test_count || ' days')::INTERVAL,
      NOW() - (test_count || ' days')::INTERVAL
    )
    ON CONFLICT (asset_id) DO NOTHING;

    test_count := test_count + 1;
  END LOOP;
END $$;

-- Verify test data
SELECT
  ca.file_name,
  vp.times_sent,
  vp.times_unlocked,
  vp.total_revenue,
  vp.conversion_rate
FROM content_assets ca
JOIN vault_performance vp ON ca.id = vp.asset_id
ORDER BY vp.total_revenue DESC;
```

**Expected Output:**

```
file_name         | times_sent | times_unlocked | total_revenue | conversion_rate
------------------+------------+----------------+---------------+-----------------
blue-dress.mp4    | 50         | 25             | 750.00        | 50.00
gym-selfie.jpg    | 40         | 20             | 550.00        | 50.00
car-video.mp4     | 30         | 15             | 350.00        | 50.00
```

---

## Step 5: Test Best Sellers Widget

1. Navigate to `/dashboard`
2. Scroll to **"Top Performing Content"** widget
3. Verify it shows your top 3 assets (if you added test data)

**If empty:**

- No sales data yet (expected on fresh install)
- Shows empty state: "No sales data yet"

**With test data:**

- Shows ranked assets (🥇🥈🥉)
- Displays revenue and conversion rates
- "Send" buttons work

---

## Step 6: Test Alfred AI

Navigate to `/dashboard/alfred` and try these queries:

### **Query 1: Find Best Content**

```
User: "What should I send to a whale?"

Expected Response:
"For whale fans, I recommend the 'Blue Dress' video! 🔥
Performance:
• $750 total revenue
• 50.0% conversion rate
• Sent 50 times, unlocked 25 times
..."
```

### **Query 2: General Best Content**

```
User: "What's my best content?"

Expected Response:
"Your top performer is the 'Blue Dress' video! 🔥
Stats:
• Total Revenue: $750
• Conversion Rate: 50.0%
..."
```

**If no data:**

```
Expected Response:
"No content performance data yet. Upload assets to the
Vault and start sending them to track performance!"
```

---

## Step 7: Test Vault UI Enhancements

1. Navigate to `/dashboard/content/vault`
2. Verify features work:

**Performance Badges:**

- [ ] Assets show revenue badges (top-left)
- [ ] Conversion rates displayed
- [ ] Color-coded borders (red/green/yellow)
- [ ] Performance ratings (🔥 Hot, ✅ High, etc.)

**Sorting:**

- [ ] "Sort by Revenue" works
- [ ] "Sort by Conversion" works
- [ ] "Most Recent" works

**Cards:**

- [ ] Grid view shows "X sent / Y sold"
- [ ] List view shows "$X revenue • Y% conversion"

---

## 🔧 Troubleshooting

### **Issue: "No assets synced from Fanvue"**

**Causes:**

1. Model doesn't have `fanvue_access_token`
2. Fanvue API rate limit
3. No folders in Fanvue Vault

**Solutions:**

```sql
-- Check if model has token
SELECT id, name, fanvue_access_token FROM models;

-- If missing, add token (get from Fanvue dashboard)
UPDATE models
SET fanvue_access_token = 'YOUR_FANVUE_TOKEN'
WHERE id = 'your-model-id';
```

---

### **Issue: "Calculate ROI shows 0 assets"**

**Cause:** No assets in `content_assets` table

**Solutions:**

1. Upload assets manually via UI
2. Sync from Fanvue Vault
3. Add test data (see Step 4)

---

### **Issue: "Best Sellers widget is empty"**

**Causes:**

1. No performance data in `vault_performance`
2. No assets with `last_sold_at` in last 7 days

**Solutions:**

```sql
-- Check performance data
SELECT COUNT(*) FROM vault_performance;

-- If 0, run Calculate ROI or add test data

-- Check recent sales
SELECT COUNT(*)
FROM vault_performance
WHERE last_sold_at >= NOW() - INTERVAL '7 days';
```

---

## 📊 Verify Everything Works

Run this comprehensive check:

```sql
-- Full system health check
SELECT
  (SELECT COUNT(*) FROM content_assets) as total_assets,
  (SELECT COUNT(*) FROM content_assets WHERE fanvue_media_uuid IS NOT NULL) as fanvue_assets,
  (SELECT COUNT(*) FROM vault_performance) as tracked_assets,
  (SELECT COUNT(*) FROM vault_performance WHERE total_revenue > 0) as revenue_generating_assets,
  (SELECT COUNT(*) FROM vault_performance WHERE last_sold_at >= NOW() - INTERVAL '7 days') as recent_sellers,
  (SELECT COALESCE(SUM(total_revenue), 0) FROM vault_performance) as total_revenue,
  (SELECT COALESCE(AVG(conversion_rate), 0) FROM vault_performance WHERE times_sent > 0) as avg_conversion_rate;
```

**Expected Results (Fresh Install):**

```
total_assets                 | 0-50 (depends on uploads)
fanvue_assets                | 0-50 (after sync)
tracked_assets               | 0 (until Calculate ROI)
revenue_generating_assets    | 0 (until sales)
recent_sellers               | 0 (until sales)
total_revenue                | 0.00
avg_conversion_rate          | 0.00
```

**Expected Results (With Test Data):**

```
total_assets                 | 3+
fanvue_assets                | 0-50
tracked_assets               | 3
revenue_generating_assets    | 3
recent_sellers               | 3
total_revenue                | 1650.00
avg_conversion_rate          | 50.00
```

---

## ✅ Deployment Verification Checklist

### **Database:**

- [ ] `vault_performance` table created
- [ ] `update_asset_performance()` function exists
- [ ] `get_best_sellers()` function exists
- [ ] `fanvue_media_uuid` column added to `content_assets`
- [ ] `fanvue_folder` column added to `content_assets`

### **API Endpoints:**

- [ ] `POST /api/vault/sync-fanvue` returns 200
- [ ] `POST /api/vault/calculate-roi` returns 200
- [ ] `GET /api/vault/best-sellers` returns 200
- [ ] `GET /api/vault/performance` returns 200

### **UI Features:**

- [ ] "Sync from Fanvue" button appears in Vault
- [ ] "Calculate ROI" button appears in Vault
- [ ] Performance badges show on assets (after calculating ROI)
- [ ] Sort by Revenue/Conversion works
- [ ] Best Sellers widget appears on Dashboard
- [ ] Best Sellers shows top 3 performers (if data exists)

### **Alfred AI:**

- [ ] `find_best_content` tool available
- [ ] Alfred responds to "what should I send" queries
- [ ] Alfred provides revenue and conversion stats

---

## 🎉 Success Criteria

You'll know everything is working when:

1. ✅ Vault shows Fanvue assets with folders tagged
2. ✅ Assets display revenue and conversion badges
3. ✅ Best Sellers widget shows top 3 performers
4. ✅ Alfred recommends specific content with stats
5. ✅ Performance data updates after sending content

---

## 📚 Next Steps After Deployment

### **1. Start Sending Content**

- Use `/dashboard/messages` to send assets
- Each send increments `times_sent`
- Each unlock increments `times_unlocked` and `total_revenue`

### **2. Monitor Performance**

- Check Best Sellers daily
- Sort Vault by Revenue to find winners
- Ask Alfred for recommendations

### **3. Optimize Strategy**

- Use high-conversion assets more frequently
- Retire low-performing content
- Test different content types

### **4. Regular Syncs**

- Sync Fanvue Vault weekly
- Calculate ROI after campaigns
- Track performance trends

---

## 🆘 Need Help?

**Check Logs:**

- Supabase Dashboard → Logs → Database
- Vercel Dashboard → Deployments → Functions → Logs

**Common Commands:**

```bash
# Check migrations status
supabase migration list

# Reset database (WARNING: Deletes all data)
supabase db reset

# View function logs
SELECT * FROM pg_stat_statements WHERE query LIKE '%vault_performance%';

# Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'vault_performance';
```

---

**Deployment Guide Complete!** ✅

If you encounter any issues, check the troubleshooting section or verify your database migrations are applied correctly.

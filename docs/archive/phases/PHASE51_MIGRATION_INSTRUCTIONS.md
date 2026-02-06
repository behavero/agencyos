# Phase 51 Migration Instructions

## Step 1: Apply Migration via Supabase Dashboard

**The migration SQL has been copied to your clipboard!** ✅

### Instructions:

1. **Open Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard/project/iifxqscgbwiwlvbqofcr
   - Navigate to: **SQL Editor** (left sidebar)

2. **Paste and Execute:**
   - Click **"New Query"**
   - Paste the SQL from your clipboard (Cmd+V)
   - Click **"Run"** (or press Cmd+Enter)

3. **Expected Result:**
   ```
   Success. No rows returned
   ```

---

## Step 2: Verify Schema Changes

Copy and run this verification query in the SQL Editor:

```sql
-- Verify all 5 new columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'models'
  AND column_name IN (
    'instagram_handle',
    'twitter_handle',
    'tiktok_handle',
    'agency_split_percentage',
    'fanvue_username'
  )
ORDER BY column_name;
```

**Expected Output:** Should return **5 rows**:

| column_name             | data_type | column_default |
| ----------------------- | --------- | -------------- |
| agency_split_percentage | numeric   | 50.00          |
| fanvue_username         | text      | NULL           |
| instagram_handle        | text      | NULL           |
| tiktok_handle           | text      | NULL           |
| twitter_handle          | text      | NULL           |

---

## Step 3: Check Indexes

```sql
-- Verify indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'models'
  AND indexname LIKE '%handle%'
ORDER BY indexname;
```

**Expected Output:** Should return **4 indexes**:

- `idx_models_instagram_handle`
- `idx_models_twitter_handle`
- `idx_models_tiktok_handle`
- `idx_models_fanvue_username`

---

## Step 4: Test with Sample Data (Optional)

```sql
-- Update an existing model with social handles
UPDATE models
SET
  instagram_handle = 'test_creator',
  twitter_handle = 'test_creator',
  tiktok_handle = 'test_creator',
  agency_split_percentage = 60.00
WHERE id = (SELECT id FROM models LIMIT 1)
RETURNING
  name,
  instagram_handle,
  twitter_handle,
  tiktok_handle,
  agency_split_percentage;
```

---

## Troubleshooting

### If migration fails with "column already exists"

This means the migration was already applied. Run the verification query to confirm.

### If you see constraint violation errors

The `agency_split_percentage` must be between 0 and 100. Default is 50.00.

### If indexes already exist

This is fine - the migration uses `IF NOT EXISTS` so it's safe to re-run.

---

## What This Enables

✅ **Creator Social Linking** - Connect Instagram, Twitter, TikTok accounts
✅ **Revenue Split Tracking** - Configure agency commission percentages
✅ **Fanvue Profile Linking** - Link creator profiles for OAuth flow
✅ **Phase 51 Features** - All Creator Hub features now fully functional

---

## After Migration

Once migration is complete:

1. Visit: https://onyxos.vercel.app/dashboard/creator-management
2. Click "View Details" on any creator
3. Go to "Socials" tab
4. Link social media accounts! 🎉

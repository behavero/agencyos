-- CHECK FANVUE CONNECTIONS & DATA STATUS
-- Run this in Supabase SQL Editor to diagnose sync issues

-- ============================================
-- 1. CHECK MODELS WITH FANVUE TOKENS
-- ============================================
SELECT 
  '1. Models with Fanvue Tokens' as check_name,
  COUNT(*) as total_models,
  COUNT(CASE WHEN fanvue_access_token IS NOT NULL THEN 1 END) as with_tokens,
  COUNT(CASE WHEN fanvue_access_token IS NULL THEN 1 END) as without_tokens,
  CASE 
    WHEN COUNT(CASE WHEN fanvue_access_token IS NOT NULL THEN 1 END) > 0 
    THEN '✅ Ready to sync'
    ELSE '❌ No Fanvue connections - Add models via OAuth'
  END as status
FROM models;

-- ============================================
-- 2. LIST ALL MODELS WITH CONNECTION STATUS
-- ============================================
SELECT 
  '2. Model Connection Details' as section,
  name,
  fanvue_username,
  CASE 
    WHEN fanvue_access_token IS NOT NULL THEN '✅ Connected'
    ELSE '❌ Not connected'
  END as fanvue_status,
  revenue_total,
  subscribers_count,
  stats_updated_at,
  created_at
FROM models
ORDER BY created_at DESC;

-- ============================================
-- 3. CHECK TRANSACTION DATA
-- ============================================
SELECT 
  '3. Transaction Data Status' as check_name,
  COUNT(*) as total_transactions,
  COUNT(DISTINCT model_id) as models_with_data,
  COUNT(DISTINCT category) as categories,
  SUM(amount)::numeric(10,2) as total_revenue,
  MIN(fanvue_created_at)::date as earliest_transaction,
  MAX(fanvue_created_at)::date as latest_transaction,
  MAX(synced_at)::timestamp as last_sync,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Has data'
    WHEN (SELECT COUNT(*) FROM models WHERE fanvue_access_token IS NOT NULL) > 0 
    THEN '⚠️ Models connected but no transactions - Run sync'
    ELSE '❌ No models connected'
  END as status
FROM fanvue_transactions;

-- ============================================
-- 4. RECENT TRANSACTION ACTIVITY
-- ============================================
SELECT 
  '4. Recent Transaction Activity (Last 7 Days)' as section,
  DATE(fanvue_created_at) as date,
  category,
  COUNT(*) as transaction_count,
  SUM(amount)::numeric(10,2) as total_amount
FROM fanvue_transactions
WHERE fanvue_created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(fanvue_created_at), category
ORDER BY date DESC, total_amount DESC
LIMIT 20;

-- ============================================
-- 5. CHECK RPC FUNCTION
-- ============================================
SELECT 
  '5. RPC Function Status' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_revenue_by_date_range')
    THEN '✅ Function exists'
    ELSE '❌ Function missing - Run migration'
  END as status;

-- ============================================
-- 6. TEST RPC FUNCTION (Replace YOUR_AGENCY_ID)
-- ============================================
/*
SELECT 
  '6. RPC Function Test' as section,
  date,
  subscriptions::numeric(10,2),
  tips::numeric(10,2),
  messages::numeric(10,2),
  posts::numeric(10,2),
  total::numeric(10,2)
FROM get_revenue_by_date_range(
  'YOUR_AGENCY_ID'::uuid,  -- REPLACE THIS
  NULL,
  NOW() - INTERVAL '30 days',
  NOW()
)
ORDER BY date DESC
LIMIT 10;
*/

-- ============================================
-- 7. CHECK SYNC TIMESTAMPS
-- ============================================
SELECT 
  '7. Last Sync Times' as section,
  m.name as model,
  m.stats_updated_at as model_stats_last_updated,
  MAX(ft.synced_at) as transactions_last_synced,
  COUNT(ft.id) as transaction_count,
  CASE 
    WHEN MAX(ft.synced_at) > NOW() - INTERVAL '6 hours' THEN '✅ Recently synced'
    WHEN MAX(ft.synced_at) > NOW() - INTERVAL '24 hours' THEN '⚠️ Sync aging'
    WHEN MAX(ft.synced_at) IS NOT NULL THEN '❌ Needs sync'
    ELSE '❌ Never synced'
  END as sync_status
FROM models m
LEFT JOIN fanvue_transactions ft ON ft.model_id = m.id
WHERE m.fanvue_access_token IS NOT NULL
GROUP BY m.id, m.name, m.stats_updated_at
ORDER BY transactions_last_synced DESC NULLS LAST;

-- ============================================
-- SUMMARY & RECOMMENDATIONS
-- ============================================
SELECT 
  '=== SUMMARY & NEXT STEPS ===' as summary,
  (SELECT COUNT(*) FROM models WHERE fanvue_access_token IS NOT NULL) as connected_models,
  (SELECT COUNT(*) FROM fanvue_transactions) as total_transactions,
  (SELECT SUM(amount)::numeric(10,2) FROM fanvue_transactions) as total_revenue,
  CASE 
    WHEN (SELECT COUNT(*) FROM models WHERE fanvue_access_token IS NOT NULL) = 0 
    THEN '❌ ADD MODELS: Go to /dashboard and click "Add Model" to connect Fanvue'
    
    WHEN (SELECT COUNT(*) FROM fanvue_transactions) = 0 
    THEN '⚠️ SYNC NEEDED: Run curl -X POST https://onyxos.vercel.app/api/analytics/sync'
    
    WHEN (SELECT MAX(synced_at) FROM fanvue_transactions) < NOW() - INTERVAL '6 hours'
    THEN '⚠️ OUTDATED: Cron job may not be running. Check Vercel Cron settings.'
    
    ELSE '✅ READY: Dashboard should display data. Refresh if needed.'
  END as recommendation;

-- ============================================
-- QUICK FIXES
-- ============================================
SELECT 
  '=== QUICK FIXES ===' as fixes,
  '1. Add Fanvue Model: https://onyxos.vercel.app/dashboard → Click "Add Model"' as step1,
  '2. Trigger Sync: curl -X POST https://onyxos.vercel.app/api/analytics/sync' as step2,
  '3. Seed Test Data: Run scripts/seed-phase54-test-data.sql' as step3,
  '4. Check Cron: https://vercel.com/behaveros-projects/agencyos-react/settings/cron' as step4;

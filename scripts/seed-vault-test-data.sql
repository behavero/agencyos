-- Seed Test Data for Vault Performance
-- Run this AFTER applying Phase 50 migrations
-- This creates demo content assets with realistic performance metrics

-- ==================================================
-- 1. Create Test Assets (if none exist)
-- ==================================================

DO $$
DECLARE
  v_agency_id UUID;
  v_model_id UUID;
  v_asset_1 UUID;
  v_asset_2 UUID;
  v_asset_3 UUID;
  v_asset_4 UUID;
  v_asset_5 UUID;
BEGIN
  -- Get the first agency and model
  SELECT id INTO v_agency_id FROM agencies LIMIT 1;
  SELECT id INTO v_model_id FROM models LIMIT 1;
  
  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'No agency found. Please create an agency first.';
  END IF;
  
  IF v_model_id IS NULL THEN
    RAISE EXCEPTION 'No model found. Please create a model first.';
  END IF;
  
  -- Create test assets
  INSERT INTO content_assets (
    agency_id,
    model_id,
    file_name,
    file_url,
    thumbnail_url,
    media_type,
    content_type,
    title,
    description,
    tags,
    price
  ) VALUES
  (
    v_agency_id,
    v_model_id,
    'blue-dress-lingerie.mp4',
    'https://example.com/assets/blue-dress.mp4',
    'https://example.com/assets/blue-dress-thumb.jpg',
    'video',
    'ppv',
    '💙 Blue Lingerie Try-On',
    'Exclusive lingerie try-on video in stunning blue',
    ARRAY['lingerie', 'try-on', 'blue', 'exclusive'],
    15.00
  ),
  (
    v_agency_id,
    v_model_id,
    'gym-mirror-selfie.jpg',
    'https://example.com/assets/gym-selfie.jpg',
    'https://example.com/assets/gym-selfie-thumb.jpg',
    'image',
    'ppv',
    '🏋️ Gym Gains Progress',
    'Fresh gym mirror selfie showing progress',
    ARRAY['gym', 'fitness', 'mirror-selfie', 'gains'],
    8.00
  ),
  (
    v_agency_id,
    v_model_id,
    'car-photoshoot.mp4',
    'https://example.com/assets/car-shoot.mp4',
    'https://example.com/assets/car-shoot-thumb.jpg',
    'video',
    'ppv',
    '🚗 Luxury Car Shoot',
    'Exclusive photoshoot in luxury sports car',
    ARRAY['car', 'luxury', 'photoshoot', 'exclusive'],
    20.00
  ),
  (
    v_agency_id,
    v_model_id,
    'bedroom-tease.jpg',
    'https://example.com/assets/bedroom-tease.jpg',
    'https://example.com/assets/bedroom-tease-thumb.jpg',
    'image',
    'ppv',
    '🛏️ Bedroom Preview',
    'Teaser from exclusive bedroom content',
    ARRAY['bedroom', 'tease', 'preview'],
    12.00
  ),
  (
    v_agency_id,
    v_model_id,
    'beach-bikini.mp4',
    'https://example.com/assets/beach-bikini.mp4',
    'https://example.com/assets/beach-bikini-thumb.jpg',
    'video',
    'ppv',
    '🏖️ Beach Day Bikini',
    'Exclusive beach day in new bikini',
    ARRAY['beach', 'bikini', 'summer', 'vacation'],
    18.00
  )
  ON CONFLICT (file_url) DO NOTHING
  RETURNING id INTO v_asset_1;
  
  RAISE NOTICE '✅ Created 5 test content assets';
END $$;

-- ==================================================
-- 2. Add Performance Data
-- ==================================================

DO $$
DECLARE
  asset_record RECORD;
  v_agency_id UUID;
  performance_data RECORD[] := ARRAY[
    -- Asset 1: Top Performer (Blue Dress)
    ROW(75, 45, 675.00, 600.00, 75.00)::RECORD,
    -- Asset 2: High Performer (Gym Selfie)
    ROW(60, 30, 420.00, 360.00, 60.00)::RECORD,
    -- Asset 3: Medium Performer (Car Shoot)
    ROW(50, 18, 360.00, 300.00, 60.00)::RECORD,
    -- Asset 4: Low Performer (Bedroom Tease)
    ROW(40, 8, 144.00, 96.00, 48.00)::RECORD,
    -- Asset 5: Cold Asset (Beach Bikini)
    ROW(30, 3, 54.00, 36.00, 18.00)::RECORD
  ];
  idx INT := 1;
BEGIN
  SELECT id INTO v_agency_id FROM agencies LIMIT 1;
  
  FOR asset_record IN 
    SELECT id 
    FROM content_assets 
    WHERE agency_id = v_agency_id
    ORDER BY created_at DESC
    LIMIT 5
  LOOP
    -- Extract performance values (simulating different data structures)
    DECLARE
      v_times_sent INT;
      v_times_unlocked INT;
      v_total_revenue NUMERIC;
      v_ppv_revenue NUMERIC;
      v_tip_revenue NUMERIC;
    BEGIN
      -- Assign values based on index
      CASE idx
        WHEN 1 THEN  -- Blue Dress: 🔥 Hot (60% conversion)
          v_times_sent := 75;
          v_times_unlocked := 45;
          v_total_revenue := 675.00;
          v_ppv_revenue := 600.00;
          v_tip_revenue := 75.00;
        WHEN 2 THEN  -- Gym Selfie: ✅ High (50% conversion)
          v_times_sent := 60;
          v_times_unlocked := 30;
          v_total_revenue := 420.00;
          v_ppv_revenue := 360.00;
          v_tip_revenue := 60.00;
        WHEN 3 THEN  -- Car Shoot: ⚡ Medium (36% conversion)
          v_times_sent := 50;
          v_times_unlocked := 18;
          v_total_revenue := 360.00;
          v_ppv_revenue := 300.00;
          v_tip_revenue := 60.00;
        WHEN 4 THEN  -- Bedroom Tease: ⚠️ Low (20% conversion)
          v_times_sent := 40;
          v_times_unlocked := 8;
          v_total_revenue := 144.00;
          v_ppv_revenue := 96.00;
          v_tip_revenue := 48.00;
        WHEN 5 THEN  -- Beach Bikini: ❌ Cold (10% conversion)
          v_times_sent := 30;
          v_times_unlocked := 3;
          v_total_revenue := 54.00;
          v_ppv_revenue := 36.00;
          v_tip_revenue := 18.00;
      END CASE;
      
      INSERT INTO vault_performance (
        asset_id,
        agency_id,
        times_sent,
        times_unlocked,
        total_revenue,
        revenue_from_ppv,
        revenue_from_tips,
        avg_tip_amount,
        unique_buyers,
        first_sent_at,
        last_sent_at,
        last_sold_at
      ) VALUES (
        asset_record.id,
        v_agency_id,
        v_times_sent,
        v_times_unlocked,
        v_total_revenue,
        v_ppv_revenue,
        v_tip_revenue,
        CASE WHEN v_times_unlocked > 0 
          THEN v_tip_revenue / v_times_unlocked 
          ELSE 0 
        END,
        v_times_unlocked,  -- Assume 1 buyer per unlock for simplicity
        NOW() - (idx * 2 || ' days')::INTERVAL,
        NOW() - (idx - 1 || ' days')::INTERVAL,
        NOW() - (idx - 1 || ' days')::INTERVAL
      )
      ON CONFLICT (asset_id) DO UPDATE SET
        times_sent = EXCLUDED.times_sent,
        times_unlocked = EXCLUDED.times_unlocked,
        total_revenue = EXCLUDED.total_revenue,
        revenue_from_ppv = EXCLUDED.revenue_from_ppv,
        revenue_from_tips = EXCLUDED.revenue_from_tips,
        avg_tip_amount = EXCLUDED.avg_tip_amount,
        unique_buyers = EXCLUDED.unique_buyers,
        first_sent_at = EXCLUDED.first_sent_at,
        last_sent_at = EXCLUDED.last_sent_at,
        last_sold_at = EXCLUDED.last_sold_at,
        updated_at = NOW();
      
      idx := idx + 1;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Added performance data for 5 assets';
END $$;

-- ==================================================
-- 3. Verification & Display Results
-- ==================================================

-- Display created assets with performance
SELECT 
  '=== TEST DATA CREATED ===' as section,
  '' as details
UNION ALL
SELECT 
  'Total Assets Created' as section,
  COUNT(*)::TEXT as details
FROM content_assets
WHERE agency_id = (SELECT id FROM agencies LIMIT 1)
UNION ALL
SELECT 
  'Assets with Performance Data' as section,
  COUNT(*)::TEXT as details
FROM vault_performance
WHERE agency_id = (SELECT id FROM agencies LIMIT 1);

-- Show detailed performance breakdown
SELECT 
  '=== PERFORMANCE BREAKDOWN ===' as title,
  '' as file_name,
  '' as sent,
  '' as unlocked,
  '' as revenue,
  '' as conversion,
  '' as rating
UNION ALL
SELECT 
  '' as title,
  ca.title as file_name,
  vp.times_sent::TEXT as sent,
  vp.times_unlocked::TEXT as unlocked,
  ('$' || vp.total_revenue::TEXT) as revenue,
  (ROUND(vp.conversion_rate::NUMERIC, 1)::TEXT || '%') as conversion,
  CASE 
    WHEN vp.conversion_rate >= 50 THEN '🔥 Hot'
    WHEN vp.conversion_rate >= 20 THEN '✅ High'
    WHEN vp.conversion_rate >= 10 THEN '⚡ Medium'
    WHEN vp.conversion_rate >= 5 THEN '⚠️ Low'
    ELSE '❌ Cold'
  END as rating
FROM content_assets ca
JOIN vault_performance vp ON ca.id = vp.asset_id
WHERE ca.agency_id = (SELECT id FROM agencies LIMIT 1)
ORDER BY vp.total_revenue DESC;

-- Test get_best_sellers function
SELECT 
  '=== BEST SELLERS (Last 7 Days) ===' as title,
  '' as file_name,
  '' as revenue,
  '' as conversion
UNION ALL
SELECT 
  '' as title,
  file_name,
  ('$' || total_revenue::TEXT) as revenue,
  (ROUND(conversion_rate::NUMERIC, 1)::TEXT || '%') as conversion
FROM get_best_sellers(
  (SELECT id FROM agencies LIMIT 1),
  7,
  3
)
ORDER BY total_revenue DESC;

-- Summary stats
SELECT 
  '=== SUMMARY STATISTICS ===' as metric,
  '' as value
UNION ALL
SELECT 
  'Total Revenue Generated' as metric,
  ('$' || COALESCE(SUM(total_revenue), 0)::TEXT) as value
FROM vault_performance
WHERE agency_id = (SELECT id FROM agencies LIMIT 1)
UNION ALL
SELECT 
  'Average Conversion Rate' as metric,
  (ROUND(COALESCE(AVG(conversion_rate), 0)::NUMERIC, 1)::TEXT || '%') as value
FROM vault_performance
WHERE agency_id = (SELECT id FROM agencies LIMIT 1)
  AND times_sent > 0
UNION ALL
SELECT 
  'Best Performing Asset' as metric,
  ca.title as value
FROM content_assets ca
JOIN vault_performance vp ON ca.id = vp.asset_id
WHERE ca.agency_id = (SELECT id FROM agencies LIMIT 1)
ORDER BY vp.total_revenue DESC
LIMIT 1
UNION ALL
SELECT 
  'Total Assets Tracked' as metric,
  COUNT(*)::TEXT as value
FROM vault_performance
WHERE agency_id = (SELECT id FROM agencies LIMIT 1);

-- Final success message
SELECT '✅ TEST DATA SEEDED SUCCESSFULLY! Visit /dashboard/content/vault to see results.' as message;

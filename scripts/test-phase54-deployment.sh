#!/bin/bash

# PHASE 54 - DEPLOYMENT TEST SCRIPT
# Tests the deployed analytics functionality

echo "🧪 PHASE 54 - DEPLOYMENT TEST"
echo "================================"
echo ""

# Configuration
PROD_URL="https://onyxos.vercel.app"
API_URL="$PROD_URL/api/analytics/sync"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if site is accessible
echo "📡 Test 1: Checking site accessibility..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL")
if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✅ Site is accessible (HTTP $HTTP_CODE)${NC}"
else
  echo -e "${RED}❌ Site is not accessible (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test 2: Check if dashboard is accessible
echo "📊 Test 2: Checking dashboard accessibility..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/dashboard")
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 307 ]; then
  echo -e "${GREEN}✅ Dashboard is accessible (HTTP $HTTP_CODE)${NC}"
else
  echo -e "${RED}❌ Dashboard is not accessible (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test 3: Check if analytics sync endpoint exists
echo "🔄 Test 3: Checking analytics sync endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{}')
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 401 ]; then
  echo -e "${GREEN}✅ Analytics sync endpoint exists (HTTP $HTTP_CODE)${NC}"
  if [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${YELLOW}   Note: 401 is expected (authentication required)${NC}"
  fi
else
  echo -e "${RED}❌ Analytics sync endpoint error (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test 4: Check if new components are deployed
echo "🎨 Test 4: Checking if new components are deployed..."
RESPONSE=$(curl -s "$PROD_URL/dashboard")
if echo "$RESPONSE" | grep -q "revenue-chart\|RevenueChart"; then
  echo -e "${GREEN}✅ RevenueChart component found in build${NC}"
else
  echo -e "${YELLOW}⚠️  RevenueChart component not found (may be client-side)${NC}"
fi
echo ""

# Test 5: Check build info
echo "🏗️  Test 5: Checking build information..."
echo "   Deployment URL: $PROD_URL"
echo "   API Endpoint: $API_URL"
echo ""

# Summary
echo "================================"
echo "📋 TEST SUMMARY"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Open: $PROD_URL/dashboard"
echo "2. Login with your credentials"
echo "3. Navigate to 'Fanvue & Finance' tab"
echo "4. Check if charts are displaying"
echo ""
echo "If charts are empty:"
echo "1. Run sync: curl -X POST $API_URL -H 'Content-Type: application/json' -d '{}'"
echo "2. Or use: scripts/seed-phase54-test-data.sql in Supabase"
echo ""
echo "🎉 Deployment test complete!"

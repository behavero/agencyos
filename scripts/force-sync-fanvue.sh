#!/bin/bash

# FORCE SYNC FANVUE DATA
# Immediately syncs all Fanvue transactions and model stats

echo "🔄 FORCE SYNCING FANVUE DATA"
echo "=============================="
echo ""

# Configuration
PROD_URL="https://onyxos.vercel.app"
CRON_SECRET="${CRON_SECRET:-}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Sync Transactions
echo "📊 Step 1: Syncing transactions..."
if [ -n "$CRON_SECRET" ]; then
  RESPONSE=$(curl -s -X GET "$PROD_URL/api/cron/sync-transactions" \
    -H "Authorization: Bearer $CRON_SECRET")
  
  if echo "$RESPONSE" | grep -q '"success":true'; then
    SYNCED=$(echo "$RESPONSE" | grep -o '"transactionsSynced":[0-9]*' | grep -o '[0-9]*')
    echo -e "${GREEN}✅ Synced $SYNCED transactions${NC}"
  else
    echo -e "${RED}❌ Transaction sync failed${NC}"
    echo "Response: $RESPONSE"
  fi
else
  echo -e "${YELLOW}⚠️  CRON_SECRET not set. Using public endpoint...${NC}"
  echo "   Run: export CRON_SECRET='your-secret-here'"
  echo ""
fi

# Step 2: Refresh Model Stats
echo ""
echo "👤 Step 2: Refreshing model stats..."
if [ -n "$CRON_SECRET" ]; then
  RESPONSE=$(curl -s -X POST "$PROD_URL/api/cron/daily-refresh" \
    -H "Authorization: Bearer $CRON_SECRET" \
    -H "Content-Type: application/json")
  
  if echo "$RESPONSE" | grep -q '"success":true'; then
    PROCESSED=$(echo "$RESPONSE" | grep -o '"processed":[0-9]*' | grep -o '[0-9]*')
    SUCCESSFUL=$(echo "$RESPONSE" | grep -o '"successful":[0-9]*' | grep -o '[0-9]*')
    echo -e "${GREEN}✅ Refreshed $SUCCESSFUL/$PROCESSED models${NC}"
  else
    echo -e "${RED}❌ Model refresh failed${NC}"
    echo "Response: $RESPONSE"
  fi
else
  echo -e "${YELLOW}⚠️  CRON_SECRET not set${NC}"
fi

# Summary
echo ""
echo "=============================="
echo "📋 SYNC COMPLETE"
echo "=============================="
echo ""
echo "Next steps:"
echo "1. Refresh your dashboard: $PROD_URL/dashboard"
echo "2. Navigate to 'Fanvue & Finance' tab"
echo "3. Charts should now show data"
echo ""
echo "If still empty, check:"
echo "1. Fanvue models are connected: SELECT COUNT(*) FROM models WHERE fanvue_access_token IS NOT NULL;"
echo "2. Transactions exist: SELECT COUNT(*) FROM fanvue_transactions;"
echo "3. Run: scripts/seed-phase54-test-data.sql for test data"
echo ""

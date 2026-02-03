#!/bin/bash
##
# Setup Vercel Firewall via CLI
# 
# This script automates the configuration of Vercel Firewall rules
# using the Vercel REST API.
##

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔒 Vercel Firewall Setup${NC}\n"

# Check for required environment variables
if [ -z "$VERCEL_TOKEN" ]; then
    echo -e "${RED}❌ Error: VERCEL_TOKEN environment variable is required${NC}"
    echo -e "${YELLOW}💡 Create one at: https://vercel.com/account/tokens${NC}"
    echo -e "${YELLOW}   Then run: export VERCEL_TOKEN=your_token_here${NC}\n"
    exit 1
fi

# Set defaults
VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID:-prj_dpjb3dwc1yD6gYdHTBQAQjNlCGLf}"
VERCEL_TEAM_ID="${VERCEL_TEAM_ID:-team_6AhWbdS9iEGk1kBHfDIsIGfb}"

echo -e "${GREEN}✓${NC} Found VERCEL_TOKEN"
echo -e "${GREEN}✓${NC} Project: $VERCEL_PROJECT_ID"
echo -e "${GREEN}✓${NC} Team: $VERCEL_TEAM_ID\n"

# Check if tsx is installed
if ! command -v tsx &> /dev/null; then
    echo -e "${YELLOW}⚠️  tsx not found. Installing globally...${NC}"
    npm install -g tsx
fi

# Run the TypeScript configuration script
echo -e "${BLUE}📋 Configuring firewall rules...${NC}\n"
tsx scripts/configure-firewall.ts

echo -e "\n${GREEN}✅ Firewall configuration complete!${NC}"
echo -e "\n${BLUE}📊 What was configured:${NC}"
echo "   1. API Rate Limiting (100 req/min)"
echo "   2. Bot Challenge (CAPTCHA for bots)"
echo "   3. Geographic Blocking (disabled by default)"
echo "   4. Login Rate Limiting (5 attempts/5min)"
echo "   5. Analytics API Throttling (30 req/min)"

echo -e "\n${BLUE}🤖 Managed Rules:${NC}"
echo "   ✅ Bot Protection enabled"
echo "   ✅ AI Bot Blocking enabled"

echo -e "\n${YELLOW}💡 Next Steps:${NC}"
echo "   1. View rules: https://vercel.com/behaveros-projects/agencyos-react/settings/firewall"
echo "   2. Test your API to ensure it works"
echo "   3. Monitor logs for blocked requests"
echo "   4. Adjust rate limits as needed"

echo -e "\n${GREEN}🎉 All done!${NC}\n"

#!/bin/bash

# Vercel Manual Deployment Script
# Use this if auto-deploy isn't working

echo "🚀 Triggering Vercel Deployment..."
echo ""

# Check if VERCEL_DEPLOY_HOOK is set
if [ -z "$VERCEL_DEPLOY_HOOK" ]; then
  echo "❌ ERROR: VERCEL_DEPLOY_HOOK environment variable not set"
  echo ""
  echo "To set it up:"
  echo "1. Go to: https://vercel.com/behaveros-projects/agencyos/settings/git"
  echo "2. Scroll to 'Deploy Hooks'"
  echo "3. Create a new hook:"
  echo "   - Name: 'Manual Production Deploy'"
  echo "   - Branch: 'main'"
  echo "4. Copy the hook URL"
  echo "5. Run: export VERCEL_DEPLOY_HOOK='<your-hook-url>'"
  echo "6. Then run this script again"
  echo ""
  exit 1
fi

# Trigger deployment
echo "📡 Sending deploy request to Vercel..."
response=$(curl -X POST "$VERCEL_DEPLOY_HOOK" -s -w "\n%{http_code}")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
  echo "✅ Deployment triggered successfully!"
  echo ""
  echo "📊 Monitor deployment at:"
  echo "https://vercel.com/behaveros-projects/agencyos"
  echo ""
  echo "🌐 Your site will be live in ~2-3 minutes at:"
  echo "https://onyxos.vercel.app"
else
  echo "❌ Deployment failed with HTTP code: $http_code"
  echo "Response: $(echo "$response" | head -n-1)"
  exit 1
fi

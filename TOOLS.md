# TOOLS.md - OnyxOS Project Notes

## Project Details

- **Repo:** https://github.com/behavero/agencyos.git
- **Production:** https://onyxos.vercel.app
- **Vercel project:** agencyos / behavero
- **Supabase:** Check `NEXT_PUBLIC_SUPABASE_URL` in Vercel env vars

## Fanvue Integration

- **API Base:** https://api.fanvue.com
- **API Docs (local):** `docs/fanvue-api-docs/` -- 78 endpoint docs organized by category
- **API Docs (remote):** https://api.fanvue.com/docs/api-reference/
- **API Version:** `2025-06-26`
- **Developer Portal:** https://www.fanvue.com/developers (Martin's account)
- **App ID:** bd5a9810-b0c1-4e4c-b290-a2271114b6c1
- **OAuth Callback:** `https://onyxos.vercel.app/api/oauth/agency/callback`

## Key File Locations

### Core Services

- `src/lib/fanvue/client.ts` -- Fanvue API client (all endpoints)
- `src/lib/fanvue/oauth.ts` -- OAuth helpers (authorize URL, token exchange)
- `src/lib/fanvue/rate-limiter.ts` -- Rate limit handling with retry
- `src/lib/services/agency-fanvue-auth.ts` -- Agency token management
- `src/lib/services/fanvue-auth.ts` -- Individual model token management
- `src/lib/services/transaction-syncer.ts` -- Revenue sync logic

### API Routes

- `src/app/api/creators/[id]/stats/route.ts` -- Single creator stats
- `src/app/api/creators/stats/refresh-all/route.ts` -- Bulk stats refresh
- `src/app/api/oauth/agency/` -- Agency OAuth (login + callback)
- `src/app/api/cron/revenue-heartbeat/route.ts` -- Revenue sync cron

### UI Components

- `src/components/creators/` -- Creator management UI
- `src/components/dashboard/` -- Dashboard cards and charts
- `src/providers/agency-data-provider.tsx` -- Global data context

## Dev Commands

```bash
npm run dev                    # Start dev server (localhost:3000)
npm run build                  # Production build
git push                       # Triggers Vercel deploy
```

## Debug Endpoints (require admin auth)

- `/api/debug/fanvue-creators` -- Test Fanvue GET /creators with stored token
- `/api/debug/check-env` -- Verify environment variables
- `/api/debug/agency-status` -- Agency connection status

## Common Operations

### Force refresh all creator stats

```bash
curl -X POST https://onyxos.vercel.app/api/creators/stats/refresh-all \
  -H "Content-Type: application/json" \
  -d '{"agencyId": "AGENCY_UUID"}'
```

### Trigger revenue heartbeat manually

```bash
curl "https://onyxos.vercel.app/api/cron/revenue-heartbeat" \
  -H "Authorization: Bearer $CRON_SECRET"
```

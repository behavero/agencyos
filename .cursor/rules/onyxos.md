# OnyxOS Development Rules

## Project Context

- **Name:** OnyxOS (agencyos-react)
- **Stack:** Next.js 15, React, TypeScript, Supabase, Vercel
- **Purpose:** Agency CRM for Fanvue content creators -- manage creators, track revenue, handle messaging, automate workflows
- **Production URL:** https://onyxos.vercel.app
- **Repo:** https://github.com/behavero/agencyos.git

## Architecture

### Database (Supabase)

- `models` -- Creator accounts (name, stats, avatar, fanvue_user_uuid)
- `agency_fanvue_connections` -- Agency OAuth tokens from "Connect Fanvue" button
- `fanvue_transactions` -- Revenue tracking per creator
- `fans` -- Follower data with segmentation
- `agencies` -- Agency config
- `profiles` -- User profiles linked to Supabase Auth

### Token Architecture (CRITICAL)

- **Agency tokens** are in `agency_fanvue_connections` (from "Connect Fanvue" OAuth)
- **Individual creator tokens** are in `models` table (from per-creator OAuth)
- When fetching data, ALWAYS check agency connection first: `getAgencyFanvueToken(agencyId)`
- Fall back to model tokens only if no agency connection exists

### Column Name Mismatch

- Actual DB column: `fanvue_user_uuid` (in models table)
- TypeScript type in `database.types.ts`: `fanvue_user_id`
- `createAdminClient()` is UNTYPED -- server routes can use `fanvue_user_uuid` directly
- Client components MUST use `fanvue_user_id` (the typed name)

### API Structure

- `/api/creators/[id]/stats` -- Single creator stats refresh from Fanvue
- `/api/creators/stats/refresh-all` -- Bulk refresh all creators (parallel)
- `/api/oauth/agency/*` -- Agency OAuth flow (login + callback)
- `/api/oauth/*` -- Individual creator OAuth flow
- `/api/cron/*` -- Background jobs (sync, heartbeat)
- `/api/analytics/dashboard` -- Dashboard analytics
- `/api/agency/*` -- Agency management endpoints
- `/api/debug/*` -- Debug endpoints (require admin auth in production)
- `/api/chat` -- Alfred AI chat (Groq Llama 3.3 70B)

### Fanvue API Client

- Location: `src/lib/fanvue/client.ts`
- All endpoints documented in `docs/fanvue-api-docs/`
- API version: `X-Fanvue-API-Version: 2025-06-26`
- Amounts are in CENTS -- divide by 100 for dollars
- Rate limiting with automatic retry: `src/lib/fanvue/rate-limiter.ts`
- OAuth helpers: `src/lib/fanvue/oauth.ts`

## Code Patterns

### Server-Side Database Access

```typescript
import { createAdminClient } from '@/lib/supabase/server'
const supabase = createAdminClient() // Untyped, bypasses RLS
```

### Getting Fanvue Tokens

```typescript
// Prefer agency token (from "Connect Fanvue")
import { getAgencyFanvueToken } from '@/lib/services/agency-fanvue-auth'
const token = await getAgencyFanvueToken(agencyId)

// Fallback: individual model token
import { getModelAccessToken } from '@/lib/services/fanvue-auth'
const token = await getModelAccessToken(modelId)
```

### Fanvue API Calls

```typescript
import { createFanvueClient } from '@/lib/fanvue/client'
const fanvue = createFanvueClient(accessToken)
const earnings = await fanvue.getCreatorEarnings(creatorUuid, { startDate, endDate })
```

### Environment Variable Access

```typescript
// OAuth client ID (check both names)
const clientId = process.env.FANVUE_CLIENT_ID || process.env.NEXT_PUBLIC_FANVUE_CLIENT_ID
```

## Do NOT

- Do NOT upgrade `eslint-config-next` to v16 (requires ESLint 9 flat config migration)
- Do NOT include `<Sidebar />` or `<Header />` in dashboard page components -- `layout.tsx` provides them
- Do NOT hardcode secrets in any file -- use `process.env`
- Do NOT store tokens on the client side -- all token operations are server-side
- Do NOT use `models.fanvue_access_token` as the only token source -- always check `agency_fanvue_connections` first
- Do NOT skip the `X-Fanvue-API-Version` header -- API rejects requests without it

## Environment Variables

**Required (set on Vercel):**

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `FANVUE_CLIENT_ID` / `FANVUE_CLIENT_SECRET`
- `OAUTH_SCOPES` -- must exactly match Fanvue developer portal
- `NEXT_PUBLIC_APP_URL` -- production: `https://onyxos.vercel.app`
- `GROQ_API_KEY` -- for Alfred AI chat
- `CRON_SECRET` -- for cron job auth

**Optional:**

- `FANVUE_WEBHOOK_SECRET` -- webhook signature verification
- `FIRECRAWL_API_KEY` -- Ghost Tracker competitor analysis
- `SENTRY_DSN` -- error tracking

## Testing

```bash
npm run dev          # Local development
npm run build        # Production build (catches type errors)
npm run lint         # ESLint check
npm run type-check   # TypeScript check only
```

## Deployment

- Push to `main` triggers Vercel auto-deploy
- `.npmrc` has `legacy-peer-deps=true` for CI compatibility
- Husky pre-commit runs eslint + prettier on staged files

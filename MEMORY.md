# MEMORY.md - Long-Term Memory

_Curated learnings. Updated periodically from daily notes._

Last reviewed: 2026-02-05

---

## Architecture Decisions

### Token Architecture (Feb 2026)

- **Agency OAuth tokens** live in `agency_fanvue_connections` table (from "Connect Fanvue" button)
- **Individual creator tokens** live in `models` table (from per-creator OAuth)
- Stats/sync code must check **agency connection first**, then fall back to model tokens
- The `createAdminClient()` is **untyped** (no `Database` generic) -- server routes can access any column, but client components must use `database.types.ts` names

### Column Name Gotcha

- Database column: `fanvue_user_uuid` (actual column in models table)
- TypeScript type: `fanvue_user_id` (in `database.types.ts`)
- These are the SAME column -- the types file is outdated
- Server routes (untyped admin client) use `fanvue_user_uuid` -- works fine
- Client components (typed) must use `fanvue_user_id` -- or build fails

### Fanvue OAuth (Feb 2026)

- Token exchange requires `Authorization: Basic` header (base64 of `clientId:clientSecret`)
- `OAUTH_SCOPES` env var must **exactly match** the Fanvue developer portal scopes
- Public Fanvue docs are sometimes incomplete -- the developer portal is the source of truth
- Scopes include `read:agency` and `write:agency` (not listed in public docs but exist)
- `getAuthorizeUrl()` reads scopes from `process.env.OAUTH_SCOPES`

### Data Flow

```
Fanvue API → /api/creators/[id]/stats (per-creator)
           → /api/creators/stats/refresh-all (bulk, parallel)
           → models table (DB)
           → AgencyProvider (React context)
           → Dashboard UI
```

### Live Stats System (Feb 5, 2026)

- Bulk refresh: `POST /api/creators/stats/refresh-all` refreshes all creators in parallel
- Auto-refresh on page load if stats older than 2 minutes
- Periodic refresh every 60 seconds on Creator Management page
- Revenue heartbeat cron runs every 10 minutes on Vercel

## AI SDK v6 Lessons

- `useChat` is in `@ai-sdk/react`, NOT `ai`
- No `input`/`handleInputChange`/`handleSubmit`/`setInput`/`isLoading`/`reload`
- Manage input state locally, use `sendMessage({ text })`, derive loading from `status`, use `regenerate()`
- Client sends `UIMessage[]` (parts-based), server needs `ModelMessage[]` (content-based)
- Bridge: `await convertToModelMessages(uiMessages)` from `'ai'` package

## Environment Variables (Critical)

| Variable                | Purpose                          | Notes                                     |
| ----------------------- | -------------------------------- | ----------------------------------------- |
| `FANVUE_CLIENT_ID`      | OAuth client ID                  | Also check `NEXT_PUBLIC_FANVUE_CLIENT_ID` |
| `FANVUE_CLIENT_SECRET`  | OAuth client secret              | Server-only                               |
| `OAUTH_SCOPES`          | Must match Fanvue portal exactly | Space-separated                           |
| `FANVUE_WEBHOOK_SECRET` | Webhook signature verification   | From portal                               |
| `NEXT_PUBLIC_APP_URL`   | App base URL for OAuth redirects | `https://onyxos.vercel.app`               |
| `GROQ_API_KEY`          | Alfred AI chat (Llama 3.3 70B)   |                                           |
| `FIRECRAWL_API_KEY`     | Ghost Tracker web scraping       |                                           |
| `CRON_SECRET`           | Cron job authentication          |                                           |

## Common Pitfalls

1. **"No connected accounts"** -- Stats route was looking for tokens in `models` table only. Fix: check `agency_fanvue_connections` first via `getAgencyFanvueToken()`.
2. **OAuth redirect to /404** -- Fanvue OAuth URL requires correct `redirect_uri` matching portal config exactly.
3. **ESLint config** -- Project uses ESLint 8. Do NOT upgrade `eslint-config-next` to v16 (requires ESLint 9 flat config).
4. **Peer deps** -- `.npmrc` has `legacy-peer-deps=true` for CI compatibility.
5. **Duplicate layouts** -- Dashboard pages must NOT include their own `<Sidebar />` / `<Header />` -- `layout.tsx` provides these.

## Fanvue API Quick Reference

### Agency Endpoints (use agency token)

- `GET /creators` -- list agency creators
- `GET /creators/{uuid}/chats/lists/smart` -- follower/subscriber COUNTS (best endpoint for this)
- `GET /creators/{uuid}/insights/earnings` -- revenue (cursor-paginated, amounts in CENTS)
- `GET /creators/{uuid}/insights/top-spenders` -- VIP fans
- `GET /creators/{uuid}/insights/subscribers` -- subscriber history
- `GET /creators/{uuid}/followers` -- paginated followers list
- `GET /creators/{uuid}/subscribers` -- paginated subscribers list
- `GET /creators/{uuid}/chats` -- paginated chats

### Personal Endpoints (use creator's own token)

- `GET /users/me` -- profile + follower/subscriber/post counts
- `GET /insights/earnings` -- personal earnings
- `GET /chats/unread` -- unread message count
- `GET /tracking-links` -- tracking links

### Key Details

- All amounts in **cents** -- divide by 100 for dollars
- API version header required: `X-Fanvue-API-Version: 2025-06-26`
- Rate limiting: client has built-in retry with `fetchWithRateLimit()`

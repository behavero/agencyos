# OnyxOS Development Rules for Cursor Agent

## Project Context
- **Name:** OnyxOS (agencyos-react)
- **Stack:** Next.js 15, React, TypeScript, Supabase, Vercel
- **Purpose:** Agency CRM & Chatting Tool for content creators (Fanvue/OFM management)
- **Location:** /Volumes/KINGSTON/agencyos-react

## Critical Architecture

### Database (Supabase)
- **Models table:** `models` - Creator accounts with Fanvue OAuth tokens
- **Fans table:** `fans` - Follower data with segmentation
- **Transactions:** `fanvue_transactions` - Revenue tracking
- **Missing:** `mass_dm_campaigns`, `mass_dm_sends` - Need to build

### API Structure
- `/api/cron/*` - Background jobs (sync, heartbeat, etc.)
- `/api/agency/*` - Agency dashboard data
- `/api/fans/*` - Fan management & whale scoring
- `/api/ai/*` - AI generation features

### Fanvue Integration
- OAuth flow working (models connect via button)
- Token stored in `models.fanvue_access_token`
- Auto-refresh implemented
- **Missing:** Mass DM API, follower list API

## Current Priorities (Phase 57+)

### 1. Mass DM System
**Status:** Database schema needed
**Tables to create:**
```sql
mass_dm_campaigns (id, model_id, name, template, status, scheduled_at)
mass_dm_sends (id, campaign_id, fan_id, sent_at, opened_at, purchased_at, revenue)
fan_segments (fan_id, model_id, segment_type, score) -- 'love_seeker', 'fuck_boy', 'big_spender'
```

### 2. Fanvue API Fixes
**Status:** OAuth working, but endpoints unclear
**Need to verify:**
- Get followers list endpoint
- Send mass DM endpoint
- Track DM opens/purchases

### 3. Dashboard Stability
**Status:** Cron auth fixed (query param support added)
**Whale Priority:** Already implemented in `useChatRosterWithWhalePriority.ts`

## Code Patterns

### API Routes
```typescript
// Always use model-specific tokens
import { getModelAccessToken } from '@/lib/services/fanvue-auth'
const token = await getModelAccessToken(modelId)
```

### Database Queries
```typescript
// Use admin client for server-side
import { createAdminClient } from '@/lib/supabase/server'
const supabase = createAdminClient()
```

### Cron Jobs
```typescript
// Support both header and query param auth
const authHeader = request.headers.get('authorization')
const querySecret = new URL(request.url).searchParams.get('secret')
if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

## Environment Variables (Vercel)
```
CRON_SECRET=onyx-cron-secret-123
FANVUE_CLIENT_ID=...
FANVUE_CLIENT_SECRET=...
GROQ_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Testing Commands
```bash
# Test cron locally
curl "http://localhost:3000/api/cron/sync-transactions?secret=onyx-cron-secret-123"

# Deploy to Vercel
vercel --prod
```

## Common Issues
1. **401 on cron jobs** - Check secret in URL query param
2. **Fanvue auth fails** - Model needs to reconnect (token expired)
3. **Missing data** - Run sync-transactions cron manually

## Communication
- Report findings to Jarvis (OpenClaw)
- Commit with clear messages
- Test on staging before prod

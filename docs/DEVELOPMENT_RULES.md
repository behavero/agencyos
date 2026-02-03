# 🛠️ AgencyOS Development Rules & Guidelines

**Last Updated:** February 3, 2026  
**Mandatory for all code changes involving Fanvue API integration**

---

## 🎯 CORE PRINCIPLE

**ALWAYS consult `/docs/fanvue-api-docs/` before implementing ANY Fanvue API feature.**

Never assume endpoint structure, parameters, or response formats. The Fanvue API is constantly evolving, and our local documentation is the source of truth.

---

## 📚 API DOCUMENTATION STRUCTURE

```
docs/fanvue-api-docs/
├── README.md                    # Overview & getting started
├── _TEMPLATE.md                 # Template for new endpoint docs
├── HOW_TO_POPULATE.md          # Guide for adding new endpoints
│
├── agencies/                    # ✅ COMPLETE (25 endpoints)
│   ├── get-agency-creators.md
│   ├── get-creator-earnings.md
│   ├── get-creator-top-spenders.md
│   ├── get-creator-subscribers-count.md
│   └── ... (21 more)
│
├── insights/                    # Earnings, stats, analytics
├── creators/                    # Creator profiles, followers
├── chats/                       # Chat management
├── chat-messages/               # Messaging
├── chat-smart-lists/            # Pre-built fan segments
├── chat-custom-lists/           # Custom fan segments
├── posts/                       # Content posting
├── media/                       # Media upload/management
├── tracking-links/              # Link tracking
├── vault/                       # Content vault
├── users/                       # User info
└── chat-templates/              # Message templates
```

---

## ⚠️ MANDATORY RULES

### Rule 1: Always Check Documentation First

**BEFORE writing any code that interacts with Fanvue API:**

1. Navigate to `/docs/fanvue-api-docs/[category]/[endpoint].md`
2. Read the **entire** documentation file
3. Check:
   - Required parameters
   - Optional parameters
   - Required OAuth scopes
   - Response format
   - Pagination type (cursor vs. page)
   - Rate limits
   - Example responses

**❌ BAD:**

```typescript
// Assuming the endpoint structure
const earnings = await fanvue.request('/earnings?start=2024-01-01')
```

**✅ GOOD:**

```typescript
// Consulting docs/fanvue-api-docs/insights/get-earnings-data.md first
// Endpoint: GET /insights/earnings
// Required params: startDate (ISO 8601), size (max 50)
// Pagination: cursor-based

const earnings = await fanvue.getEarnings({
  startDate: '2024-01-01T00:00:00.000Z', // Full ISO 8601
  size: 50, // Max allowed
  cursor: lastCursor,
})
```

---

### Rule 2: Use Correct Endpoint for Agency vs. Creator

Fanvue has **TWO types of endpoints**:

#### **Personal Endpoints** (requires creator's own token)

- `/insights/earnings` - Personal earnings
- `/users/me` - Personal profile
- `/chats` - Personal chats
- **Scope**: `read:insights`, `read:user`

#### **Agency Endpoints** (requires agency admin token)

- `/creators/{uuid}/insights/earnings` - Creator's earnings (via agency)
- `/creators/{uuid}/followers` - Creator's followers (via agency)
- `/creators/{uuid}/chats` - Creator's chats (via agency)
- **Scope**: `read:creator`, `read:insights`, `read:fan`

**⚠️ CRITICAL:** Always use **agency endpoints** for:

- Bulk operations across creators
- Stats for creators without personal tokens
- Agency-wide analytics

**Example:**

```typescript
// ❌ WRONG: Using personal endpoint for agency data
const earnings = await fanvue.getEarnings() // Only works for logged-in creator

// ✅ CORRECT: Using agency endpoint
const earnings = await fanvue.getCreatorEarnings(creatorUserUuid, {
  startDate: '2024-01-01T00:00:00.000Z',
})
```

---

### Rule 3: Handle Pagination Correctly

Fanvue uses **TWO pagination types**:

#### **Cursor-Based** (for large datasets)

Used by: Earnings, Subscriber History

```typescript
// ✅ CORRECT
let cursor = null
const allData = []

do {
  const response = await fanvue.getCreatorEarnings(uuid, {
    startDate: '2024-01-01T00:00:00.000Z',
    size: 50,
    cursor,
  })

  allData.push(...response.data)
  cursor = response.nextCursor // ← Key: cursor from response
} while (cursor)
```

#### **Page-Based** (for smaller datasets)

Used by: Followers, Subscribers, Chats, Agency Creators

```typescript
// ✅ CORRECT
let page = 1
let hasMore = true
const allData = []

while (hasMore) {
  const response = await fanvue.getCreatorFollowers(uuid, {
    page,
    size: 50,
  })

  allData.push(...response.data)
  hasMore = response.pagination.hasMore // ← Key: hasMore flag
  page++
}
```

**❌ NEVER mix pagination types!**

---

### Rule 4: Validate Date Formats

Fanvue requires **full ISO 8601 datetime strings**, not just dates:

```typescript
// ❌ WRONG
startDate: '2024-01-01' // Missing time and timezone

// ❌ WRONG
startDate: '2024-01-01T00:00:00Z' // 'Z' instead of '.000Z'

// ✅ CORRECT
startDate: '2024-01-01T00:00:00.000Z' // Full ISO 8601 with milliseconds
```

**Helper function:**

```typescript
function toFanvueDate(date: Date): string {
  return date.toISOString() // Automatically formats to YYYY-MM-DDTHH:mm:ss.sssZ
}
```

---

### Rule 5: Respect Rate Limits

**Current limits:** 100 requests per minute

**✅ ALWAYS use:**

- `fetchWithRateLimit()` from `@/lib/fanvue/rate-limiter`
- Exponential backoff on 429 errors
- Respect `Retry-After` header

```typescript
// ✅ CORRECT: Already integrated in FanvueClient
const response = await fetchWithRateLimit(
  url,
  options,
  3 // Max 3 retries
)
```

---

### Rule 6: Use Smart Lists for Accurate Counts

**NEVER paginate through all followers/subscribers just to count them!**

Use the **Smart Lists endpoint** instead:

```typescript
// ❌ WRONG: Paginating thousands of followers
let page = 1
let count = 0
while (hasMore) {
  const response = await fanvue.getCreatorFollowers(uuid, { page, size: 50 })
  count += response.data.length
  page++
}

// ✅ CORRECT: Using Smart Lists
const smartLists = await fanvue.getCreatorSmartLists(uuid)
const followersCount = smartLists.find(list => list.uuid === 'followers')?.count || 0
const subscribersCount = smartLists.find(list => list.uuid === 'subscribers')?.count || 0
```

**Smart Lists available:**

- `followers` - Total followers
- `subscribers` - Total subscribers
- `auto_renewing` - Auto-renewing subscriptions
- `non_renewing` - One-time subscriptions
- `free_trial_subscribers` - Free trial users
- `expired_subscribers` - Churned users
- `spent_more_than_50` - VIP fans

---

### Rule 7: Token Management

**Always check token freshness before API calls:**

```typescript
// ✅ CORRECT: Using getModelAccessToken (handles refresh automatically)
const accessToken = await getModelAccessToken(modelId)
const fanvue = createFanvueClient(accessToken)

// ❌ WRONG: Using stale token from database
const fanvue = createFanvueClient(model.fanvue_access_token) // Might be expired!
```

**For agency-wide operations:**

```typescript
// ✅ CORRECT: Use agency admin's token
const agencyToken = await getAgencyAdminToken(agencyId)
const fanvue = createFanvueClient(agencyToken)

// Then use agency endpoints
const earnings = await fanvue.getCreatorEarnings(creatorUserUuid, params)
```

---

### Rule 8: Error Handling

**Always handle Fanvue API errors gracefully:**

```typescript
try {
  const response = await fanvue.getCreatorEarnings(uuid, params)
  // ... process data
} catch (error) {
  if (error instanceof FanvueAPIError) {
    if (error.statusCode === 401) {
      // Token expired - refresh it
      console.log('[Sync] Token expired, refreshing...')
      const newToken = await getModelAccessToken(modelId)
      // Retry with new token
    } else if (error.statusCode === 429) {
      // Rate limited - already handled by fetchWithRateLimit
      console.log('[Sync] Rate limited, retrying...')
    } else if (error.statusCode === 404) {
      // Creator not found or endpoint doesn't exist
      console.log('[Sync] Creator not found')
    } else {
      // Other API error
      console.error('[Sync] API error:', error.message, error.response)
    }
  } else {
    // Network error or other exception
    console.error('[Sync] Unexpected error:', error)
  }
}
```

---

## 📊 LIVE DATA SYNC REQUIREMENTS

### For "Live" Chats & Insights

To maintain real-time accuracy, follow this sync schedule:

#### **High-Frequency (Every 5 minutes)**

- Unread message counts
- Online status
- New chats

#### **Medium-Frequency (Every hour)**

- Earnings (new transactions)
- Follower/subscriber counts
- Top spenders

#### **Low-Frequency (Daily)**

- Subscriber history
- Full message thread sync
- Content analytics

**Implementation:**

```typescript
// High-frequency: Vercel Cron every 5 minutes
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/sync-messages",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/sync-stats",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/sync-history",
      "schedule": "0 0 * * *"
    }
  ]
}
```

---

## 🔄 INCREMENTAL SYNC PATTERN

**ALWAYS use cursor-based incremental syncing to avoid re-fetching old data:**

```typescript
// ✅ CORRECT: Incremental sync
const lastSync = model.last_transaction_sync || '2020-01-01T00:00:00.000Z'

const earnings = await fanvue.getCreatorEarnings(uuid, {
  startDate: lastSync, // Only fetch data since last sync
  size: 50,
})

// Update cursor after successful sync
await supabase
  .from('models')
  .update({ last_transaction_sync: new Date().toISOString() })
  .eq('id', modelId)
```

**Store sync cursors in database:**

```sql
ALTER TABLE models
ADD COLUMN last_transaction_sync TIMESTAMPTZ DEFAULT '2020-01-01 00:00:00+00',
ADD COLUMN last_messages_sync TIMESTAMPTZ DEFAULT '2020-01-01 00:00:00+00',
ADD COLUMN last_subscribers_sync TIMESTAMPTZ DEFAULT '2020-01-01 00:00:00+00';
```

---

## 🧪 TESTING CHECKLIST

Before deploying ANY Fanvue API integration:

- [ ] Consulted `/docs/fanvue-api-docs/[category]/[endpoint].md`
- [ ] Verified parameter names match documentation exactly
- [ ] Checked required OAuth scopes
- [ ] Used correct pagination type (cursor vs. page)
- [ ] Validated date formats (ISO 8601 with milliseconds)
- [ ] Added rate limit handling
- [ ] Implemented error handling for 401, 429, 404
- [ ] Used `createAdminClient()` instead of `supabaseAdmin`
- [ ] Tested with real API calls (not assumptions)
- [ ] Added logging for debugging
- [ ] Updated sync cursor after successful fetch

---

## 🚨 COMMON MISTAKES TO AVOID

### ❌ Mistake 1: Wrong Supabase Client

```typescript
// ❌ WRONG
import { supabaseAdmin } from '@/lib/supabase/admin' // Doesn't exist!

// ✅ CORRECT
import { createAdminClient } from '@/lib/supabase/server'
const adminClient = createAdminClient()
```

### ❌ Mistake 2: Missing Required Parameters

```typescript
// ❌ WRONG: Missing required 'size' parameter
const earnings = await fanvue.getEarnings({
  startDate: '2024-01-01T00:00:00.000Z',
  // Missing: size: 50
})

// ✅ CORRECT
const earnings = await fanvue.getEarnings({
  startDate: '2024-01-01T00:00:00.000Z',
  size: 50, // Required, max 50
})
```

### ❌ Mistake 3: Using Personal Endpoint for Agency Data

```typescript
// ❌ WRONG: Can't get other creator's data with personal endpoint
const earnings = await fanvue.getEarnings() // Only gets YOUR earnings

// ✅ CORRECT: Use agency endpoint
const earnings = await fanvue.getCreatorEarnings(otherCreatorUuid, params)
```

### ❌ Mistake 4: Not Handling Pagination

```typescript
// ❌ WRONG: Only gets first 50 results
const response = await fanvue.getCreatorFollowers(uuid, { size: 50 })
const followers = response.data // ← Missing hundreds more!

// ✅ CORRECT: Paginate through all results
const followers = []
let page = 1
while (hasMore) {
  const response = await fanvue.getCreatorFollowers(uuid, { page, size: 50 })
  followers.push(...response.data)
  hasMore = response.pagination.hasMore
  page++
}
```

### ❌ Mistake 5: Ignoring Rate Limits

```typescript
// ❌ WRONG: Hitting API 200 times in a row
for (const creator of creators) {
  await fanvue.getCreatorEarnings(creator.uuid) // Rate limited after 100!
}

// ✅ CORRECT: Batch with delays or use queue
const results = []
for (let i = 0; i < creators.length; i++) {
  results.push(await fanvue.getCreatorEarnings(creators[i].uuid))

  // Add delay every 50 requests
  if ((i + 1) % 50 === 0) {
    await new Promise(resolve => setTimeout(resolve, 60000)) // Wait 1 min
  }
}
```

---

## 📖 HOW TO USE API DOCS

### Step 1: Find Your Endpoint

Navigate to `/docs/fanvue-api-docs/` and locate the category:

```
Need to get creator earnings?
→ /docs/fanvue-api-docs/agencies/get-creator-earnings.md

Need to send a message?
→ /docs/fanvue-api-docs/chat-messages/send-message.md

Need to upload media?
→ /docs/fanvue-api-docs/media/create-upload-session.md
```

### Step 2: Read the Full Documentation

Each doc file contains:

1. **Endpoint URL** - Exact path
2. **Method** - GET, POST, etc.
3. **OAuth Scopes** - Required permissions
4. **Path Parameters** - URL placeholders
5. **Query Parameters** - URL query string
6. **Request Body** - POST/PUT payload
7. **Response Format** - Expected JSON structure
8. **Example Request** - cURL command
9. **Example Response** - Sample JSON

### Step 3: Implement in Code

Use the `FanvueClient` class methods that match the endpoint:

```typescript
// Documentation: /docs/fanvue-api-docs/agencies/get-creator-earnings.md
// Endpoint: GET /creators/{creatorUserUuid}/insights/earnings
// Maps to:
await fanvue.getCreatorEarnings(creatorUserUuid, {
  startDate: '2024-01-01T00:00:00.000Z',
  endDate: '2024-12-31T23:59:59.999Z',
  size: 50,
  cursor: null,
})
```

### Step 4: Test with Real Data

Always test with actual API calls, not mock data:

```typescript
console.log('[Test] Fetching earnings for:', creatorUserUuid)
const response = await fanvue.getCreatorEarnings(creatorUserUuid, params)
console.log('[Test] Response:', JSON.stringify(response, null, 2))
console.log('[Test] Transaction count:', response.data.length)
console.log('[Test] Has more:', response.nextCursor ? 'Yes' : 'No')
```

---

## 🔍 WHEN TO UPDATE DOCUMENTATION

If you discover:

- New endpoints
- Changed parameter requirements
- New response fields
- Updated OAuth scopes
- Breaking changes

**→ Update `/docs/fanvue-api-docs/` immediately!**

Use the template at `/docs/fanvue-api-docs/_TEMPLATE.md` and follow `/docs/fanvue-api-docs/HOW_TO_POPULATE.md`.

---

## ✅ CHECKLIST FOR NEW FEATURES

When adding a new Fanvue-powered feature:

1. [ ] Identify required endpoints
2. [ ] Read full API documentation for each endpoint
3. [ ] Check if `FanvueClient` already has methods for these endpoints
4. [ ] If not, add new methods to `FanvueClient` following existing patterns
5. [ ] Use `createAdminClient()` for database operations
6. [ ] Implement pagination correctly (cursor or page-based)
7. [ ] Add rate limit handling
8. [ ] Implement incremental sync with cursors
9. [ ] Add comprehensive error handling
10. [ ] Test with real API calls
11. [ ] Add logging for debugging
12. [ ] Update relevant database tables
13. [ ] Deploy and monitor

---

## 🚀 EXAMPLES FROM PHASE A

### Example 1: Top Spenders Sync

**Consulted:** `/docs/fanvue-api-docs/agencies/get-creator-top-spenders.md`

```typescript
// ✅ Following documentation exactly
const response = await fanvue.getCreatorTopSpenders(creatorUserUuid, {
  size: 50, // Max per docs
  page: 1, // Page-based pagination
  // No date filters = all-time top spenders
})

// Response structure matches docs
response.data // Array of top spenders
response.pagination.hasMore // Boolean flag
```

### Example 2: Subscriber History Sync

**Consulted:** `/docs/fanvue-api-docs/agencies/get-creator-subscribers-count.md`

```typescript
// ✅ Cursor-based pagination per docs
let cursor = null
const allHistory = []

do {
  const response = await fanvue.getCreatorSubscriberHistory(creatorUserUuid, {
    startDate: '2024-01-01T00:00:00.000Z', // ISO 8601 per docs
    size: 50, // Max per docs
    cursor,
  })

  allHistory.push(...response.data)
  cursor = response.nextCursor // Next page cursor
} while (cursor)
```

---

## 📞 SUPPORT & QUESTIONS

If you encounter:

- Undocumented endpoints
- Unexpected API responses
- Documentation discrepancies

**→ Contact Fanvue support AND update our docs!**

---

**Remember:** The Fanvue API documentation in `/docs/fanvue-api-docs/` is your best friend. Consult it early, consult it often! 📚✨

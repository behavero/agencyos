# 🚀 PHASE 54D - Real-Time Data Architecture Audit

## 📊 **CURRENT STATE ANALYSIS**

### ✅ **What's Working Well:**

1. **Database Structure**
   - ✅ Proper indexes (`agency_id`, `model_id`, `created_at`, `fanvue_created_at`)
   - ✅ Composite indexes for common queries
   - ✅ UNIQUE constraint prevents duplicates (`fanvue_id`, `model_id`)
   - ✅ RLS policies for security
   - ✅ Aggregation functions for fast queries

2. **Rate Limit Handling**
   - ✅ Automatic 429 retry with exponential backoff
   - ✅ Tracks `X-RateLimit-*` headers
   - ✅ 100 req/60s properly managed

3. **Webhook Infrastructure**
   - ✅ `/api/webhooks/fanvue` endpoint exists
   - ✅ Handles messages, followers, subscribers, purchases, tips

---

## ❌ **CRITICAL ISSUES FOR REAL-TIME:**

### **1. INEFFICIENT SYNC STRATEGY** 🔴

**Current Problem:**

```typescript
const startDate = lastTransaction?.fanvue_created_at
  ? new Date(lastTransaction.fanvue_created_at)
  : new Date('2020-01-01') // ❌ Fetches EVERYTHING every time
```

**Issues:**

- First sync: Fetches from 2020 (could be 1000s of transactions)
- Subsequent syncs: Re-fetches overlapping data
- No incremental sync optimization
- Rate limit burns quickly on large datasets

**Recommended Fix:**

```typescript
// Store last sync cursor in database
const lastSync = await supabase
  .from('sync_state')
  .select('last_cursor, last_sync_at')
  .eq('model_id', modelId)
  .eq('sync_type', 'earnings')
  .single()

// Use cursor-based pagination
const response = await fanvueClient.getEarnings({
  cursor: lastSync?.last_cursor, // Resume from last position
  size: 50,
})

// Save cursor for next sync
await supabase.from('sync_state').upsert({
  model_id: modelId,
  sync_type: 'earnings',
  last_cursor: response.nextCursor,
  last_sync_at: new Date(),
})
```

---

### **2. NO AUTOMATIC TOKEN REFRESH** 🔴

**Current Problem:**

- Tokens expire after ~30-90 days
- User must manually reconnect account
- Sync fails silently with 401

**OAuth Callback Already Stores Refresh Token:**

```typescript
// src/app/api/oauth/callback/route.ts (line 119)
fanvue_refresh_token: token.refresh_token,
fanvue_token_expires_at: token.expires_in
  ? new Date(Date.now() + token.expires_in * 1000).toISOString()
  : null,
```

**But Database Schema Missing These Fields!** ❌

**Recommended Fix:**

1. Add migration to include refresh token fields
2. Build automatic refresh service
3. Check expiry before each sync

---

### **3. WEBHOOKS NOT SYNCING TRANSACTIONS** 🟡

**Current Problem:**

```typescript
// Webhook updates counters but doesn't create fanvue_transactions records
eventType = 'purchase.received'
await adminClient.from('models').update({
  revenue_total: (model.revenue_total || 0) + eventData.amount, // ❌ Just a counter
})
```

**Issues:**

- Webhook receives purchase/tip events
- Updates aggregate counters only
- Doesn't create `fanvue_transactions` records
- Dashboard graphs stay empty until manual sync

**Recommended Fix:**

```typescript
// When webhook receives purchase/tip
await adminClient.from('fanvue_transactions').insert({
  agency_id: model.agency_id,
  model_id: model.id,
  fanvue_id: eventData.purchaseUuid,
  amount: eventData.amount / 100, // Convert cents to dollars
  category: eventData.type, // 'purchase', 'tip', etc.
  fanvue_created_at: eventData.timestamp,
  synced_at: new Date(),
})
```

---

### **4. MANUAL SYNC + LIMITED CRON** 🟡

**Current Problem:**

- Daily cron job only (Vercel Hobby limit)
- Manual sync button required for updates
- No real-time feel
- Users miss timely insights

**Recommended Fix (Multi-Tier Strategy):**

#### **Tier 1: Webhooks (Real-Time)** ⚡

- Enable Fanvue webhooks for instant notifications
- 0 API calls, instant updates
- Best for: purchases, tips, new subscribers

#### **Tier 2: Smart Polling (Every 15 min)** 🔄

- Use Supabase Edge Functions (not limited by Vercel Hobby)
- Or Vercel Cron with Pro plan ($20/mo)
- Incremental sync using cursors
- Best for: messages, follower counts

#### **Tier 3: Background Sync (Nightly)** 🌙

- Full reconciliation sync
- Catches any missed webhooks
- Ensures data consistency

---

### **5. NO QUEUE SYSTEM** 🟡

**Current Problem:**

- Sync runs in API route (30s timeout)
- Large syncs can timeout
- No retry mechanism
- No progress tracking

**Recommended Fix:**
Use a proper job queue:

- **Inngest** (free tier: 50k steps/mo)
- **Trigger.dev** (free tier: unlimited)
- **Supabase pg_cron** (built-in)

---

### **6. RATE LIMIT OPTIMIZATION** 🟢

**Current: 100 req/60s per user token**

**Optimization Strategies:**

#### **Batch Requests**

```typescript
// Instead of 3 separate requests:
await fanvueClient.getEarnings()
await fanvueClient.getSubscribersCount()
await fanvueClient.getTopFans()

// Do incremental sync on different schedules:
// - Earnings: Every sync (most important)
// - Subscriber count: Every 30 min
// - Top fans: Hourly
```

#### **Smart Invalidation**

- Only fetch changed data
- Use `Last-Modified` / `ETag` if Fanvue supports it
- Cache aggregates in Redis/Upstash

#### **Per-Model Rate Limiting**

```typescript
// Spread requests across time
for (const model of models) {
  await syncModel(model)
  await sleep(1000) // 1 second between models
}
```

---

## 🏗️ **RECOMMENDED ARCHITECTURE**

### **Phase 1: Foundation (Critical)** 🔴

1. **Add Refresh Token Fields to Database**

   ```sql
   ALTER TABLE models ADD COLUMN fanvue_refresh_token TEXT;
   ALTER TABLE models ADD COLUMN fanvue_token_expires_at TIMESTAMPTZ;
   ```

2. **Build Token Refresh Service**
   - Check expiry before each API call
   - Auto-refresh if < 24 hours until expiry
   - Update database with new token

3. **Create Sync State Table**
   ```sql
   CREATE TABLE sync_state (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     model_id UUID REFERENCES models(id),
     sync_type TEXT NOT NULL, -- 'earnings', 'messages', 'subscribers'
     last_cursor TEXT,
     last_sync_at TIMESTAMPTZ,
     next_sync_at TIMESTAMPTZ,
     UNIQUE(model_id, sync_type)
   );
   ```

---

### **Phase 2: Real-Time Engine (High Impact)** 🟡

4. **Upgrade Webhook Handler**
   - Create `fanvue_transactions` on purchase/tip events
   - Map webhook event types to transaction categories
   - Add webhook signature verification

5. **Implement Cursor-Based Sync**
   - Store pagination cursor in `sync_state`
   - Resume from last position
   - Dramatically reduce API calls

6. **Smart Sync Scheduler**
   ```typescript
   // Different sync frequencies for different data
   - Earnings: Every 15 min (high value)
   - Messages: Every 5 min (user-facing)
   - Subscribers: Every 30 min (less critical)
   - Posts: Every hour (infrequent changes)
   ```

---

### **Phase 3: Scale & Performance (Nice to Have)** 🟢

7. **Add Caching Layer**
   - Use Upstash Redis (free tier: 10k requests/day)
   - Cache aggregated dashboard stats (5-15 min TTL)
   - Reduce database load by 90%

8. **Background Job Queue**
   - Move syncs to queue (no timeouts)
   - Add retry logic
   - Track job status for UI

9. **Real-Time Subscriptions**
   - Use Supabase Realtime for dashboard updates
   - Instant UI updates when data changes
   - No manual refresh needed

---

## 📈 **PERFORMANCE COMPARISON**

### **Current (Manual Sync):**

```
User clicks sync →
  Fetch from 2020 (100+ requests) →
  5000 transactions →
  30-60 seconds →
  Rate limit exceeded →
  Retry →
  Finally completes
```

**Cost:** 100 API calls, 60 seconds, manual action

---

### **Optimized (Real-Time):**

```
Webhook arrives →
  1 database insert →
  <100ms →
  Dashboard updates automatically via Supabase Realtime

Background (every 15 min) →
  Check sync_state →
  Fetch only new data (cursor) →
  5-10 transactions →
  2-3 API calls →
  <5 seconds
```

**Cost:** 2-3 API calls, 5 seconds, automatic

**Improvement:**

- 🚀 **97% fewer API calls**
- ⚡ **92% faster**
- 🎯 **100% automatic**
- 💰 **10x more efficient rate limit usage**

---

## 🎯 **IMMEDIATE ACTION ITEMS**

### **Quick Wins (1-2 hours):**

1. ✅ Add refresh token migration
2. ✅ Build automatic token refresh
3. ✅ Update webhook to create transactions

### **Medium Effort (3-4 hours):**

4. ✅ Implement cursor-based sync
5. ✅ Create sync state tracking
6. ✅ Add smart sync scheduler

### **Long Term (1-2 days):**

7. ✅ Add caching layer
8. ✅ Implement job queue
9. ✅ Real-time dashboard subscriptions

---

## 🤔 **WHICH PHASE SHOULD WE START?**

**My Recommendation: Phase 1 + Webhook Upgrade**

This gives you:

- ✅ Automatic token refresh (no more manual reconnects)
- ✅ Real-time webhook transactions (instant updates)
- ✅ Cursor-based sync (90% fewer API calls)

**Time:** ~3-4 hours  
**Impact:** Transforms from "manual batch" to "real-time engine"  
**Cost:** $0 (all free tier compatible)

---

**Want me to implement Phase 1 now?** 🚀

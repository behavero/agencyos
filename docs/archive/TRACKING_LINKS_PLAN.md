# 📊 TRACKING LINKS ANALYTICS - Implementation Plan

**Status:** 📋 PLANNED (Not yet implemented)  
**Priority:** ⭐⭐⭐ HIGH (User Requested)

---

## 🎯 GOAL

Create a "Top Tracking Links" widget in the Overview dashboard showing the best-performing traffic sources with sortable metrics:

- **Most Clicks** → Raw traffic volume
- **Most Subscriptions** → Conversion performance
- **Best Revenue** → ROI and monetization
- **Best ROI** → Revenue per click

---

## 📊 WHAT WE'LL BUILD

### **1. Top Tracking Links Card (Overview Dashboard)**

```
┌─────────────────────────────────────────────────────────────────┐
│  🔗 Top Tracking Links                            [Sort: ROI ▼] │
├─────────────────────────────────────────────────────────────────┤
│  1. Instagram Story (Dec 15)                                    │
│     🎯 152 clicks  👥 23 subs (15.1%)  💰 $1,247 ($8.20/click) │
├─────────────────────────────────────────────────────────────────┤
│  2. TikTok Bio Link                                             │
│     🎯 1,043 clicks  👥 18 subs (1.7%)  💰 $892 ($0.85/click)  │
├─────────────────────────────────────────────────────────────────┤
│  3. Twitter Promo                                               │
│     🎯 89 clicks  👥 12 subs (13.5%)  💰 $645 ($7.25/click)    │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**

- ✅ Sort by: Clicks, Subscriptions, Revenue, ROI
- ✅ Shows: Click count, conversion rate, revenue, revenue per click
- ✅ Color-coded performance indicators
- ✅ Date created for each link
- ✅ Platform icons (Instagram, TikTok, Twitter, etc.)

---

## 🗄️ DATABASE SCHEMA

### **New Table: `tracking_links`**

```sql
CREATE TABLE tracking_links (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  model_id uuid REFERENCES models(id) ON DELETE CASCADE,

  -- From Fanvue API
  fanvue_uuid uuid NOT NULL UNIQUE,
  name text NOT NULL,
  link_url text NOT NULL, -- e.g., 'fv-instagram-story'
  external_social_platform text, -- 'instagram', 'tiktok', 'twitter', etc.

  -- Metrics (updated daily via cron)
  clicks integer DEFAULT 0,
  subscribers_gained integer DEFAULT 0, -- Calculated from subscriptions
  revenue_generated numeric(10,2) DEFAULT 0, -- Calculated from transactions

  -- Timestamps
  created_at timestamptz NOT NULL,
  last_synced_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_tracking_links_agency ON tracking_links(agency_id);
CREATE INDEX idx_tracking_links_model ON tracking_links(model_id);
CREATE INDEX idx_tracking_links_fanvue_uuid ON tracking_links(fanvue_uuid);
```

---

## 🔄 DATA FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│                     FANVUE API                                   │
│  /creators/{uuid}/tracking-links (cursor-paginated)             │
│  Returns: uuid, name, linkUrl, platform, clicks, createdAt      │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Cron: Every 30 minutes
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│           /api/cron/sync-tracking-links (NEW!)                   │
│  - Fetches links from Fanvue API                                │
│  - Upserts to tracking_links table                              │
│  - Calculates subscribers_gained from fanvue_transactions       │
│  - Calculates revenue_generated from fanvue_transactions        │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Stored in database
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    tracking_links table                          │
│  - clicks (from API)                                            │
│  - subscribers_gained (calculated from transactions)            │
│  - revenue_generated (calculated from transactions)             │
│  - conversion_rate = (subscribers_gained / clicks) × 100        │
│  - roi = revenue_generated / clicks                             │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Query via API
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              /api/analytics/tracking-links                       │
│  - Fetches top N links sorted by metric                         │
│  - Returns enriched data with calculations                      │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Rendered by dashboard
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│            Top Tracking Links Card (Dashboard)                   │
│  - Sortable table                                               │
│  - Color-coded performance                                      │
│  - Platform icons                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 IMPLEMENTATION STEPS

### **Phase 1: Database Setup** ✅ (Can do now)

1. Create `tracking_links` table migration
2. Add indexes for performance
3. Test schema with sample data

### **Phase 2: Data Sync** ✅ (Can do now)

1. Create `/api/cron/sync-tracking-links` endpoint
2. Fetch tracking links from Fanvue API (cursor-paginated)
3. Upsert to `tracking_links` table
4. Calculate `subscribers_gained` from `fanvue_transactions`
5. Calculate `revenue_generated` from `fanvue_transactions`
6. Add to `vercel.json` cron (every 30 minutes)

### **Phase 3: API Endpoint** ✅ (Can do now)

1. Create `/api/analytics/tracking-links` route
2. Accept query params: `sortBy`, `limit`, `modelId`
3. Calculate derived metrics:
   - `conversion_rate = (subscribers_gained / clicks) × 100`
   - `roi = revenue_generated / clicks`
4. Return sorted, enriched data

### **Phase 4: Dashboard Widget** ✅ (Can do now)

1. Create `<TopTrackingLinksCard>` component
2. Add to Overview dashboard (below KPI cards)
3. Implement sorting dropdown
4. Add platform icons (Instagram, TikTok, etc.)
5. Color-code performance (green = high ROI, red = low ROI)
6. Make clickable to expand full analytics

---

## 🧮 KEY CALCULATIONS

### **1. Subscribers Gained**

```typescript
// For each tracking link, count subscriptions where:
// - fan_id in (SELECT DISTINCT fan_id FROM fanvue_transactions WHERE tracking_link = link_url)
// - transaction_type = 'subscription'

const subscribersGained = await supabase
  .from('fanvue_transactions')
  .select('fan_id', { count: 'exact' })
  .eq('transaction_type', 'subscription')
  .eq('tracking_link', trackingLink.link_url) // Assuming we add this column
  .then(r => new Set(r.data?.map(t => t.fan_id)).size)
```

**Note:** Fanvue API doesn't provide `tracking_link` in transaction data! We'll need to:

- Store UTM parameters or link IDs when fans click links
- Match fan signups to tracking links via timing/attribution window
- **Alternative:** Use `clicks` data and estimate conversion based on new subscribers during click period

### **2. Revenue Generated**

```typescript
// Sum all revenue from fans who came via this tracking link
const revenueGenerated = await supabase
  .from('fanvue_transactions')
  .select('amount')
  .in('fan_id', fansFromThisLink)
  .then(r => r.data?.reduce((sum, tx) => sum + tx.amount, 0) || 0)
```

### **3. Conversion Rate**

```typescript
const conversionRate = (subscribersGained / clicks) * 100
```

### **4. ROI (Revenue Per Click)**

```typescript
const roi = revenueGenerated / clicks
```

---

## ⚠️ LIMITATIONS & WORKAROUNDS

### **Problem: Fanvue API doesn't track which fan came from which link**

**Fanvue API Provides:**

- ✅ Link URL and click count
- ❌ Which specific fans clicked which links
- ❌ Attribution data

**Workaround Options:**

1. **Estimation Method (Recommended for MVP):**
   - Use click timestamps + new subscriber timestamps
   - Attribute subscribers to link if they joined within 24h of clicks spike
   - Not 100% accurate but gives directional insights

2. **Future Enhancement (Requires Custom Tracking):**
   - Build custom landing page that captures UTM parameters
   - Store fan_id + tracking_link_id in database
   - Redirect to Fanvue with attribution intact

3. **API Request to Fanvue:**
   - Contact Fanvue support to add `utm_source` or `referral_id` to transaction data
   - Would enable perfect attribution

---

## 📊 EXAMPLE QUERIES

### **Get Top Links by ROI**

```typescript
const topLinks = await supabase
  .from('tracking_links')
  .select('*')
  .eq('agency_id', agencyId)
  .order('revenue_generated', { ascending: false })
  .limit(10)

// Calculate ROI on client
const enrichedLinks = topLinks.map(link => ({
  ...link,
  roi: link.clicks > 0 ? link.revenue_generated / link.clicks : 0,
  conversionRate: link.clicks > 0 ? (link.subscribers_gained / link.clicks) * 100 : 0,
}))

// Sort by ROI
enrichedLinks.sort((a, b) => b.roi - a.roi)
```

### **Get Click to Sub Conversion Rate**

```typescript
const totalClicks = trackingLinks.reduce((sum, link) => sum + link.clicks, 0)
const totalSubs = trackingLinks.reduce((sum, link) => sum + link.subscribers_gained, 0)

const clickToSubRate = totalClicks > 0 ? (totalSubs / totalClicks) * 100 : 0
```

---

## 🎨 UI MOCKUP

```typescript
<Card className="glass">
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle className="flex items-center gap-2">
        <Link2 className="h-5 w-5 text-primary" />
        Top Tracking Links
      </CardTitle>
      <Select value={sortBy} onValueChange={setSortBy}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="roi">Best ROI</SelectItem>
          <SelectItem value="revenue">Most Revenue</SelectItem>
          <SelectItem value="clicks">Most Clicks</SelectItem>
          <SelectItem value="subs">Most Subs</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      {topLinks.map((link, index) => (
        <div key={link.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold text-muted-foreground">
            #{index + 1}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <PlatformIcon platform={link.external_social_platform} />
              <span className="font-semibold">{link.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(link.created_at)}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <div className="flex items-center gap-1">
                <MousePointerClick className="h-4 w-4 text-blue-400" />
                <span>{link.clicks.toLocaleString()} clicks</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-teal-400" />
                <span>{link.subscribers_gained} subs</span>
                <span className="text-muted-foreground">
                  ({link.conversionRate.toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-green-400" />
                <span>${link.revenue_generated.toFixed(2)}</span>
                <span className="text-muted-foreground">
                  (${link.roi.toFixed(2)}/click)
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

---

## ✅ BENEFITS

1. **Identify Best Traffic Sources** → Focus marketing efforts
2. **Calculate True ROI** → Revenue per click, not just conversions
3. **Optimize Ad Spend** → Stop low-performing links
4. **Track Campaign Performance** → See which promotions work
5. **Data-Driven Decisions** → Replace guesswork with metrics

---

## 🚀 NEXT STEPS

**Would you like me to implement this now?**

I can:

1. ✅ Create the database migration
2. ✅ Build the sync cron job
3. ✅ Create the API endpoint
4. ✅ Add the dashboard widget

**Estimated Time:** 2-3 hours  
**Dependencies:** None (can start immediately)

---

**Last Updated:** Feb 3, 2026  
**Status:** 📋 AWAITING USER APPROVAL TO PROCEED

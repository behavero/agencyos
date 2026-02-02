# Phase 50 - The Content Brain (Asset ROI) ✅

## Status: COMPLETE

**Completion Date:** February 2, 2026

## Mission Accomplished

Built an intelligent Content ROI tracking system that connects financial data to content assets, enabling data-driven sales optimization through performance analytics and AI-powered recommendations.

---

## ✅ What Was Built

### 1. Database: Vault Performance Tracking

**Created:** `supabase/migrations/20260202_add_vault_performance.sql`

#### **Table: `vault_performance`**

Tracks comprehensive performance metrics for every content asset:

```sql
CREATE TABLE vault_performance (
  id UUID PRIMARY KEY,
  asset_id UUID REFERENCES content_assets(id),
  agency_id UUID REFERENCES agencies(id),

  -- Performance metrics
  times_sent INT DEFAULT 0,
  times_unlocked INT DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  conversion_rate FLOAT GENERATED ALWAYS AS (...) STORED, -- Auto-calculated

  -- Revenue breakdown
  revenue_from_ppv NUMERIC DEFAULT 0,
  revenue_from_tips NUMERIC DEFAULT 0,

  -- Engagement
  avg_tip_amount NUMERIC DEFAULT 0,
  unique_buyers INT DEFAULT 0,

  -- Timestamps
  first_sent_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ,
  last_sold_at TIMESTAMPTZ,

  UNIQUE(asset_id)
);
```

**Key Features:**

- ✅ **Auto-calculated conversion rate** using generated column
- ✅ **Revenue breakdown** (PPV vs Tips)
- ✅ **Performance ratings** (🔥 Hot, ✅ High, ⚡ Medium, ⚠️ Low, ❌ Cold)
- ✅ **Unique buyers tracking**
- ✅ **Historical timeline** (first sent, last sent, last sold)

**Database Functions:**

**`update_asset_performance(asset_id, revenue_delta, unlock_delta, send_delta, tip_delta)`**

- Upserts performance metrics for an asset
- Handles incremental updates
- Used by attribution engine

**`get_best_sellers(agency_id, days, limit)`**

- Returns top performing assets for a time period
- Orders by total revenue
- Filters by recent sales activity

**View: `top_performing_assets`**

- Pre-aggregated view joining `content_assets` + `vault_performance`
- Includes performance ratings
- Sorted by revenue

---

### 2. Asset Attribution Engine

**Created:** `src/lib/services/asset-attribution.ts`

#### **Core Functions:**

**`calculateAssetROI(agencyId)`**

- Calculates performance metrics for all assets
- Attributes revenue to specific content
- Updates `vault_performance` table
- Returns: `{ assetsUpdated, totalRevenue, errors }`

**`getAssetPerformance(agencyId, options)`**

Options:

- `sortBy`: 'revenue' | 'conversion' | 'recent'
- `limit`: Number of results
- `minConversion`: Minimum conversion rate filter

Returns array of:

```typescript
{
  assetId: string
  fileName: string
  fileUrl: string
  thumbnailUrl: string | null
  totalRevenue: number
  conversionRate: number
  times Sent/Unlocked: number
  performanceRating: 'Hot' | 'High' | 'Medium' | 'Low' | 'Cold'
}
```

**`getBestSellers(agencyId, days, limit)`**

- Gets top performers for a time period
- Used by Best Sellers widget
- Filters by `last_sold_at` date

**`trackAssetSent(assetId)`**

- Increments `times_sent` counter
- Updates `last_sent_at` timestamp

**`trackAssetUnlock(assetId, revenue, isTip)`**

- Increments `times_unlocked` counter
- Adds to `total_revenue`
- Splits into `revenue_from_ppv` / `revenue_from_tips`
- Updates `last_sold_at` timestamp

---

### 3. API Endpoints

#### **GET `/api/vault/performance`**

**Query Parameters:**

- `sortBy`: revenue | conversion | recent
- `limit`: Number of results (default: 10)
- `minConversion`: Minimum conversion rate filter

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "assetId": "uuid",
      "fileName": "blue-dress.mp4",
      "totalRevenue": 1245.5,
      "conversionRate": 45.2,
      "timesSent": 89,
      "timesUnlocked": 42,
      "performanceRating": "🔥 Hot"
    }
  ],
  "count": 10
}
```

#### **POST `/api/vault/calculate-roi`**

Triggers asset ROI calculations for all assets.

**Authorization:** Requires `owner`, `admin`, or `grandmaster` role

**Response:**

```json
{
  "success": true,
  "message": "Calculated ROI for 47 assets",
  "assetsUpdated": 47,
  "totalRevenue": 15420.8,
  "errors": []
}
```

#### **GET `/api/vault/best-sellers`**

**Query Parameters:**

- `days`: Time period (default: 7)
- `limit`: Number of results (default: 10)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "assetId": "uuid",
      "fileName": "sunset-beach.jpg",
      "totalRevenue": 890.0,
      "timesUnlocked": 34,
      "conversionRate": 38.6,
      "performanceRating": "🔥 Hot"
    }
  ],
  "period": "Last 7 days"
}
```

---

### 4. Enhanced Vault UI

**Updated:** `src/app/dashboard/content/vault/vault-client.tsx`

#### **New Features:**

**Performance Badges (Overlays):**

```
┌─────────────────┐
│  $890   45% 🔥  │ ← Revenue & Conversion Rate
│                 │
│                 │
│   [Image]       │
│                 │
│                 │
│    PPV $15      │ ← Original Price Tag
└─────────────────┘
```

**Performance Info in Cards:**

- Grid View: Shows "X sent / Y sold" + performance rating
- List View: Shows "$X revenue • Y% conversion"

**Sort Controls:**

- **Most Recent** (default)
- **💰 Revenue** (highest earning first)
- **🔥 Conversion** (highest conversion rate first)

**Calculate ROI Button:**

- Triggers `/api/vault/calculate-roi`
- Shows loading spinner
- Toast notification on success

**Color-Coded Borders:**

- 🟥 Red: Hot (>50% conversion)
- 🟩 Green: High (>20% conversion)
- 🟨 Yellow: Medium (>10% conversion)
- 🟧 Orange: Low (>5% conversion)
- ⬜ Gray: Cold (<5% conversion)

---

### 5. Best Sellers Dashboard Widget

**Created:** `src/components/dashboard/best-sellers-widget.tsx`

**Location:** Main Dashboard → Overview Tab (right column)

#### **Features:**

**Top 3 Assets Display:**

```
┌───────────────────────────────┐
│ 🔥 Top Performing Content     │
│ Best sellers this week        │
├───────────────────────────────┤
│ 1️⃣ [Thumbnail] Blue Dress    │
│    $1,245  •  45.2% conv     │
│    🔥 Hot  •  42 sales  [Send]│
├───────────────────────────────┤
│ 2️⃣ [Thumbnail] Gym Selfie    │
│    $890  •  38.6% conv       │
│    ✅ High  •  34 sales [Send]│
├───────────────────────────────┤
│ 3️⃣ [Thumbnail] Car Video     │
│    $634  •  28.1% conv       │
│    ✅ High  •  28 sales [Send]│
├───────────────────────────────┤
│      [View All Assets]        │
└───────────────────────────────┘
```

**Ranking Badges:**

- 🥇 1st Place: Gold gradient
- 🥈 2nd Place: Silver gradient
- 🥉 3rd Place: Bronze gradient

**Send Button:**

- Directly links to Messages page with `?assetId=XXX` query param
- Pre-selects asset for sending

**Empty State:**

- Shows when no sales data exists
- Prompts to start sending content

---

### 6. Alfred AI Integration

**Updated:** `src/lib/ai/tools.ts`

#### **New Tool: `find_best_content`**

**Description:** Recommends high-performing content based on ROI and conversion rates

**Parameters:**

```typescript
{
  limit?: number              // Number of recommendations (default: 5)
  minConversionRate?: number  // Filter threshold (e.g., 20 for 20%)
  fanType?: 'whale' | 'regular' | 'new'  // Target audience
}
```

**Fan Type Logic:**

- **Whale:** Recommends content with >$50 revenue or >30% conversion
- **New Subscriber:** Recommends lower-risk content (15-40% conversion, <$100 revenue)
- **Regular:** No special filtering

**Response Format:**

```json
{
  "fanType": "whale",
  "topPerformer": {
    "fileName": "blue-dress.mp4",
    "revenue": "$1,245",
    "conversionRate": "45.2%",
    "rating": "🔥 Hot",
    "tip": "Perfect for whales! High conversion rate and proven revenue generator."
  },
  "alternativeOptions": [
    { "fileName": "gym-selfie.jpg", "revenue": "$890", ... },
    { "fileName": "car-video.mp4", "revenue": "$634", ... }
  ],
  "insights": [
    "Top content has 45.2% conversion rate",
    "Average revenue per unlock: $30",
    "Sent 89 times, unlocked 42 times"
  ]
}
```

**Example Conversations:**

```
👤 User: "What should I send to a whale?"

🤖 Alfred: "For whale fans, I recommend the 'Blue Dress' video! 🔥

Performance:
• $1,245 total revenue
• 45.2% conversion rate
• Sent 89 times, unlocked 42 times
• Rating: Extremely Hot - Send this!

This content has consistently performed well with high spenders.
The average unlock value is $30, making it perfect for whales.

Alternative options:
1. Gym Selfie - $890 revenue, 38.6% conversion
2. Car Video - $634 revenue, 28.1% conversion

Want me to queue it up in Messages?"
```

```
👤 User: "What's my best content?"

🤖 Alfred: "Your top performer is the 'Blue Dress' video! 🔥

Stats:
• Total Revenue: $1,245
• Conversion Rate: 45.2%
• Performance: Extremely Hot

Insights:
• This is your money-maker! Send to high-value fans immediately.
• Average revenue per unlock: $30
• Sent 89 times with 42 unlocks

You have 4 other assets performing well. Want to see them?"
```

---

## 📊 Data Flow

```
┌─────────────────┐
│  User Uploads   │
│  Content Asset  │
└────────┬────────┘
         │
         ↓
┌─────────────────────┐
│  content_assets     │ ← Basic file metadata
└────────┬────────────┘
         │
         ↓
┌─────────────────────┐
│  Attribution Engine │ ← Calculates performance
│  (ROI Calculator)   │
└────────┬────────────┘
         │ Upserts
         ↓
┌─────────────────────┐
│  vault_performance  │ ← Performance metrics
└────────┬────────────┘
         │ Queries
         ↓
┌─────────────────────┐
│  Vault UI / Alfred  │ ← Displays insights
│  Best Sellers Widget│
└─────────────────────┘
```

---

## 🎯 Key Metrics Tracked

| Metric                 | Formula                             | Usage                       |
| ---------------------- | ----------------------------------- | --------------------------- |
| **Conversion Rate**    | `(timesUnlocked / timesSent) × 100` | Identifies high performers  |
| **Total Revenue**      | `Sum of all unlocks`                | Primary ROI indicator       |
| **ARPU**               | `totalRevenue / uniqueBuyers`       | Revenue per customer        |
| **PPV vs Tips**        | Separate revenue columns            | Understand revenue sources  |
| **Performance Rating** | Based on conversion %               | Quick visual classification |

---

## 🎨 UI/UX Highlights

### Vault Page Enhancements:

**Before Phase 50:**

- Simple grid of images
- No performance data
- Basic file info only

**After Phase 50:**

- Revenue badges on thumbnails
- Conversion rate indicators
- Performance rating emojis
- Color-coded borders
- Sort by performance
- Calculate ROI button

### Dashboard Widget:

**Visual Design:**

- Ranked medal system (🥇🥈🥉)
- Performance color coding
- Revenue and conversion metrics
- Direct "Send" action buttons
- Smooth loading states

---

## 🧪 Testing Guide

### 1. Seed Performance Data

```sql
-- Run calculate ROI via API or manually insert test data
INSERT INTO vault_performance (asset_id, agency_id, times_sent, times_unlocked, total_revenue)
VALUES
  ('asset-uuid-1', 'agency-uuid', 50, 25, 750.00),
  ('asset-uuid-2', 'agency-uuid', 30, 12, 420.00),
  ('asset-uuid-3', 'agency-uuid', 80, 8, 200.00);
```

### 2. Verify Conversion Rate Calculation

```sql
SELECT
  file_name,
  times_sent,
  times_unlocked,
  conversion_rate
FROM content_assets ca
JOIN vault_performance vp ON ca.id = vp.asset_id
WHERE ca.agency_id = 'your-agency-id';
```

**Expected:**

- Asset 1: 50% conversion (25/50)
- Asset 2: 40% conversion (12/30)
- Asset 3: 10% conversion (8/80)

### 3. Test Vault UI

1. Navigate to `/dashboard/content/vault`
2. Click "Calculate ROI" button
3. Change sort to "Revenue"
4. Verify revenue badges appear on assets
5. Check color-coded borders match performance ratings

### 4. Test Best Sellers Widget

1. Navigate to `/dashboard`
2. Scroll to "Top Performing Content" widget
3. Verify top 3 assets show
4. Click "Send" button → Should open Messages with `assetId` param

### 5. Test Alfred AI

**Query:** "What should I send to a whale?"

**Expected Response:**

- Recommends highest converting asset
- Provides revenue stats
- Gives performance rating
- Offers alternatives

---

## ⚙️ Configuration

### Environment Variables

No new environment variables required. Uses existing:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Database Migration

```bash
# Via Supabase CLI
supabase migration up

# Or via SQL Editor in Supabase Dashboard
# Paste contents of: supabase/migrations/20260202_add_vault_performance.sql
```

---

## 📈 Performance Ratings Explained

| Rating    | Conversion Rate | Color  | Recommendation                              |
| --------- | --------------- | ------ | ------------------------------------------- |
| 🔥 Hot    | ≥50%            | Red    | Send to high-value fans immediately         |
| ✅ High   | ≥20%            | Green  | Strong performer, use frequently            |
| ⚡ Medium | ≥10%            | Yellow | Decent option, test with different segments |
| ⚠️ Low    | ≥5%             | Orange | Consider improving or retiring              |
| ❌ Cold   | <5%             | Gray   | Avoid or completely rework                  |

---

## 🚀 Future Enhancements

### Phase 50B - Advanced Attribution (Future):

1. **Fan Segment Performance**
   - Track which content works best for different fan types
   - `whale_conversion_rate` vs `regular_conversion_rate`

2. **A/B Testing**
   - Compare two similar assets
   - Identify winning variants

3. **Content Decay Analysis**
   - Track performance over time
   - Identify when content becomes "stale"

4. **Automated Recommendations**
   - Auto-suggest content based on fan history
   - Predictive ROI modeling

5. **Content Tagging AI**
   - Auto-tag content attributes (outfit, setting, vibe)
   - Correlate tags with performance

---

## 📝 Commit History

```
feat(vault): Phase 50 - The Content Brain (Asset ROI Tracking)

- Created vault_performance table for tracking asset metrics
- Built asset attribution engine with ROI calculations
- Added performance tracking API endpoints
- Enhanced Vault UI with revenue badges and performance sorting
- Created Best Sellers dashboard widget (top 3 performers)
- Integrated Alfred AI with content recommendation tool
- Database function for auto-calculating conversion rates
- Color-coded performance ratings (Hot, High, Medium, Low, Cold)
- Smart filtering by fan type (whale, regular, new)
```

---

## ✅ Verification Checklist

- [x] Created `vault_performance` table migration
- [x] Implemented asset attribution engine
- [x] Added 3 API endpoints (performance, calculate-roi, best-sellers)
- [x] Enhanced Vault UI with performance metrics
- [x] Added revenue and conversion badges to asset cards
- [x] Implemented performance-based sorting
- [x] Created Best Sellers dashboard widget
- [x] Integrated widget into main dashboard
- [x] Added Alfred AI `find_best_content` tool
- [x] Tested fan type filtering (whale, regular, new)
- [x] No linting errors
- [x] No TypeScript errors
- [x] Documentation complete

---

**Phase 50 Status:** ✅ **COMPLETE**

**The Content Brain is now live! Assets now have ROI tracking, the Vault is a data-driven sales tool, and Alfred can recommend winning content!** 🧠💰🔥

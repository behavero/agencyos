# 📊 Fanvue Metrics Analysis

## What Data Can We Get from Fanvue API?

Based on the API documentation in `/docs/fanvue-api-docs/`, here's what we have access to:

### ✅ Available from Fanvue API

#### 1. Earnings/Transactions (`/insights/earnings`)

```json
{
  "date": "2025-06-24T21:23:44.070Z",
  "gross": 399, // in cents
  "net": 399, // after platform fees
  "currency": null,
  "source": "subscription", // or "tip", "message", "ppv", "post", "renewal"
  "user": {
    "uuid": "...",
    "handle": "supporting-owl-23",
    "displayName": "Supporting Owl",
    "nickname": null,
    "isTopSpender": false
  }
}
```

**Status**: ✅ Already syncing to `fanvue_transactions` table

#### 2. Top Spending Fans (`/insights/top-spenders`)

```json
{
  "uuid": "...",
  "handle": "...",
  "displayName": "...",
  "nickname": null,
  "spending": {
    "total": { "gross": 50000 }, // in cents
    "subscription": { "gross": 10000 },
    "message": { "gross": 20000 },
    "tip": { "gross": 15000 },
    "ppv": { "gross": 5000 }
  },
  "messageCount": 45
}
```

**Status**: ✅ Already syncing to `creator_top_spenders` table

#### 3. Subscriber Count Over Time (`/insights/subscribers`)

```json
{
  "date": "2025-06-24",
  "total": 100,
  "newSubscribersCount": 5,
  "cancelledSubscribersCount": 2
}
```

**Status**: ✅ Already syncing to `subscriber_history` table

#### 4. Individual Fan Insights (`/insights/fans/{userUuid}`)

```json
{
  "status": "subscriber", // or "expired", "follower", "not_contactable"
  "spending": {
    "total": { "gross": 50000 },
    "maxSinglePayment": { "gross": 10000 },
    "averagePayment": { "gross": 2500 }
  },
  "messageCount": 45,
  "firstPurchase": "2025-01-01T...",
  "lastPurchase": "2025-06-24T..."
}
```

**Status**: ⏳ Could add per-fan detail pages

#### 5. Smart Lists (Followers/Subscribers Exact Count)

```json
{
  "lists": [
    { "uuid": "subscribers", "title": "Subscribers", "memberCount": 23 },
    { "uuid": "followers", "title": "Followers", "memberCount": 2721 },
    { "uuid": "auto_renewing", "title": "Auto-renewing", "memberCount": 15 }
  ]
}
```

**Status**: ✅ Already using in creator stats API

---

## ✅ Metrics We CAN Calculate

Based on available data, here are accurate metrics:

### Revenue Metrics

| Metric              | Formula                         | Data Source                      | Status     |
| ------------------- | ------------------------------- | -------------------------------- | ---------- |
| **Total Revenue**   | Sum of all transactions         | `fanvue_transactions.amount`     | ✅ Working |
| **Net Revenue**     | Sum of net amounts              | `fanvue_transactions.net_amount` | ✅ Working |
| **Revenue by Type** | Group by `transaction_type`     | `fanvue_transactions`            | ✅ Working |
| **Revenue Growth**  | (Current - Previous) / Previous | `fanvue_transactions`            | ✅ Working |

### Subscriber Metrics

| Metric                   | Formula           | Data Source                                                    | Status     |
| ------------------------ | ----------------- | -------------------------------------------------------------- | ---------- |
| **Active Subscribers**   | Current count     | `models.subscribers_count` or Smart Lists                      | ✅ Working |
| **Subscriber Growth**    | Daily net change  | `subscriber_history.new_subscribers` - `cancelled_subscribers` | ✅ Working |
| **Churn Rate**           | Cancelled / Total | `subscriber_history`                                           | ✅ Can add |
| **New Subs This Period** | Sum of new        | `subscriber_history.new_subscribers`                           | ✅ Working |

### Fan Engagement Metrics

| Metric                 | Formula                            | Data Source                              | Status     |
| ---------------------- | ---------------------------------- | ---------------------------------------- | ---------- |
| **ARPU**               | Total Revenue / Active Subscribers | Transactions ÷ Subscriber count          | ✅ Working |
| **LTV**                | ARPU × Average Lifetime (6 months) | Calculated                               | ✅ Working |
| **Average Tip**        | Sum of tips / Tip count            | `fanvue_transactions` where `type='tip'` | ✅ Working |
| **Unique Paying Fans** | Count distinct `fan_id`            | `fanvue_transactions.fan_id`             | ✅ Working |
| **Top Spenders**       | Sorted by total spent              | `creator_top_spenders`                   | ✅ Working |

### Transaction Metrics

| Metric                 | Formula                            | Data Source           | Status     |
| ---------------------- | ---------------------------------- | --------------------- | ---------- |
| **Total Transactions** | Count all                          | `fanvue_transactions` | ✅ Working |
| **Paid Messages**      | Count where `type='message'`       | `fanvue_transactions` | ✅ Working |
| **PPV Sales**          | Count where `type='ppv' OR 'post'` | `fanvue_transactions` | ✅ Working |
| **Tips Count**         | Count where `type='tip'`           | `fanvue_transactions` | ✅ Working |

### Content Performance

| Metric                    | Formula                                 | Data Source                   | Status     |
| ------------------------- | --------------------------------------- | ----------------------------- | ---------- |
| **Golden Ratio**          | (Messages + PPV + Tips) / Subscriptions | Transaction revenue breakdown | ✅ Working |
| **PPV Revenue Share**     | PPV Revenue / Total Revenue             | `fanvue_transactions`         | ✅ Can add |
| **Message Revenue Share** | Message Revenue / Total Revenue         | `fanvue_transactions`         | ✅ Can add |

---

## ❌ Metrics We CANNOT Calculate

These require data NOT available in the Fanvue API:

### 1. **True Unlock Rate / Conversion Rate**

**Why**: We only see PURCHASES, not how many PPVs/messages were SENT

- ❌ PPV Unlock Rate = (PPV Purchased / PPV Sent) × 100
- ❌ Message Open Rate = (Messages Opened / Messages Sent) × 100

**What we have instead**:

- ✅ PPV Purchase Rate = (PPV Buyers / Total Subscribers) × 100
- ✅ Message Purchase Rate = (Message Buyers / Total Subscribers) × 100

### 2. **Click-to-Subscribe Rate**

**Why**: No tracking link click data in API

- ❌ Click to Sub Rate = (New Subs / Link Clicks) × 100

**What we have instead**:

- ✅ Subscriber Growth Count (net new subs per day)
- ✅ Subscriber Growth Rate (% change)

### 3. **Posts Count / Engagement**

**Why**: Not included in earnings or insights API

- ❌ Total Posts
- ❌ Likes per post
- ❌ Comments per post

**What we have instead**:

- ✅ PPV Sales Count (posts that generated revenue)
- ✅ Post Revenue (total from paid posts)

### 4. **Content Sent (Non-Revenue)**

**Why**: Only revenue transactions are tracked

- ❌ Free messages sent
- ❌ Free posts published
- ❌ Stories posted

---

## 🎯 Recommended Metrics for Dashboard

### Overview Tab (High-Level)

1. **Gross Revenue** - Total revenue all-time ✅
2. **Net Profit** - Revenue minus platform fees ✅
3. **Active Subscribers** - Current subscriber count ✅
4. **Revenue Growth** - % change vs previous period ✅

### Fanvue & Finance Tab (Detailed)

#### Revenue Cards

1. **Total Revenue** - All-time or period ✅
2. **Net Revenue** - After fees ✅
3. **ARPU** - Average revenue per subscriber ✅
4. **Average Tip** - Per tip transaction ✅
5. **LTV** - Lifetime value estimate ✅
6. **Golden Ratio** - Content monetization efficiency ✅

#### Engagement Cards

7. **Paid Messages** - Count of message purchases ✅
8. **PPV Sales** - Count of PPV/post purchases ✅
9. **New Fans** - New subscribers in period ✅
10. **Unique Buyers** - Distinct fans who purchased ✅
11. **Top Spenders** - VIP fan list ✅

#### Purchase Rates (NOT Unlock Rates!)

12. **PPV Purchase Rate** - (PPV Buyers / Subs) × 100 ✅
13. **Message Purchase Rate** - (Message Buyers / Subs) × 100 ✅
14. **Tip Rate** - (Tippers / Subs) × 100 ✅

---

## 🔄 Metrics to Replace

| Current (Misleading)         | Replacement (Accurate)          | Reason                                           |
| ---------------------------- | ------------------------------- | ------------------------------------------------ |
| ❌ Message Conv. Rate: 73.9% | ✅ Message Purchase Rate: 73.9% | We don't track messages SENT, only purchases     |
| ❌ PPV Conv. Rate: 0%        | ✅ PPV Purchase Rate: 0%        | We don't track PPVs SENT, only purchases         |
| ❌ Click to Sub Rate: 0%     | ✅ Subscriber Growth: +5 new    | No tracking link data available                  |
| ❌ Unlock Rate: 0%           | ✅ PPV Sales: 2 purchases       | "Unlock" implies sent/opened ratio we don't have |

---

## 📈 Formula Reference

### Current Correct Formulas

```typescript
// Revenue Metrics
Total Revenue = SUM(fanvue_transactions.amount)
Net Revenue = SUM(fanvue_transactions.net_amount)
Revenue Growth = ((Current Period - Previous Period) / Previous Period) × 100

// Subscriber Metrics
ARPU = Total Revenue / Active Subscribers
LTV = ARPU × 6 months (estimated lifetime)
New Fans = COUNT(DISTINCT fan_id in period)

// Content Performance
Golden Ratio = (Message + PPV + Tip Revenue) / Subscription Revenue
Average Tip = SUM(tips) / COUNT(tips)

// Purchase Rates (NOT unlock rates)
PPV Purchase Rate = (COUNT(DISTINCT fans who bought PPV) / Total Subscribers) × 100
Message Purchase Rate = (COUNT(DISTINCT fans who bought messages) / Total Subscribers) × 100
Tip Rate = (COUNT(DISTINCT fans who tipped) / Total Subscribers) × 100
```

### Proposed New Formulas

```typescript
// Revenue Share Metrics
PPV Revenue Share = (PPV Revenue / Total Revenue) × 100
Message Revenue Share = (Message Revenue / Total Revenue) × 100
Subscription Revenue Share = (Subscription Revenue / Total Revenue) × 100

// Fan Value Metrics
Average Fan Value = Total Revenue / Unique Paying Fans
Revenue Per Transaction = Total Revenue / Total Transactions
Average Transaction Size = SUM(amounts) / COUNT(transactions)

// Growth Metrics
Subscriber Growth Rate = ((Current Subs - Previous Subs) / Previous Subs) × 100
Revenue Growth Rate = ((Current Revenue - Previous Revenue) / Previous Revenue) × 100
Churn Rate = (Cancelled Subs / Total Subs at Start of Period) × 100
```

---

## ✅ Action Items

### Immediate (Fix Misleading Metrics)

1. [ ] Rename "Message Conv. Rate" → "Message Purchase Rate"
2. [ ] Rename "PPV Conv. Rate" → "PPV Purchase Rate"
3. [ ] Remove "Click to Sub Rate" (no data) or replace with "Subscriber Growth"
4. [ ] Rename "Unlock Rate" → "PPV Sales Count"
5. [ ] Update tooltips to explain what each metric actually measures

### Short-term (Add Missing Metrics)

1. [ ] Add "Revenue Share" pie chart (Subscription vs PPV vs Messages vs Tips)
2. [ ] Add "Churn Rate" calculation from subscriber_history
3. [ ] Add "Average Fan Value" (Revenue / Unique Buyers)
4. [ ] Add "Revenue Per Transaction"

### Long-term (Enhanced Features)

1. [ ] Individual fan detail pages using `/insights/fans/{uuid}`
2. [ ] Cohort analysis (subscriber lifetime by signup month)
3. [ ] Predictive LTV based on actual retention data
4. [ ] A/B testing for content pricing

---

## 🎯 Key Takeaway

**We should focus on metrics we can ACCURATELY calculate** rather than try to match metrics from other platforms that have different data sources.

Our advantage: We have ALL transaction data, which lets us calculate:

- Exact revenue breakdowns
- True ARPU
- Individual fan value
- Content performance by type

Our limitation: We don't track non-revenue actions (sends, views, etc), so we can't calculate true "conversion rates" or "unlock rates" - only "purchase rates".

**Solution**: Rename metrics to reflect what they actually measure, and add tooltips explaining the formulas!

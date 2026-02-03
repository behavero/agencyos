# KPI Formulas Reference

**Last Updated**: February 3, 2026  
**Status**: ✅ All formulas mathematically correct and verified

---

## 📊 **Core Revenue Metrics**

### **1. ARPU (Average Revenue Per User)**

```
Formula: Total Revenue / (Total Subscribers + Total Followers)
Example: $13,626 / (15 + 2,343) = $5.78
```

- **What it measures**: Average revenue generated per person in your total audience
- **Why it matters**: Shows monetization efficiency across your entire fanbase
- **Fixed**: Was dividing by subscribers only ($307), now includes followers

---

### **2. Avg Tip**

```
Formula: Total Tip Amount / Total Tip Count
Example: $914.21 / 51 = $17.93
Database Query: COUNT(*) for tips + SUM(amount) for total
```

- **What it measures**: Average value per tip transaction
- **Why it matters**: Indicates fan generosity and tip pricing effectiveness
- **Fixed**: Now uses COUNT query instead of array length (was $33, now $17.93)

---

### **3. LTV (Lifetime Value)**

```
Formula: Total Revenue / Total Subscribers
Example: $13,626 / 15 = $908.40
```

- **What it measures**: Average total revenue generated per subscriber over their lifetime
- **Why it matters**: Shows long-term subscriber value for acquisition cost decisions
- **Fixed**: Was using ARPU × 6 estimate ($1,843), now uses actual data

---

### **4. Golden Ratio**

```
Formula: (Message + PPV + Post + Tip Revenue) / Subscription Revenue
Example: ($10,276 + $958 + $914) / $1,677 = 7.24
```

- **What it measures**: Content monetization vs subscription revenue ratio
- **Why it matters**: Higher ratio = better content engagement and upselling
- **Best Practice**: Aim for 5:1 or higher (industry standard)

---

## 📈 **Transaction Metrics**

### **5. Messages Sent (Purchased)**

```
Formula: COUNT(*) WHERE transaction_type = 'message'
Example: 336 messages
Database Query: Uses COUNT(*) with exact count, not array length
```

- **What it measures**: Total paid message transactions in period
- **Why it matters**: Tracks message monetization volume
- **Fixed**: Was showing 137 (10K sample limit), now shows 336 (accurate count)

---

### **6. PPV Sent (Purchased)**

```
Formula: COUNT(*) WHERE transaction_type IN ('ppv', 'post')
Example: 100 posts/PPV
Database Query: Uses COUNT(*) with exact count
```

- **What it measures**: Total paid post/PPV unlock transactions
- **Why it matters**: Tracks content monetization beyond subscriptions
- **Fixed**: Was showing 54 (sample), now shows 100 (accurate)

---

### **7. New Fans**

```
Formula: COUNT(DISTINCT fan_id) in period
Example: 726 unique buyers
```

- **What it measures**: Unique fans who made purchases in the selected period
- **Why it matters**: Indicates acquisition and engagement growth
- **Note**: This counts unique buyers, not total subs/followers

---

## 🎯 **Conversion Metrics**

### **8. Message Purchase Rate**

```
Formula: (Total Messages Purchased / Total Subscribers) × 100
Example: (336 / 15) × 100 = 2,240%
```

- **What it measures**: Average messages purchased per subscriber (as %)
- **Why it matters**: Shows message buying frequency
- **Renamed**: Was "Message Conv. Rate" (misleading), now "Message Purchase Rate"
- **Note**: >100% means subscribers buy multiple messages (expected)

---

### **9. PPV Purchase Rate**

```
Formula: (Total PPV Purchased / Total Subscribers) × 100
Example: (100 / 15) × 100 = 666.7%
```

- **What it measures**: Average PPV/posts purchased per subscriber (as %)
- **Why it matters**: Shows content unlock frequency
- **Renamed**: Was "PPV Conv. Rate", now "PPV Purchase Rate"

---

## ⚠️ **N/A Metrics (Requires Additional Tracking)**

### **10. Unlock Rate**

```
Status: N/A - Requires chat tool tracking
Formula (when available): (PPV Opened / PPV Sent) × 100
```

- **What it measures**: % of sent PPV messages that were unlocked/opened
- **Why N/A**: Fanvue API only provides "PPV purchased" data, not "PPV sent"
- **Implementation**: Will be available when chat tool tracks outbound PPV messages

---

### **11. Click to Sub Rate**

```
Status: N/A - Requires tracking link implementation
Formula (when available): (New Subs from Links / Total Clicks) × 100
```

- **What it measures**: Conversion rate from tracking link clicks to subscriptions
- **Why N/A**: No tracking links currently deployed
- **Implementation**: Set up Fanvue tracking links and correlate with subscriber growth

---

## 📊 **Data Sources**

| Metric         | Data Source                               | Query Type             |
| -------------- | ----------------------------------------- | ---------------------- |
| ARPU           | `fanvue_transactions` + `models`          | SUM + COUNT            |
| Avg Tip        | `fanvue_transactions` (type='tip')        | SUM / COUNT            |
| LTV            | `fanvue_transactions` + `models`          | SUM / COUNT            |
| Golden Ratio   | `fanvue_transactions`                     | SUM by type            |
| Messages Sent  | `fanvue_transactions` (type='message')    | COUNT(\*)              |
| PPV Sent       | `fanvue_transactions` (type='ppv'/'post') | COUNT(\*)              |
| New Fans       | `fanvue_transactions`                     | COUNT(DISTINCT fan_id) |
| Purchase Rates | `fanvue_transactions` + `models`          | COUNT / COUNT          |

---

## 🔧 **Technical Implementation Notes**

### **Query Optimization**

1. **Use COUNT queries** for transaction counts (not array length)

   ```sql
   SELECT COUNT(*) FROM fanvue_transactions
   WHERE transaction_type = 'message'
   ```

2. **Bypass Supabase 1,000-row limit**

   ```typescript
   .select('*', { count: 'exact', head: true }) // For counts
   .limit(50000) // For revenue calculations
   ```

3. **Consolidated models query**
   ```sql
   SELECT subscribers_count, followers_count FROM models
   -- Fetch once, use for multiple calculations
   ```

### **Date Filtering**

- All metrics respect date range filters (All Time, Last 30 Days, Custom, etc.)
- Server-side: `getDateRange()` converts preset → start/end dates
- Client-side: `DateRangeFilter` component manages state

---

## 📈 **Expected Values (Lana's Account - All Time)**

| Metric             | Value       | Source                     |
| ------------------ | ----------- | -------------------------- |
| Total Revenue      | $13,626.40  | Database verified          |
| Total Transactions | 3,517       | All types                  |
| Subscribers        | 15          | Current                    |
| Followers          | 2,343       | Current                    |
| **ARPU**           | **$5.78**   | $13,626 / 2,358            |
| **Avg Tip**        | **$17.93**  | $914 / 51                  |
| **LTV**            | **$908.40** | $13,626 / 15               |
| **Messages**       | **336**     | Message transactions       |
| **PPV/Posts**      | **100**     | Post transactions          |
| **Golden Ratio**   | **7.24**    | Interaction / Subscription |

---

## 🎯 **Next Steps**

### **Phase 1: Current (Done ✅)**

- ✅ Fix ARPU calculation (total audience)
- ✅ Fix Avg Tip (accurate COUNT)
- ✅ Fix Messages/PPV counts (COUNT queries)
- ✅ Fix LTV formula
- ✅ Rename conversion rates to purchase rates

### **Phase 2: Tracking Links**

- [ ] Implement Fanvue tracking links
- [ ] Track clicks → subscriber conversion
- [ ] Enable "Click to Sub Rate"

### **Phase 3: Chat Tool Integration**

- [ ] Track outbound PPV messages sent
- [ ] Track PPV unlock/open events
- [ ] Enable "Unlock Rate" metric

### **Phase 4: Historical Data**

- [ ] Implement `subscriber_history` tracking (daily snapshots)
- [ ] Build "Audience Growth" chart with real historical data
- [ ] Track subscriber churn/retention

---

## 📚 **Reference Documents**

- **API Documentation**: `/docs/fanvue-api-docs/`
- **Development Rules**: `/docs/DEVELOPMENT_RULES.md`
- **Dashboard Fix Summary**: `/DASHBOARD_FIX_SUMMARY.md`
- **Metrics Analysis**: `/FANVUE_METRICS_ANALYSIS.md`

---

**Questions or Issues?**  
Refer to this document for accurate KPI definitions and formulas.

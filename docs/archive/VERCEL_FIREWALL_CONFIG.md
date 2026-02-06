# 🔒 Vercel Firewall Configuration

## Overview

This document outlines the recommended Vercel Firewall rules for the OnyxOS dashboard to protect against malicious traffic, bots, and DDoS attacks.

---

## 🛡️ Firewall Rules (Configure in Vercel Dashboard)

### Rule 1: Rate Limiting for API Routes

**Purpose:** Prevent API abuse and DDoS attacks

```javascript
{
  "name": "API Rate Limiting",
  "action": "rate_limit",
  "conditions": {
    "path_prefix": ["/api/"]
  },
  "rateLimit": {
    "requests": 100,
    "window": "1m"
  }
}
```

**What it does:**

- Limits each IP to 100 API requests per minute
- Returns 429 (Too Many Requests) when exceeded
- Protects `/api/analytics`, `/api/agency`, etc.

---

### Rule 2: Challenge Suspicious Bots

**Purpose:** Block scraping bots and automated attacks

```javascript
{
  "name": "Challenge Suspicious Bots",
  "action": "challenge",
  "conditions": {
    "threats": ["bot", "scraper"]
  }
}
```

**What it does:**

- Shows CAPTCHA to suspected bots
- Uses Vercel's bot detection AI
- Allows legitimate traffic through

---

### Rule 3: Block Known Attack Sources

**Purpose:** Block traffic from high-risk countries

```javascript
{
  "name": "Block High-Risk Countries",
  "action": "deny",
  "conditions": {
    "country_code": {
      "operator": "in",
      "values": ["CN", "RU", "KP", "IR"]
    }
  },
  "exceptions": {
    "path_prefix": ["/api/webhook"]
  }
}
```

**What it does:**

- Blocks traffic from countries with high bot activity
- Exception for webhook endpoints (Fanvue webhooks)
- Returns 403 (Forbidden)

---

### Rule 4: Protect Authentication Endpoints

**Purpose:** Prevent brute force attacks on login

```javascript
{
  "name": "Login Rate Limiting",
  "action": "rate_limit",
  "conditions": {
    "path": {
      "operator": "in",
      "values": [
        "/api/auth/signin",
        "/api/oauth/callback"
      ]
    }
  },
  "rateLimit": {
    "requests": 5,
    "window": "5m"
  }
}
```

**What it does:**

- Limits login attempts to 5 per 5 minutes
- Prevents brute force password attacks
- Protects OAuth callback endpoints

---

### Rule 5: Challenge Expensive API Endpoints

**Purpose:** Protect resource-intensive endpoints

```javascript
{
  "name": "Challenge Analytics API",
  "action": "challenge",
  "conditions": {
    "path_prefix": ["/api/analytics/"]
  },
  "rateLimit": {
    "requests": 30,
    "window": "1m"
  }
}
```

**What it does:**

- Rate limits analytics API to 30 req/min
- Shows CAPTCHA if exceeded
- Protects database from heavy queries

---

## 📋 Implementation Steps

### Option A: Via Vercel Dashboard (Recommended)

1. Go to: https://vercel.com/behaveros-projects/agencyos-react/settings/firewall
2. Click "Add Rule"
3. Configure each rule above one by one
4. Test with: `curl -I https://onyxos.vercel.app/api/analytics/dashboard`

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy with firewall config
vercel --prod
```

### Option C: Programmatic (Advanced)

Create `vercel-firewall.json`:

```json
{
  "firewall": {
    "rules": [
      {
        "name": "API Rate Limiting",
        "action": "rate_limit",
        "conditions": {
          "path_prefix": ["/api/"]
        },
        "rateLimit": {
          "requests": 100,
          "window": "1m"
        }
      }
    ]
  }
}
```

---

## 🧪 Testing Firewall Rules

### Test Rate Limiting

```bash
# Should succeed first 5 times, then fail
for i in {1..10}; do
  curl -I https://onyxos.vercel.app/api/auth/signin
  sleep 1
done
```

### Test Bot Detection

```bash
# Should be challenged
curl -A "python-requests/2.28.1" https://onyxos.vercel.app/
```

### Test Geographic Blocking

```bash
# Use VPN to test from blocked countries
# Should return 403 Forbidden
```

---

## 📊 Monitoring

### View Firewall Logs

1. Go to: https://vercel.com/behaveros-projects/agencyos-react/logs
2. Filter by "Firewall"
3. Look for blocked/challenged requests

### Key Metrics to Track

- **Blocked Requests:** Should be < 5% of total traffic
- **Challenge Success Rate:** Should be > 90%
- **False Positives:** Monitor for legitimate users being blocked

---

## ⚠️ Important Notes

1. **Webhook Endpoints:** Exclude `/api/webhook/*` from geographic blocking
2. **Admin Access:** Whitelist your office IP if needed
3. **Testing:** Use staging environment first
4. **Monitoring:** Enable alerts for high block rates

---

## 🔄 Recommended Schedule

**Review firewall rules:**

- Weekly: Check blocked requests log
- Monthly: Adjust rate limits based on usage
- Quarterly: Update country block list

---

## 🆘 Troubleshooting

### Issue: Legitimate users being blocked

**Solution:**

1. Check firewall logs for their IP
2. Add IP to whitelist in firewall settings
3. Adjust rate limits if too aggressive

### Issue: API still getting hammered

**Solution:**

1. Lower rate limit thresholds
2. Enable challenge mode instead of rate_limit
3. Add IP blocking for repeat offenders

### Issue: Webhooks failing

**Solution:**

1. Check webhook source IPs
2. Add exception rule for webhook paths
3. Whitelist Fanvue's IP ranges

---

## 📚 Resources

- [Vercel Firewall Docs](https://vercel.com/docs/security/vercel-firewall)
- [Rate Limiting Best Practices](https://vercel.com/docs/security/rate-limiting)
- [Bot Detection](https://vercel.com/docs/security/bot-detection)

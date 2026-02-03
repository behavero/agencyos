# 🔒 Programmatic Firewall Configuration

**Yes! You CAN configure Vercel Firewall through the API!** 🎉

While the Vercel MCP doesn't expose firewall tools directly, the **Vercel REST API** provides full programmatic access to firewall configuration.

---

## 🚀 Quick Setup

### Option 1: Automated Script (Recommended)

**1. Get your Vercel API Token:**

```bash
# Create token at: https://vercel.com/account/tokens
export VERCEL_TOKEN=your_token_here
```

**2. Run the setup script:**

```bash
./scripts/setup-firewall.sh
```

Done! Your firewall is now configured. 🎉

---

### Option 2: Manual TypeScript Execution

**1. Install tsx globally:**

```bash
npm install -g tsx
```

**2. Run the configuration script:**

```bash
export VERCEL_TOKEN=your_token_here
tsx scripts/configure-firewall.ts
```

---

### Option 3: Add to package.json (Recommended for CI/CD)

Add to your `package.json`:

```json
{
  "scripts": {
    "setup:firewall": "tsx scripts/configure-firewall.ts"
  }
}
```

Then run:

```bash
export VERCEL_TOKEN=your_token_here
npm run setup:firewall
```

---

## 📋 What Gets Configured

The script automatically creates these 5 firewall rules:

### Rule 1: API Rate Limiting ⚡

- **Action:** Rate limit
- **Target:** `/api/*`
- **Limit:** 100 requests per minute per IP
- **On Exceed:** Deny for 1 minute

### Rule 2: Bot Challenge 🤖

- **Action:** Challenge with CAPTCHA
- **Target:** Suspicious bot traffic
- **Detection:** JA3 fingerprinting

### Rule 3: Geographic Blocking 🌍

- **Action:** Deny
- **Target:** CN, RU, KP, IR traffic
- **Status:** **Disabled by default** (enable if needed)
- **Exception:** Webhook endpoints (`/api/webhook/*`)

### Rule 4: Login Protection 🔐

- **Action:** Rate limit
- **Target:** `/api/auth/signin`, `/api/oauth/*`
- **Limit:** 5 attempts per 5 minutes
- **On Exceed:** Block for 10 minutes

### Rule 5: Analytics API Throttling 📊

- **Action:** Challenge
- **Target:** `/api/analytics/*`
- **Limit:** 30 requests per minute
- **On Exceed:** Show CAPTCHA

### Managed Rules (FREE) 🆓

- ✅ **Bot Protection:** Challenge non-browser requests
- ✅ **AI Bot Blocking:** Block AI scrapers (GPT crawlers, etc.)

---

## 🔧 Customization

### Modify Rate Limits

Edit `scripts/configure-firewall.ts`:

```typescript
{
  name: 'API Rate Limiting',
  active: true,
  action: 'rate_limit',
  rateLimit: {
    algo: 'fixed_window',
    window: 60,        // Change time window (seconds)
    limit: 200,        // Change request limit (was 100)
    keys: ['ip'],      // Can also use ['ip', 'user_id']
    action: 'deny',
    actionDuration: '120s', // Change block duration
  },
}
```

### Enable Geographic Blocking

Change `active: false` to `active: true`:

```typescript
{
  name: 'Block High-Risk Countries',
  active: true,  // ← Change this
  action: 'deny',
  conditionGroup: {
    operator: 'and',
    conditions: [
      {
        type: 'geo_country',
        op: 'in',
        value: ['CN', 'RU', 'KP', 'IR'], // Add/remove countries
      },
    ],
  },
}
```

### Add New Rules

Add to the `FIREWALL_RULES` array:

```typescript
{
  name: 'Block Specific User Agent',
  active: true,
  action: 'deny',
  conditionGroup: {
    operator: 'and',
    conditions: [
      {
        type: 'header',
        key: 'user-agent',
        op: 'inc',
        value: 'BadBot',
      },
    ],
  },
}
```

---

## 🔍 Available Condition Types

The Vercel Firewall API supports these condition types:

| Type          | Description     | Example              |
| ------------- | --------------- | -------------------- |
| `path`        | URL path        | `/api/auth/*`        |
| `header`      | HTTP header     | `user-agent: BadBot` |
| `geo_country` | Country code    | `CN`, `RU`           |
| `geo_city`    | City name       | `Moscow`             |
| `ip`          | IP address      | `192.168.1.1`        |
| `ja3`         | TLS fingerprint | Bot detection        |
| `method`      | HTTP method     | `GET`, `POST`        |
| `host`        | Hostname        | `api.example.com`    |
| `scheme`      | Protocol        | `http`, `https`      |

### Operators

| Operator | Description     | Example               |
| -------- | --------------- | --------------------- |
| `eq`     | Equals          | `path eq /api/auth`   |
| `neq`    | Not equals      | `method neq POST`     |
| `inc`    | Contains        | `user-agent inc bot`  |
| `ninc`   | Not contains    | `path ninc admin`     |
| `pre`    | Starts with     | `path pre /api/`      |
| `npre`   | Not starts with | `path npre /public`   |
| `in`     | In list         | `country in [CN,RU]`  |
| `nin`    | Not in list     | `country nin [US,CA]` |

---

## 📊 Monitoring & Testing

### View Firewall Logs

```bash
# Via Vercel CLI
vercel logs --project agencyos-react --filter firewall

# Or visit dashboard
https://vercel.com/behaveros-projects/agencyos-react/logs
```

### Test Rate Limiting

```bash
# Should succeed first 5 times, then fail
for i in {1..10}; do
  curl -I https://onyxos.vercel.app/api/auth/signin
  sleep 1
done

# Expected: First 5 succeed (200), last 5 fail (429)
```

### Test Bot Challenge

```bash
# Should trigger CAPTCHA
curl -A "python-requests/2.28.1" https://onyxos.vercel.app/

# Expected: Challenge response or 403
```

### Test Geographic Blocking (if enabled)

```bash
# Use VPN to simulate traffic from blocked country
# Should return 403 Forbidden
```

---

## 🔐 Security Best Practices

### 1. Whitelist Your IPs

If you have static IPs that should never be blocked:

```typescript
{
  name: 'Whitelist Office IP',
  active: true,
  action: 'bypass',
  conditionGroup: {
    operator: 'and',
    conditions: [
      {
        type: 'ip',
        op: 'in',
        value: ['203.0.113.0/24'], // Your CIDR range
      },
    ],
  },
  bypassSystem: true, // Bypass ALL firewall rules
}
```

### 2. Exclude Webhooks from Rate Limiting

Already implemented in the script:

```typescript
{
  type: 'path',
  op: 'npre',
  value: '/api/webhook', // Exclude webhooks
}
```

### 3. Progressive Rate Limiting

Instead of blocking immediately, challenge first:

```typescript
rateLimit: {
  algo: 'token_bucket',
  window: 60,
  limit: 100,
  keys: ['ip'],
  action: 'challenge', // Show CAPTCHA instead of deny
}
```

---

## 🚨 Troubleshooting

### Issue: "Unauthorized" Error

**Solution:**

```bash
# Check your token has correct permissions
curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  https://api.vercel.com/v2/user

# Should return your user info
```

### Issue: Rules Not Applying

**Solution:**

1. Check rule is `active: true`
2. Verify priority order (lower = first)
3. Check condition syntax
4. View logs for errors

### Issue: Legitimate Traffic Blocked

**Solution:**

1. Check firewall logs for blocked IPs
2. Add whitelist rule for those IPs
3. Adjust rate limits upward
4. Use `challenge` instead of `deny`

### Issue: API Still Getting Hammered

**Solution:**

1. Lower rate limits
2. Enable geographic blocking
3. Add IP blocking rules
4. Enable "Attack Mode" in dashboard

---

## 📚 API Reference

### REST API Endpoints

**Create Rule:**

```bash
POST https://api.vercel.com/v1/security/firewall/config
  ?projectId=prj_xxx
  &teamId=team_xxx
```

**Update Rule:**

```bash
PUT https://api.vercel.com/v1/security/firewall/config
  ?projectId=prj_xxx
  &teamId=team_xxx
```

**Delete Rule:**

```bash
DELETE https://api.vercel.com/v1/security/firewall/config
  ?projectId=prj_xxx
  &teamId=team_xxx
```

**Get Config:**

```bash
GET https://api.vercel.com/v1/security/firewall/config
  ?projectId=prj_xxx
  &teamId=team_xxx
```

### Headers

```bash
Authorization: Bearer YOUR_VERCEL_TOKEN
Content-Type: application/json
```

---

## 🎯 Next Steps

1. ✅ Run `./scripts/setup-firewall.sh`
2. ✅ View rules in dashboard: https://vercel.com/behaveros-projects/agencyos-react/settings/firewall
3. ✅ Test your API endpoints
4. ✅ Monitor firewall logs
5. ✅ Adjust rate limits based on usage

---

## 💡 Pro Tips

1. **Start Conservative:** Begin with high rate limits, then lower them based on actual usage
2. **Use Challenges:** `challenge` is better than `deny` for first-time offenders
3. **Monitor Logs:** Check weekly for false positives
4. **Test Before Prod:** Use preview deployments to test rules
5. **Document Changes:** Keep track of rule modifications

---

## 🔗 Resources

- [Vercel Firewall Docs](https://vercel.com/docs/security/vercel-firewall)
- [REST API Reference](https://vercel.com/docs/rest-api/reference/endpoints/security)
- [Rate Limiting Best Practices](https://vercel.com/docs/security/rate-limiting)
- [Bot Detection Guide](https://vercel.com/docs/security/bot-detection)

---

**🎉 You now have full programmatic control over your Vercel Firewall!**

Run `./scripts/setup-firewall.sh` to get started! 🚀

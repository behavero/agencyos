# 🚀 Quick Start - Complete Setup

You're 1 step away from having the firewall configured!

## ✅ What's Already Done

- ✅ Sentry installed & configured
- ✅ Axiom integrated
- ✅ Checkly integrated
- ✅ Vercel Analytics active
- ✅ Speed Insights active

## 🔒 Final Step: Configure Firewall

### You're on the right page! Here's what to do:

1. **Fill in the token form:**
   - Token Name: `Firewall Configuration`
   - Scope: `Behavero's projects` ✅ (already selected)
   - Expiration: `No Expiration` (recommended)

2. **Click "Create" button**

3. **Copy the token** (it will start with `vercel_...`)

4. **Run these commands:**

```bash
# In your terminal (paste the actual token)
export VERCEL_TOKEN=vercel_paste_your_actual_token_here

# Navigate to project
cd /Volumes/KINGSTON/agencyos-react

# Run firewall setup
./scripts/setup-firewall.sh
```

### Expected Output:

```
🔒 Vercel Firewall Setup

✓ Found VERCEL_TOKEN
✓ Project: prj_dpjb3dwc1yD6gYdHTBQAQjNlCGLf
✓ Team: team_6AhWbdS9iEGk1kBHfDIsIGfb

📋 Configuring firewall rules...

📋 Creating rule 1/5: API Rate Limiting
   ✅ Created successfully
   📊 Priority set to 0

📋 Creating rule 2/5: Challenge Suspicious Bots
   ✅ Created successfully
   📊 Priority set to 1

... (3 more rules)

🤖 Enabling Bot Protection...
   ✅ Bot protection enabled
   ✅ AI bot blocking enabled

✅ Firewall configuration complete!

📊 What was configured:
   1. API Rate Limiting (100 req/min)
   2. Bot Challenge (CAPTCHA for bots)
   3. Geographic Blocking (disabled by default)
   4. Login Rate Limiting (5 attempts/5min)
   5. Analytics API Throttling (30 req/min)

🤖 Managed Rules:
   ✅ Bot Protection enabled
   ✅ AI Bot Blocking enabled

🎉 All done!
```

## 🎉 Then You're Complete!

After running the script, visit:

- **Firewall Dashboard**: https://vercel.com/behaveros-projects/agencyos-react/settings/firewall

You should see 5 custom rules + managed bot protection! 🛡️

---

## 🔍 Verify Everything

### 1. Sentry (Error Tracking)

```bash
open https://onyxos.vercel.app/sentry-example-page
# Click "Throw error" button
# Check: https://behave-srl.sentry.io/
```

### 2. Axiom (Logs)

```bash
# Visit: https://app.axiom.co/
# You should see Vercel logs flowing in
```

### 3. Checkly (Uptime)

```bash
# Visit: https://app.checklyhq.com/
# Run: npx checkly deploy
# Your checks should appear in dashboard
```

### 4. Firewall (after setup)

```bash
# Test rate limiting (should block after 100 requests)
for i in {1..150}; do
  curl -I https://onyxos.vercel.app/api/analytics/dashboard
  sleep 0.1
done

# Some should return: HTTP/2 429 (Too Many Requests)
```

---

## 📊 Your Complete Stack

| Tool           | Status | Dashboard                             |
| -------------- | ------ | ------------------------------------- |
| Sentry         | ✅     | https://behave-srl.sentry.io/         |
| Axiom          | ✅     | https://app.axiom.co/                 |
| Checkly        | ✅     | https://app.checklyhq.com/            |
| Analytics      | ✅     | https://vercel.com/.../analytics      |
| Speed Insights | ✅     | https://vercel.com/.../speed-insights |
| Firewall       | ⏳     | Waiting for token                     |

**Total Value: ~$150/month of FREE tools!** 🎉

---

## 🆘 Need Help?

Read the complete guide:

```bash
cat INTEGRATION_COMPLETE.md
```

Or if the script fails:

```bash
# Check token is valid
curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  https://api.vercel.com/v2/user
```

# 🎉 Vercel Pro Integrations - Complete Setup Guide

You've successfully integrated **Sentry**, **Axiom**, and **Checkly**! Here's your complete guide.

---

## ✅ Current Status

### Installed & Configured:

- ✅ **Sentry** - Error tracking & performance monitoring
- ✅ **Axiom** - Log management & analytics
- ✅ **Checkly** - Uptime monitoring & synthetic testing
- ✅ **Vercel Analytics** - Web analytics
- ✅ **Vercel Speed Insights** - Performance monitoring
- ⏳ **Firewall Configuration** - Waiting for Vercel token

---

## 1️⃣ Complete Firewall Setup (5 minutes)

### Step 1: Create Vercel Token

You're already on the right page! Fill in:

- **Token Name**: `Firewall Configuration`
- **Scope**: `Behavero's projects` ✅
- **Expiration**: `No Expiration` (or 90 days)
- Click **Create**

### Step 2: Copy & Use Token

```bash
# Copy the token (starts with vercel_...)
export VERCEL_TOKEN=vercel_your_actual_token_here

# Run the firewall setup
cd /Volumes/KINGSTON/agencyos-react
./scripts/setup-firewall.sh
```

**Expected Output:**

```
🔒 Vercel Firewall Setup
✓ Found VERCEL_TOKEN
✓ Project: prj_dpjb3dwc1yD6gYdHTBQAQjNlCGLf
✓ Team: team_6AhWbdS9iEGk1kBHfDIsIGfb

📋 Creating rule 1/5: API Rate Limiting
   ✅ Created successfully
   📊 Priority set to 0
...
✅ Firewall configuration complete!
🤖 Bot protection enabled
🎉 All done!
```

---

## 2️⃣ Enhance Axiom Integration (Optional - 10 minutes)

Add `next-axiom` for full-stack logging:

### Install next-axiom:

```bash
npm install --save next-axiom
```

### Update next.config.ts:

```typescript
import { withAxiom } from 'next-axiom'

const nextConfig = {
  // ... your existing config
}

export default withAxiom(nextConfig)
```

### Add Web Vitals to layout:

```typescript
// src/app/layout.tsx - add this export
export { reportWebVitals } from 'next-axiom'
```

### Use structured logging anywhere:

```typescript
import { log } from 'next-axiom'

// Client-side, edge, or server-side
log.debug('User action', { userId: 123, action: 'sync' })
log.info('Sync complete', { transactions: 100 })
log.error('API failed', { endpoint: '/api/analytics' })
```

---

## 3️⃣ Complete Checkly Setup (15 minutes)

You have the credentials! Now let's set up monitoring:

### Step 1: Initialize Checkly CLI

```bash
cd /Volumes/KINGSTON/agencyos-react

# Export your credentials
export CHECKLY_ACCOUNT_ID="******************"
export CHECKLY_API_KEY="***************"

# Initialize Checkly project
npm create checkly
```

**During onboarding:**

- ✅ Initialize a new project? **Yes**
- ✅ Create example checks? **Yes**
- ✅ Browser check URL? `https://onyxos.vercel.app`
- ✅ Create git repo? **No** (we already have one)
- ✅ Import Playwright config? **No**

### Step 2: Create Your First Checks

The CLI will create a `__checks__` folder with examples. Let's customize them:

**API Health Check** (`__checks__/api.check.ts`):

```typescript
import { ApiCheck, AssertionBuilder } from 'checkly/constructs'

new ApiCheck('api-health-check', {
  name: 'OnyxOS API Health',
  activated: true,
  request: {
    url: 'https://onyxos.vercel.app/api/health',
    method: 'GET',
  },
  assertions: [
    AssertionBuilder.statusCode().equals(200),
    AssertionBuilder.responseTime().lessThan(500),
  ],
})
```

**Dashboard Check** (`__checks__/dashboard.check.ts`):

```typescript
import { BrowserCheck, Frequency } from 'checkly/constructs'

new BrowserCheck('dashboard-check', {
  name: 'Dashboard Loads',
  activated: true,
  frequency: Frequency.EVERY_5M,
  locations: ['us-east-1', 'eu-west-1'],
  code: {
    content: `
      const { test } = require('@playwright/test');

      test('Dashboard loads successfully', async ({ page }) => {
        await page.goto('https://onyxos.vercel.app');
        await page.waitForSelector('text=OnyxOS');
      });
    `,
  },
})
```

**Login Flow Check** (`__checks__/auth.check.ts`):

```typescript
import { BrowserCheck } from 'checkly/constructs'

new BrowserCheck('login-check', {
  name: 'Login Flow Works',
  activated: true,
  code: {
    content: `
      const { test } = require('@playwright/test');

      test('Can access login page', async ({ page }) => {
        await page.goto('https://onyxos.vercel.app/join');
        await page.waitForSelector('button:has-text("Sign in")');
      });
    `,
  },
})
```

### Step 3: Test & Deploy

```bash
# Test checks in cloud
npx checkly test --record

# Deploy as monitors
npx checkly deploy
```

### Step 4: Set Up Alerts

1. Go to: https://app.checklyhq.com/alert-channels
2. Click **"Add Alert Channel"**
3. Choose **Email** (free) or **Slack** (recommended)
4. Configure:
   - **Name**: `Production Alerts`
   - **Email/Slack**: Your contact
   - **Send on**: Check failures
5. Apply to all checks

---

## 4️⃣ Verify Everything Works

### Test Sentry:

```bash
# Visit the test page
open https://onyxos.vercel.app/sentry-example-page

# Click "Throw error" button
# Check: https://behave-srl.sentry.io/
```

### Test Axiom:

```bash
# Trigger some activity
curl https://onyxos.vercel.app/api/analytics/dashboard

# View logs: https://app.axiom.co/
# Filter by: vercel_*
```

### Test Checkly:

```bash
# View dashboard: https://app.checklyhq.com/
# You should see your checks running
```

### Test Firewall (after setup):

```bash
# Should succeed
curl -I https://onyxos.vercel.app/api/analytics/dashboard

# Spam it (should get rate limited)
for i in {1..150}; do curl -I https://onyxos.vercel.app/api/analytics/dashboard; done

# Some should return: HTTP/2 429
```

---

## 📊 Your Monitoring Stack

| Tool                 | Purpose                  | Dashboard                             | Cost                |
| -------------------- | ------------------------ | ------------------------------------- | ------------------- |
| **Sentry**           | Errors & Performance     | https://behave-srl.sentry.io/         | FREE (5K errors/mo) |
| **Axiom**            | Logs & Analytics         | https://app.axiom.co/                 | FREE (500 MB/mo)    |
| **Checkly**          | Uptime & Synthetic Tests | https://app.checklyhq.com/            | FREE (5 checks)     |
| **Vercel Analytics** | Web Analytics            | https://vercel.com/.../analytics      | FREE                |
| **Speed Insights**   | Performance              | https://vercel.com/.../speed-insights | FREE                |
| **Vercel Firewall**  | Security                 | https://vercel.com/.../firewall       | FREE                |

**Total Value:** ~$150/month of FREE monitoring! 🎉

---

## 🎯 Daily Workflow

### Morning Check:

1. **Checkly Dashboard** - Any downtime overnight?
2. **Sentry Issues** - Any new errors?
3. **Axiom Logs** - Any unusual patterns?

### After Deploy:

1. **Speed Insights** - Performance regression?
2. **Sentry** - New error spikes?
3. **Checkly** - All checks passing?

### Weekly Review:

1. **Vercel Analytics** - Traffic trends
2. **Axiom** - Log volume patterns
3. **Firewall Logs** - Blocked requests

---

## 🚨 Alert Channels

Set these up ASAP:

### Sentry Alerts:

1. Go to: https://behave-srl.sentry.io/settings/projects/javascript-nextjs/alerts/
2. Create alert: **"Critical Errors"**
3. When: New issue, error rate > 5/min
4. Notify: Email

### Axiom Alerts:

1. Go to: https://app.axiom.co/alerts
2. Create alert: **"High Error Rate"**
3. Query: `status >= 500`
4. When: Count > 10 in 5 minutes
5. Notify: Email

### Checkly Alerts:

✅ Already configured during setup!

---

## 🔧 Environment Variables to Add

Add these to Vercel:

```bash
# Sentry (auto-added by wizard)
SENTRY_AUTH_TOKEN=sntrys_***
NEXT_PUBLIC_SENTRY_DSN=https://***@sentry.io/***

# Axiom (auto-added by integration)
NEXT_PUBLIC_AXIOM_INGEST_ENDPOINT=https://***

# Checkly (for CLI)
CHECKLY_ACCOUNT_ID=******************
CHECKLY_API_KEY=***************

# Vercel (for firewall script)
VERCEL_TOKEN=vercel_***
```

To add to Vercel:

```bash
vercel env add CHECKLY_ACCOUNT_ID
# Paste value when prompted
# Select: Production, Preview, Development
```

---

## 📝 Next Steps

### Immediate (Today):

1. ✅ Create Vercel token
2. ✅ Run `./scripts/setup-firewall.sh`
3. ✅ Test Sentry: Visit `/sentry-example-page`
4. ✅ Deploy Checkly monitors: `npx checkly deploy`

### This Week:

5. ⏳ Set up alert channels (Sentry, Axiom, Checkly)
6. ⏳ Add `next-axiom` for structured logging
7. ⏳ Create custom Checkly checks for critical flows
8. ⏳ Review first week of data

### This Month:

9. ⏳ Tune firewall rate limits based on usage
10. ⏳ Add more Checkly checks for edge cases
11. ⏳ Create Axiom dashboards for insights
12. ⏳ Set up Sentry performance budgets

---

## 🆘 Troubleshooting

### Firewall Script Fails:

```bash
# Check token is valid
curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  https://api.vercel.com/v2/user

# Should return your user info
```

### Sentry Not Receiving Errors:

```bash
# Check DSN is set
echo $NEXT_PUBLIC_SENTRY_DSN

# Test manually
curl https://onyxos.vercel.app/api/sentry-example-api
```

### Axiom No Logs:

```bash
# Check integration is active
# Vercel > Project > Settings > Integrations > Axiom

# Trigger some requests
curl https://onyxos.vercel.app/
```

### Checkly Checks Failing:

```bash
# Test locally first
npx checkly test

# Check credentials
echo $CHECKLY_ACCOUNT_ID
echo $CHECKLY_API_KEY
```

---

## 📚 Documentation Links

- **Sentry**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Axiom**: https://axiom.co/docs/integrations/vercel
- **Checkly**: https://www.checklyhq.com/docs/cli/
- **Vercel Firewall**: https://vercel.com/docs/security/vercel-firewall
- **Vercel Analytics**: https://vercel.com/docs/analytics

---

**🎉 Congratulations! You now have enterprise-grade monitoring for FREE!**

Complete the remaining steps and you'll have:

- ✅ Error tracking (Sentry)
- ✅ Performance monitoring (Speed Insights)
- ✅ Log analytics (Axiom)
- ✅ Uptime monitoring (Checkly)
- ✅ Web analytics (Vercel Analytics)
- ✅ Security (Firewall)

All for just **$20/month** (Vercel Pro) with **~$150/month** of free tools! 🚀

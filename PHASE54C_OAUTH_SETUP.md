# 🔐 PHASE 54C - Fanvue OAuth Setup Guide

## Overview

We've upgraded from manual bearer tokens to **automated OAuth Client Credentials** flow.  
This ensures your Fanvue sync **never fails with 401 Unauthorized**.

---

## 📋 **STEP 1: Add to `.env.local`** (Local Development)

Create or update `/Volumes/KINGSTON/agencyos-react/.env.local`:

```bash
# ⚠️ NEVER commit this file to Git!

# Fanvue OAuth Credentials (from Fanvue Developer Portal)
FANVUE_CLIENT_ID=f1cbc082-339e-47c7-8cd8-18a2a997d1b7
FANVUE_CLIENT_SECRET=561a2cf71ad554cd29471d6482d7de63fa90e2f39c4234b2ddedda0a3711e12f
FANVUE_TENANT_ID=bd5a9810-b0c1-4e4c-b290-a2271114b6c1

# Fanvue API URLs (from official starter: https://github.com/fanvue/fanvue-app-starter)
FANVUE_AUTH_URL=https://auth.fanvue.com
FANVUE_API_URL=https://api.fanvue.com
```

---

## 📋 **STEP 2: Add to Vercel** (Production)

1. Go to: https://vercel.com/behaveros-projects/agencyos-react/settings/environment-variables
2. Add these **Production** environment variables:

| Variable Name          | Value                                                              |
| ---------------------- | ------------------------------------------------------------------ |
| `FANVUE_CLIENT_ID`     | `f1cbc082-339e-47c7-8cd8-18a2a997d1b7`                             |
| `FANVUE_CLIENT_SECRET` | `561a2cf71ad554cd29471d6482d7de63fa90e2f39c4234b2ddedda0a3711e12f` |
| `FANVUE_TENANT_ID`     | `bd5a9810-b0c1-4e4c-b290-a2271114b6c1`                             |
| `FANVUE_AUTH_URL`      | `https://auth.fanvue.com`                                          |
| `FANVUE_API_URL`       | `https://api.fanvue.com`                                           |

3. **Important**: Click "Redeploy" after adding the variables

---

## 🧪 **STEP 3: Test the Setup**

### Local Test:

```bash
npm run dev
# Visit: http://localhost:3000/api/debug/fanvue-probe
```

### Production Test:

```
https://onyxos.vercel.app/api/debug/fanvue-probe
```

**Expected Response:**

```json
{
  "phase": "COMPLETE_DIAGNOSTICS",
  "oauth_test": {
    "status": "SUCCESS",
    "token_preview": "eyJhbGciOiJIUzI1NiI..."
  },
  "api_test": {
    "status": "SUCCESS",
    "http_status": 200
  },
  "raw_response": {
    "data": [
      /* your earnings */
    ]
  }
}
```

---

## 🏗️ **Architecture Changes**

### New Files Created:

- **`src/lib/services/fanvue-auth.ts`**  
  OAuth Client Credentials handler with automatic token refresh

### Files Modified:

- **`src/lib/services/transaction-syncer.ts`**  
  Now uses OAuth tokens instead of manual model tokens

- **`src/app/api/debug/fanvue-probe/route.ts`**  
  Updated to test OAuth flow first

### How It Works:

1. When sync runs, it calls `getFanvueServerToken()`
2. Function checks if cached token is still valid
3. If expired, fetches fresh token from Fanvue OAuth endpoint
4. Token is used for all API calls
5. Falls back to model tokens if OAuth fails (safety net)

---

## 🔍 **Troubleshooting**

### Error: "Missing Fanvue OAuth credentials"

**Fix:** Add `FANVUE_CLIENT_ID` and `FANVUE_CLIENT_SECRET` to Vercel environment variables

### Error: "Fanvue OAuth failed: 401"

**Fix:** Verify credentials are correct in Fanvue Developer Portal

### Error: "API returned 403"

**Fix:** Check app scopes in Fanvue Developer Portal include `read:earnings` and `read:transactions`

### Still showing 0 transactions?

1. Check the probe endpoint: `https://onyxos.vercel.app/api/debug/fanvue-probe`
2. Look at `raw_response.data` - if empty, your Fanvue account might not have data in the date range
3. Check `analysis.error_message` for specific API errors

---

## 📚 **References**

- **Fanvue Official Starter**: https://github.com/fanvue/fanvue-app-starter
- **Fanvue API Docs**: https://api.fanvue.com/docs
- **OAuth 2.0 Client Credentials**: https://oauth.net/2/grant-types/client-credentials/

---

## ✅ **Verification Checklist**

- [ ] `.env.local` has all 5 Fanvue variables
- [ ] Vercel has all 5 Fanvue environment variables
- [ ] Redeployed after adding Vercel variables
- [ ] Probe endpoint returns `oauth_test.status: SUCCESS`
- [ ] Probe endpoint returns `api_test.status: SUCCESS`
- [ ] Dashboard sync button works without errors

---

**Last Updated:** Phase 54C  
**Next Phase:** Test sync with real data

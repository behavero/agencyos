# 🔄 PHASE 54C - Token Refresh Guide

## 🔴 **ISSUE IDENTIFIED**

Your Fanvue token for **Lanaa🎀** (lanavalentine) is **expired** (401 Unauthorized).

```json
{
  "api_test": { "http_status": 401 },
  "raw_response": { "error": "Unauthorized" }
}
```

---

## ✅ **SOLUTION: Reconnect Fanvue Account**

### **Step 1: Verify Vercel Environment Variables**

You need **2 variables** for OAuth to work (not 5):

1. Go to: https://vercel.com/behaveros-projects/agencyos-react/settings/environment-variables

2. **Add or verify** these variables are set to **ALL ENVIRONMENTS** (Production, Preview, Development):

| Variable Name                  | Value                                                              | Environment |
| ------------------------------ | ------------------------------------------------------------------ | ----------- |
| `NEXT_PUBLIC_FANVUE_CLIENT_ID` | `f1cbc082-339e-47c7-8cd8-18a2a997d1b7`                             | **All**     |
| `FANVUE_CLIENT_SECRET`         | `561a2cf71ad554cd29471d6482d7de63fa90e2f39c4234b2ddedda0a3711e12f` | **All**     |

**⚠️ Important:**

- `NEXT_PUBLIC_FANVUE_CLIENT_ID` must be public (exposed to browser)
- `FANVUE_CLIENT_SECRET` must be private (server-only)
- Delete the other 3 variables (`FANVUE_TENANT_ID`, `FANVUE_AUTH_URL`, `FANVUE_API_URL`) - they're not used

3. **Redeploy** after adding/updating variables

---

### **Step 2: Reconnect Lanaa's Account**

Once the variables are set and redeployed:

1. **Go to:** https://onyxos.vercel.app/dashboard/creator-management

2. **Click** "Add Model" or "Reconnect Fanvue"

3. **Or directly visit:** https://onyxos.vercel.app/api/oauth/login

4. **Authorize** Lanaa's Fanvue account again

5. **You'll be redirected** back to the dashboard with a fresh token

---

### **Step 3: Test the Sync**

After reconnecting:

1. Go to your dashboard
2. Click the **"Sync Fanvue Data"** button
3. You should see: "✅ Synced [X] transactions!"

Or use the probe to verify:

- https://onyxos.vercel.app/api/debug/fanvue-probe

---

## 🤖 **BONUS: Automatic Token Refresh**

Your system already stores the `refresh_token` (line 119 in oauth/callback):

```typescript
fanvue_refresh_token: token.refresh_token,
fanvue_token_expires_at: token.expires_in
  ? new Date(Date.now() + token.expires_in * 1000).toISOString()
  : null,
```

**Future Enhancement:** We can build an automatic token refresh system that:

1. Checks `fanvue_token_expires_at` before each sync
2. If expired, uses `fanvue_refresh_token` to get a new token
3. Updates the database with the fresh token
4. Never requires manual reconnection again

Would you like me to implement this? 🚀

---

## 📊 **Current Status**

✅ Model connected: Lanaa🎀 (lanavalentine)  
❌ Token status: **Expired** (401 Unauthorized)  
🔄 Next step: **Reconnect account** after setting `NEXT_PUBLIC_FANVUE_CLIENT_ID`

---

## 🐛 **Troubleshooting**

### Error: "Client ID not found"

**Fix:** Set `NEXT_PUBLIC_FANVUE_CLIENT_ID` in Vercel (must include `NEXT_PUBLIC_` prefix)

### Error: "State mismatch"

**Fix:** Clear your browser cookies and try again

### Error: "OAuth token exchange failed"

**Fix:** Verify `FANVUE_CLIENT_SECRET` is correct in Vercel

### Still showing 0 transactions after reconnect?

1. Check probe: https://onyxos.vercel.app/api/debug/fanvue-probe
2. If it shows 200 with data, click sync button
3. If still 0, check Supabase `fanvue_transactions` table directly

---

**Last Updated:** Phase 54C  
**Status:** Waiting for OAuth env vars + account reconnection

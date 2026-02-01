# 🔧 FIX FANVUE OAUTH "UNAUTHORIZED" ERROR

## ❌ **Current Error:**
```
https://api.fanvue.com/oauth/authorize?...
{"error":"Unauthorized"}
```

---

## ✅ **THE FIX:**

### **You MUST add the redirect URI in your Fanvue Developer Settings**

1. **Go to Fanvue Developer Portal:**
   - Visit: https://fanvue.com/settings/developer
   - (Or wherever Fanvue's OAuth app settings are located)

2. **Find "Redirect URIs" or "Authorized redirect URIs" section**

3. **Add this EXACT URL:**
   ```
   https://onyxos.vercel.app/api/auth/fanvue/callback
   ```

4. **Save the settings**

5. **Test again:**
   - Go to: https://onyxos.vercel.app/dashboard/crm
   - Click "Add Model"
   - Click "Connect with Fanvue"
   - ✅ Should now redirect to Fanvue login instead of showing "Unauthorized"

---

## 🔍 **Why This Happens:**

Fanvue (like all OAuth providers) requires you to **whitelist** which URLs your app can redirect users to after they authorize. This is a security feature to prevent malicious apps from stealing user credentials.

**Your app is trying to redirect to:**
```
https://onyxos.vercel.app/api/auth/fanvue/callback
```

**But Fanvue doesn't recognize it** because it's not in your registered redirect URIs list.

---

## 📋 **Current OAuth Configuration:**

**Client ID:** `f1cbc082-339e-47c7-8cd8-18a2a997d1b7`  
**Redirect URI:** `https://onyxos.vercel.app/api/auth/fanvue/callback`  
**Scopes:** 
- `openid`
- `offline_access`
- `offline`
- `read:self`
- `read:creator`
- `read:insights`
- `read:chat`
- `write:chat`
- `read:fan`
- `read:media`
- `read:post`
- `write:post`
- `read:agency`

---

## 🎯 **Steps to Test After Fixing:**

1. **Login to OnyxOS:**
   - https://onyxos.vercel.app
   - Email: `martin@behave.ro`
   - Password: `5se9MMBJY#16L0%atNf6`

2. **Go to CRM Page:**
   - Click "CRM" in sidebar
   - Or visit: https://onyxos.vercel.app/dashboard/crm

3. **Add Model:**
   - Click "Add Model" button (top right)
   - Dialog opens

4. **Connect with Fanvue:**
   - Click blue "Connect with Fanvue" button
   - Should redirect to Fanvue login page

5. **Authorize:**
   - Login to Fanvue (if not already logged in)
   - Click "Authorize" to give OnyxOS access
   - Should redirect back to OnyxOS CRM page
   - Model should appear in the list

---

## 🐛 **If It Still Doesn't Work:**

### **1. Check Fanvue Developer Console:**
- Make sure the redirect URI is **EXACTLY** this (no trailing slash, no typos):
  ```
  https://onyxos.vercel.app/api/auth/fanvue/callback
  ```

### **2. Check if Fanvue has different OAuth endpoint:**
- We're using: `https://api.fanvue.com/oauth/authorize`
- Check Fanvue docs if they use a different URL like:
  - `https://www.fanvue.com/oauth/authorize`
  - `https://auth.fanvue.com/oauth/authorize`

### **3. Check Client ID:**
- Make sure `f1cbc082-339e-47c7-8cd8-18a2a997d1b7` is correct
- Verify in Fanvue developer settings

### **4. Check Scopes:**
- Some scopes might not be available for your app type
- Try with minimal scopes first:
  ```
  openid read:self read:creator
  ```

---

## 📞 **Need Help from Fanvue?**

If the OAuth settings page is not obvious, you might need to:
1. Contact Fanvue support
2. Ask for "OAuth Application setup documentation"
3. Request access to "Developer Dashboard" if you don't have it

---

## ✅ **Once Fixed:**

Your OAuth flow will work like this:

1. User clicks "Connect with Fanvue" in OnyxOS
2. Redirects to Fanvue login page
3. User logs in (if needed)
4. User authorizes OnyxOS to access their data
5. Fanvue redirects back to: `https://onyxos.vercel.app/api/auth/fanvue/callback?code=...`
6. OnyxOS exchanges code for access token
7. OnyxOS fetches user profile from Fanvue API
8. OnyxOS creates model entry in database
9. User sees their model in the CRM page ✅

---

**After you fix the redirect URI in Fanvue, everything should work! 🚀**

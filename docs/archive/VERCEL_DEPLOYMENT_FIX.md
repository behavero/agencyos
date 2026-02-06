# Vercel Deployment Not Triggering - Fix Guide

## Problem

GitHub Actions passes ✅ but Vercel doesn't auto-deploy from main branch pushes.

---

## IMMEDIATE SOLUTION: Deploy Hook

### Step 1: Create Deploy Hook in Vercel

1. **Go to Vercel Settings:**

   ```
   https://vercel.com/behaveros-projects/agencyos/settings/git
   ```

2. **Scroll to "Deploy Hooks" section**

3. **Fill in the form:**

   ```
   Name:   Manual Production Deploy
   Branch: main
   ```

4. **Click "Create Hook"**

5. **Copy the webhook URL** (looks like):
   ```
   https://api.vercel.com/v1/integrations/deploy/prj_XXXXX/YYYYY
   ```

---

### Step 2: Use the Deploy Hook

**Option A: Via Command Line (Recommended)**

```bash
# Set the deploy hook URL
export VERCEL_DEPLOY_HOOK='https://api.vercel.com/v1/integrations/deploy/prj_XXXXX/YYYYY'

# Run the deployment script
./scripts/deploy-vercel.sh
```

**Option B: Direct cURL**

```bash
curl -X POST https://api.vercel.com/v1/integrations/deploy/prj_XXXXX/YYYYY
```

**Option C: Add to GitHub Actions**

```yaml
# Add this to .github/workflows/ci.yml after build-verification
- name: Trigger Vercel Deployment
  if: success()
  run: |
    curl -X POST ${{ secrets.VERCEL_DEPLOY_HOOK }}
```

Then add `VERCEL_DEPLOY_HOOK` to GitHub Secrets.

---

## ROOT CAUSE INVESTIGATION

### Check 1: Production Branch Settings

1. Go to: `Settings > General`
2. Scroll to "Production Branch"
3. Verify: Should show `main`
4. If not set or wrong, change it to `main`

### Check 2: Ignored Build Step

1. Go to: `Settings > General > Build & Development Settings`
2. Look for "Ignored Build Step" toggle/input
3. **If enabled with a script**, it might be blocking deployment
4. **Recommended:** Leave empty or use:
   ```bash
   git diff HEAD^ HEAD --quiet . ':!README.md'
   ```
   (This skips deployment only if no code changed)

### Check 3: Build Command Settings

1. Go to: `Settings > General > Build & Development Settings`
2. Verify settings:
   ```
   Framework Preset:  Next.js
   Build Command:     (empty or "npm run build")
   Output Directory:  (empty or ".next")
   Install Command:   (empty or "npm install")
   ```

### Check 4: Environment Variables

1. Go to: `Settings > Environment Variables`
2. Ensure these are set for **Production**:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

---

## PERMANENT FIX OPTIONS

### Option 1: Enable Auto-Deploy in Git Settings

Your current settings at `Settings > Git` should have:

- ✅ Pull Request Comments: Enabled
- ✅ Commit Comments: Enabled
- ✅ deployment_status Events: Enabled

**If any are disabled, enable them.**

---

### Option 2: Re-link GitHub Repository

Sometimes the integration breaks. To fix:

1. **Disconnect Repository:**
   - Go to: `Settings > Git`
   - Scroll to "Connected Git Repository"
   - Click "Disconnect"

2. **Reconnect Repository:**
   - Click "Connect Git Repository"
   - Select "GitHub"
   - Choose `behavero/agencyos`
   - Grant permissions

3. **Reconfigure:**
   - Set Production Branch: `main`
   - Enable auto-deploy options

---

### Option 3: Use GitHub Actions to Deploy

Add this job to `.github/workflows/ci.yml`:

```yaml
deploy-to-vercel:
  needs: build-verification
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  steps:
    - name: Trigger Vercel Deployment
      run: |
        curl -X POST ${{ secrets.VERCEL_DEPLOY_HOOK }}
```

Then add `VERCEL_DEPLOY_HOOK` secret to GitHub repository settings.

---

## TESTING THE FIX

### After Setting Up Deploy Hook:

1. **Test the hook:**

   ```bash
   curl -X POST https://api.vercel.com/v1/integrations/deploy/YOUR_HOOK_URL
   ```

2. **Check Vercel Dashboard:**

   ```
   https://vercel.com/behaveros-projects/agencyos
   ```

   Should see new deployment starting

3. **Monitor build:**
   - Build should complete in ~2-3 minutes
   - Look for "Building" → "Ready" status

4. **Test production:**
   ```
   https://onyxos.vercel.app/dashboard/creator-management
   ```
   Should show Phase 51 features

---

## WHY THIS HAPPENED

**Possible Causes:**

1. **Repository recently reconnected** (1 day ago per your settings)
   - Integration might not be fully configured
   - Auto-deploy triggers not properly set up

2. **"Ignored Build Step" enabled**
   - Some projects have this to skip deployments
   - Could be blocking all deployments

3. **Branch mismatch**
   - Vercel watching different branch
   - Production branch not set to `main`

4. **CI/CD wait condition**
   - If "Wait for CI to complete" is enabled
   - Might be waiting indefinitely for a check that doesn't exist

---

## MONITORING

### Check Current Deployment Status

**Vercel Dashboard:**

```
https://vercel.com/behaveros-projects/agencyos
```

**GitHub Actions:**

```
https://github.com/behavero/agencyos/actions
```

**Latest Commit:**

```
Commit: 966b4a2
Message: "chore: trigger vercel deployment for Phase 51C"
Status: Should be deployed
```

---

## QUICK REFERENCE

### Deploy Hook Commands

```bash
# Set deploy hook URL (replace with your actual URL)
export VERCEL_DEPLOY_HOOK='https://api.vercel.com/v1/integrations/deploy/prj_XXXXX/YYYYY'

# Deploy using script
./scripts/deploy-vercel.sh

# Deploy using curl
curl -X POST "$VERCEL_DEPLOY_HOOK"

# Check if deployed
curl -s https://onyxos.vercel.app/api/health | jq
```

### Useful Vercel CLI Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View deployment logs
vercel logs
```

---

## NEXT STEPS

1. ✅ Create Deploy Hook in Vercel
2. ✅ Run `./scripts/deploy-vercel.sh` to deploy
3. ✅ Wait 2-3 minutes for build
4. ✅ Test at https://onyxos.vercel.app
5. ⚠️ Fix auto-deploy settings for future

---

**Once deployed, test Phase 51 features:**

- Creator Management: `/dashboard/creator-management`
- Add Creator dialog
- Creator detail pages
- Social connector (Instagram, Twitter, TikTok)
- Agency split percentage settings

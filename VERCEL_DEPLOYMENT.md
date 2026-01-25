# 🚀 VERCEL DEPLOYMENT GUIDE

Step-by-step instructions to deploy your MVP to Vercel after local testing.

---

## ✅ PRE-DEPLOYMENT REQUIREMENTS

Before deploying to Vercel, ensure:

- [ ] Local tests all pass (see PRE_DEPLOYMENT_CHECKLIST.md)
- [ ] Code committed to GitHub
- [ ] All `.env.local` values documented
- [ ] PostgreSQL database ready (or using managed DB)

---

## 📋 STEP 1: PREPARE FOR DEPLOYMENT

### 1.1 Update DATABASE_URL for Production

You have 2 options:

**Option A: Use Managed PostgreSQL (Recommended)**
- Neon: https://neon.tech/
- Supabase: https://supabase.com/
- Railway: https://railway.app/
- PlanetScale: https://planetscale.com/ (MySQL)

**Option B: Local PostgreSQL**
- If hosting on your own server
- Less common for Vercel

**For this guide, we'll use Neon (free tier available):**

1. Go to https://neon.tech/
2. Sign up (free)
3. Create database
4. Copy connection string
5. Add to Vercel environment variables

### 1.2 Generate Strong NEXTAUTH_SECRET

```bash
# On Windows PowerShell:
$bytes = [System.Text.Encoding]::ASCII.GetBytes([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
[Convert]::ToBase64String($bytes)

# Or on Mac/Linux:
openssl rand -base64 32
```

Save this value - you'll need it in Vercel.

### 1.3 Prepare Environment Variables

Create a list of all variables you need:

```
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=<generated above>
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_BUSINESS_API_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4-turbo
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_TOKEN=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
NODE_ENV=production
```

---

## 📋 STEP 2: PUSH CODE TO GITHUB

### 2.1 Initialize Git (if not already done)

```bash
cd C:\Users\nanudeep\Downloads\next
git init
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### 2.2 Create .gitignore (already exists)

Verify `.gitignore` contains:
```
.next
node_modules
dist
.env
.env.local
.env.*.local
*.log
.DS_Store
```

### 2.3 Commit Files

```bash
git add .
git commit -m "Initial MVP - ready for deployment"
```

### 2.4 Create GitHub Repository

1. Go to https://github.com/new
2. Name: `google-reviews-manager` (or your choice)
3. Description: "Google Review → WhatsApp Alert System MVP"
4. Make it Public (for Vercel free tier)
5. Click "Create repository"

### 2.5 Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/google-reviews-manager.git
git branch -M main
git push -u origin main
```

---

## 🚀 STEP 3: DEPLOY TO VERCEL

### 3.1 Go to Vercel

1. Open https://vercel.com/
2. Sign up (if needed) with GitHub account
3. Click "Authorize Vercel"

### 3.2 Import Project

1. Click "Add New..."
2. Click "Project"
3. Select GitHub account
4. Find and click `google-reviews-manager` repo
5. Click "Import"

### 3.3 Configure Project

**Project Name:**
- Suggested: `google-reviews-manager`
- Or: `review-whatsapp-alert`

**Framework Preset:**
- Vercel should auto-detect "Next.js"
- If not, select "Next.js" from dropdown

**Root Directory:**
- Leave as `.` (current directory)

### 3.4 Set Environment Variables

1. Scroll down to "Environment Variables"
2. Add all variables from your `.env.local`:

**For each variable:**
1. Click "Add"
2. Name: (e.g., `DATABASE_URL`)
3. Value: (e.g., `postgresql://...`)
4. Select environment: "Production" (can select all)
5. Click "Save"

**Variables to add:**
```
DATABASE_URL          (production DB URL)
NEXTAUTH_URL          (https://your-project.vercel.app)
NEXTAUTH_SECRET       (use generated value)
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_BUSINESS_API_KEY
OPENAI_API_KEY
OPENAI_MODEL
WHATSAPP_BUSINESS_ACCOUNT_ID
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_BUSINESS_TOKEN
WHATSAPP_WEBHOOK_VERIFY_TOKEN
NODE_ENV              (set to "production")
```

**⚠️ Important:** NEVER paste secrets in your git repo. Always set them in Vercel.

### 3.5 Deploy

1. Click "Deploy"
2. Wait for build to complete (~2-3 minutes)
3. See deployment progress in console

**Expected Output:**
```
Analyzing project...
✓ Valid project structure
✓ Installing dependencies
✓ Running build...
✓ Deploying...
✓ Deployment complete!

URL: https://google-reviews-manager.vercel.app
```

---

## ✅ STEP 4: VERIFY DEPLOYMENT

### 4.1 Test URL

1. Vercel shows your URL (e.g., `https://google-reviews-manager.vercel.app`)
2. Click the link to visit your live app
3. Should see sign-in page (no errors)

### 4.2 Check for Errors

If you see errors:

1. Go to Vercel dashboard
2. Click "Deployments"
3. Click latest deployment
4. Check "Build Logs" for errors
5. Fix and push to GitHub
6. Vercel auto-redeploys

### 4.3 Test Basic Features

```
1. Visit https://your-domain.vercel.app
2. See sign-in page
3. Check browser console (F12) for errors
4. Test with Google OAuth (if configured)
5. Navigate to dashboard (if logged in)
```

---

## 🔐 STEP 5: CONFIGURE PRODUCTION SETTINGS

### 5.1 Update Google OAuth Redirect URLs

1. Go to Google Cloud Console
2. Find your OAuth 2.0 credential
3. Add Authorized redirect URIs:
   ```
   https://your-domain.vercel.app/api/auth/callback/google
   ```
4. Save changes

### 5.2 Update WhatsApp Webhook URL

1. Go to Meta Business Platform
2. Update webhook URL to:
   ```
   https://your-domain.vercel.app/api/webhooks/whatsapp
   ```
3. Verify token: (use your WHATSAPP_WEBHOOK_VERIFY_TOKEN)

### 5.3 Set Custom Domain (Optional)

1. In Vercel: Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration steps
4. Update NEXTAUTH_URL to custom domain

---

## 🛠️ STEP 6: PRODUCTION DATABASE SETUP

### 6.1 Sync Database Schema

On Vercel, you need to run database migrations:

**Option 1: Use Vercel Deployment Hook (Recommended)**

1. Create `scripts/deploy.sh`:
```bash
#!/bin/bash
npm install
npx prisma db push
npm run build
```

2. Make it executable
3. Vercel will run before deployment

**Option 2: Manual Migration**

1. After deployment, SSH into server
2. Run: `npx prisma db push`
3. Or use: `npm run db:push` if available

**Option 3: Run Locally Then Deploy**

```bash
# On your local machine:
npm run db:push

# Then deploy to Vercel (schema already synced)
```

---

## 📊 STEP 7: MONITOR DEPLOYMENT

### 7.1 View Logs

1. Vercel Dashboard → Your Project
2. Click "Deployments" tab
3. Click latest deployment
4. Check "Function Logs" for errors

### 7.2 Setup Error Alerts

1. Project Settings → Integrations
2. Add error monitoring (e.g., Sentry)
3. Get notified of production errors

### 7.3 Monitor Performance

1. Vercel Analytics (built-in)
2. Check Core Web Vitals
3. Monitor deployment size

---

## ✨ COMMON ISSUES & FIXES

| Issue | Cause | Fix |
|-------|-------|-----|
| **Build fails** | Missing env var | Check all vars in Vercel dashboard |
| **404 errors** | Routes not found | Rebuild and redeploy |
| **Database error** | DB connection issue | Verify DATABASE_URL, check DB status |
| **Blank page** | API error | Check Function Logs in Vercel |
| **OAuth not working** | Redirect URL wrong | Update Google & Vercel URLs |
| **WhatsApp not sending** | Token wrong | Verify WHATSAPP_BUSINESS_TOKEN |

---

## 🎯 FINAL CHECKLIST

Before considering deployment complete:

- [ ] Live URL accessible
- [ ] No 404 or 500 errors
- [ ] Sign-in page loads
- [ ] Console has no errors
- [ ] Environment variables all set
- [ ] Database connected
- [ ] OAuth configured
- [ ] Logs show no warnings

---

## 📈 POST-DEPLOYMENT

### Monitor First Week

1. Check Vercel logs daily
2. Monitor error rates
3. Test OAuth flow
4. Verify database operations

### Prepare for Scale

1. Set up database backups
2. Configure alert notifications
3. Document API endpoints
4. Create runbook for common issues

### Next Features

- [ ] Add frontend components
- [ ] Implement review ingestion
- [ ] Test AI reply generation
- [ ] Implement WhatsApp notifications

---

## 🎉 SUCCESS!

Your MVP is now live on Vercel!

**Your Live URL:** `https://your-domain.vercel.app`

### What's Next?

1. **Test in production** - Verify all features work
2. **Share with users** - Get feedback
3. **Monitor** - Watch logs for issues
4. **Iterate** - Add features based on feedback
5. **Scale** - Prepare for growth

---

## 📞 QUICK REFERENCE

**Vercel Dashboard:** https://vercel.com/dashboard
**Your Project:** https://vercel.com/projects/your-project-name
**Logs:** Vercel → Project → Deployments → View Logs
**Settings:** Vercel → Project → Settings
**Env Vars:** Vercel → Project → Settings → Environment Variables

---

**Congratulations! You've successfully deployed your MVP to Vercel! 🎊**

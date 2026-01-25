# 🧪 LOCAL TESTING GUIDE - Complete Checklist

Since Node.js is not installed on your current machine, here's a complete guide to test locally before deploying to Vercel.

## ⚙️ Prerequisites

### Required Software
1. **Node.js 18+** (includes npm)
   - Download: https://nodejs.org/
   - Verify: `node --version` && `npm --version`

2. **PostgreSQL 13+**
   - Download: https://www.postgresql.org/download/
   - Create database: `createdb google_review_db`
   - Or use: https://www.pgadmin.org/ (GUI)

3. **Git** (optional, for version control)
   - Download: https://git-scm.com/

4. **VS Code** (optional, but recommended)
   - Download: https://code.visualstudio.com/

---

## 🚀 LOCAL SETUP & TESTING (Step-by-Step)

### Phase 1: Environment Setup (5 minutes)

**1.1 Install Node.js & npm**
```bash
# Verify installation
node --version
npm --version
```

**1.2 Navigate to Project**
```bash
cd C:\Users\nanudeep\Downloads\next
```

**1.3 Install Dependencies**
```bash
npm install
```
✅ **Verify**: Should complete without errors. Check `node_modules/` folder exists.

---

### Phase 2: Database Setup (5 minutes)

**2.1 Start PostgreSQL**
```bash
# On Windows, PostgreSQL service should be running
# Verify by running psql or using pgAdmin
```

**2.2 Create Test Database**
```bash
# Using psql (command line)
createdb google_review_db

# Or using pgAdmin (GUI)
# Right-click Databases → Create → Database
# Name: google_review_db
```

**2.3 Configure Environment**

Edit `.env.local`:
```env
# Database - REQUIRED
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/google_review_db"

# NextAuth - REQUIRED
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="test-secret-key-change-in-production"

# Google OAuth - REQUIRED for OAuth testing
GOOGLE_CLIENT_ID="test-client-id"
GOOGLE_CLIENT_SECRET="test-client-secret"

# Google Business API - OPTIONAL for local testing
GOOGLE_BUSINESS_API_KEY="test-api-key"

# OpenAI - OPTIONAL for local testing
OPENAI_API_KEY="test-openai-key"
OPENAI_MODEL="gpt-4-turbo"

# WhatsApp - OPTIONAL for local testing
WHATSAPP_BUSINESS_ACCOUNT_ID="test-account-id"
WHATSAPP_PHONE_NUMBER_ID="test-phone-id"
WHATSAPP_BUSINESS_TOKEN="test-token"
WHATSAPP_WEBHOOK_VERIFY_TOKEN="test-webhook-token"

# Environment
NODE_ENV="development"
```

**2.4 Sync Database Schema**
```bash
npm run db:push
```

✅ **Verify**: 
- Command completes successfully
- No migration errors
- Database tables created (check in pgAdmin)

---

### Phase 3: Code Quality Checks (3 minutes)

**3.1 TypeScript Compilation**
```bash
npm run lint
```

✅ **Expected**: 
- No errors
- Or only warnings (safe to ignore for MVP)

**3.2 Production Build**
```bash
npm run build
```

✅ **Verify**:
- Build completes without errors
- `.next/` folder created
- No "failed" messages in output

---

### Phase 4: Development Server (1 minute)

**4.1 Start Dev Server**
```bash
npm run dev
```

✅ **Expected Output**:
```
  ▲ Next.js 15.0.0
  - Local:        http://localhost:3000
  - Environments: .env.local
  ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

---

### Phase 5: Browser Testing (10 minutes)

#### Test 1: Application Loads
```
1. Open: http://localhost:3000
2. Expected: 
   - Page loads without errors
   - Redirects to /auth/signin (if not logged in)
   - No console errors (F12 → Console tab)
```

#### Test 2: Sign-In Page
```
1. URL: http://localhost:3000/auth/signin
2. Verify:
   - Page title: "Google Reviews Manager"
   - "Sign in with Google" button visible
   - Tailwind CSS styling applied (colors, fonts)
   - No broken images or layout issues
```

#### Test 3: Google OAuth (if credentials available)
```
1. Click "Sign in with Google"
2. Expected:
   - Redirects to Google login
   - After login, redirects back to dashboard
   - Session created in database
   - User data persists
```

Note: Use test Google OAuth credentials from Google Cloud Console

#### Test 4: Dashboard (after login)
```
1. URL: http://localhost:3000/dashboard
2. Verify:
   - Dashboard loads
   - "No businesses yet" message appears
   - "Create Business" button visible
   - Tailwind CSS styling applied
   - Sign Out button works
```

#### Test 5: Create Business (optional)
```
1. Click "Create Business" button
2. Enter business name: "Test Business"
3. Expected:
   - Business created
   - Added to business list
   - Data persists on refresh
```

---

## 🧪 Detailed Testing Checklist

### Code Quality
- [ ] `npm run lint` passes without errors
- [ ] No TypeScript compilation errors
- [ ] All imports resolve correctly

### Database
- [ ] Database connection works
- [ ] Tables created successfully
- [ ] Relations are correct
- [ ] Prisma client initializes

### API Endpoints
- [ ] `/api/auth/[...nextauth]` responds
- [ ] `/api/businesses` GET/POST work
- [ ] `/api/reviews` GET works
- [ ] Error handling works (test with invalid data)

### Frontend
- [ ] Pages render without errors
- [ ] Navigation works (signin → dashboard)
- [ ] Styling applied correctly
- [ ] Responsive on mobile (F12 → Device toolbar)

### Authentication
- [ ] Session created after login
- [ ] Session persists on refresh
- [ ] Sign out clears session
- [ ] Protected routes redirect to signin

### Database Operations
- [ ] Create business successful
- [ ] Read businesses successful
- [ ] User data persists
- [ ] No SQL errors in console

---

## 🔍 Testing Individual Features

### Test 1: Database Connection
```bash
# Open Prisma Studio to view database
npm run db:studio

# Should open: http://localhost:5555
# Verify:
# - Can see User, Business, Brand, Location tables
# - Tables are empty (first run)
# - Can create test records
```

### Test 2: API Endpoints (using curl or Postman)

**Get Businesses (no auth)**
```bash
curl http://localhost:3000/api/businesses
# Expected: 401 Unauthorized (no session)
```

**Create Business (with auth)**
```bash
# After logging in, copy session cookie
# Then test:
curl -H "Cookie: next-auth.session-token=..." \
  -X POST http://localhost:3000/api/businesses \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Biz"}'
# Expected: 201 Created with business data
```

### Test 3: Environment Variables
```bash
# Verify all required variables are set
# Open .env.local and check:
# - DATABASE_URL: Valid PostgreSQL connection
# - NEXTAUTH_SECRET: Set to any value
# - NEXTAUTH_URL: http://localhost:3000
```

---

## ⚠️ Common Issues & Troubleshooting

### Issue 1: "npm: command not found"
**Solution**: Node.js not installed or not in PATH
- Reinstall Node.js from https://nodejs.org/
- Restart terminal/VS Code after installation

### Issue 2: "Cannot connect to database"
**Solution**: PostgreSQL not running or wrong credentials
```bash
# Check if PostgreSQL is running
# Windows: Services → PostgreSQL
# macOS: brew services list
# Linux: systemctl status postgresql

# Verify connection string in .env.local
# Format: postgresql://user:password@localhost:5432/dbname
```

### Issue 3: "port 3000 already in use"
**Solution**: Another process using port 3000
```bash
# Windows: Find process on port 3000
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F

# Or use different port
PORT=3001 npm run dev
```

### Issue 4: "Module not found" errors
**Solution**: Dependencies not installed
```bash
# Delete node_modules and reinstall
rm -r node_modules package-lock.json
npm install
```

### Issue 5: TypeScript errors on startup
**Solution**: Build the project first
```bash
npm run build
npm run dev
```

### Issue 6: Database migration fails
**Solution**: Clear and retry
```bash
# Drop all tables
npm run db:push -- --force-reset

# Or manually delete tables in pgAdmin, then:
npm run db:push
```

---

## 📊 Expected Test Results

### ✅ All Tests Pass
- Build completes: ✓
- Dev server starts: ✓
- Pages load: ✓
- No console errors: ✓
- Database works: ✓
- Ready for Vercel deployment!

### ⚠️ Some Failures
- **TypeScript errors**: Review and fix
- **Database errors**: Check connection
- **Missing modules**: Run `npm install` again
- **Port conflicts**: Use different port

### ❌ Major Issues
- Build fails: Check syntax errors in code
- Dev server won't start: Check error logs
- Database won't connect: Verify PostgreSQL running

---

## 📝 Test Verification Form

After running all tests, fill this out:

```
LOCAL TESTING VERIFICATION
==========================

Date: ___________
Tester: ___________

Code Quality:
[ ] npm run lint → PASS
[ ] npm run build → PASS
[ ] No TypeScript errors

Database:
[ ] PostgreSQL running
[ ] Database created
[ ] Tables created
[ ] npm run db:push → SUCCESS

Development:
[ ] npm run dev → Server starts
[ ] Port 3000 accessible
[ ] No startup errors

Browser Testing:
[ ] http://localhost:3000 → Loads
[ ] /auth/signin → Visible
[ ] Sign-in page → Styled correctly
[ ] Navigation → Works
[ ] Dashboard → Accessible (after login)

API Testing:
[ ] GET /api/businesses → Works
[ ] POST /api/businesses → Works
[ ] Error handling → Works

Database Operations:
[ ] Create business → Works
[ ] Read businesses → Works
[ ] Data persistence → Works

Overall Status: [ ] PASS [ ] FAIL [ ] PARTIAL

Issues Found:
_______________________________________________

Notes:
_______________________________________________

Ready for Vercel: [ ] YES [ ] NO [ ] PENDING FIXES
```

---

## ✅ Final Checklist Before Vercel Deployment

Before pushing to Vercel, verify:

### Code Quality
- [ ] No TypeScript errors
- [ ] ESLint passes
- [ ] Production build successful
- [ ] No console warnings/errors

### Functionality
- [ ] Authentication flow works
- [ ] Database operations work
- [ ] API endpoints respond
- [ ] Pages render correctly

### Security
- [ ] No secrets in code (only in .env.local)
- [ ] HTTPS-ready (Vercel handles this)
- [ ] CORS configured
- [ ] Input validation ready

### Configuration
- [ ] .env.local has all required variables
- [ ] DATABASE_URL points to correct DB
- [ ] NEXTAUTH_SECRET is strong
- [ ] All API keys are valid

---

## 🚀 Next Steps After Local Testing

1. **If All Tests Pass:**
   - Commit code to GitHub
   - Connect to Vercel
   - Set environment variables in Vercel dashboard
   - Deploy!

2. **If Some Tests Fail:**
   - Fix errors locally
   - Re-run tests
   - Commit fixes to GitHub
   - Then deploy

3. **If Major Issues:**
   - Debug locally using Dev Tools
   - Check error logs: `npm run dev` output
   - Review this guide's troubleshooting section
   - Don't deploy until fixed

---

## 📞 Quick Reference Commands

```bash
# Installation
npm install              # Install dependencies

# Database
npm run db:push         # Sync schema
npm run db:studio       # View database
npm run db:migrate      # Create migration

# Testing
npm run lint            # Check code quality
npm run build           # Production build
npm run dev             # Development server

# Cleanup
npm run db:push -- --force-reset   # Reset database
rm -rf node_modules .next          # Clear cache
npm install                         # Reinstall
```

---

**This guide will ensure your local testing is thorough before Vercel deployment!**

Good luck! 🚀

# ✅ PRE-DEPLOYMENT TESTING CHECKLIST

## 📋 Complete Local Testing Plan

Use this checklist to test your MVP before deploying to Vercel.

---

## PHASE 1: ENVIRONMENT SETUP ✓

### 1.1 Install Node.js
- [ ] Download Node.js 18+ from https://nodejs.org/
- [ ] Run installer
- [ ] Verify: `node --version` (should show v18.0.0 or higher)
- [ ] Verify: `npm --version` (should show 9.0.0 or higher)

### 1.2 Install PostgreSQL (for database)
- [ ] Download PostgreSQL from https://www.postgresql.org/download/
- [ ] Run installer
- [ ] Create test database: `google_review_db`
- [ ] Verify: Connect with pgAdmin or psql
- [ ] Note connection string for `.env.local`

### 1.3 Navigate to Project
```bash
cd C:\Users\nanudeep\Downloads\next
```

---

## PHASE 2: INSTALL DEPENDENCIES ✓

### 2.1 Install npm packages
```bash
npm install
```
- [ ] Command completes without errors
- [ ] `node_modules/` folder exists (500+ MB)
- [ ] `package-lock.json` created/updated

### 2.2 Verify key packages
```bash
npm list next @prisma/client next-auth
```
- [ ] All packages listed
- [ ] No "missing" errors

---

## PHASE 3: CONFIGURE ENVIRONMENT ✓

### 3.1 Create `.env.local` with test values
```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/google_review_db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="test-secret-key-12345"
GOOGLE_CLIENT_ID="test-id"
GOOGLE_CLIENT_SECRET="test-secret"
GOOGLE_BUSINESS_API_KEY="test-key"
OPENAI_API_KEY="test-key"
OPENAI_MODEL="gpt-4-turbo"
WHATSAPP_BUSINESS_ACCOUNT_ID="test-id"
WHATSAPP_PHONE_NUMBER_ID="test-id"
WHATSAPP_BUSINESS_TOKEN="test-token"
WHATSAPP_WEBHOOK_VERIFY_TOKEN="test-token"
NODE_ENV="development"
```

- [ ] `.env.local` file created
- [ ] `DATABASE_URL` has correct PostgreSQL connection
- [ ] `NEXTAUTH_SECRET` is set to any value (test value ok)
- [ ] `NEXTAUTH_URL` is `http://localhost:3000`

### 3.2 Verify environment variables are read
```bash
# On Windows PowerShell
Get-Content .env.local | Select-String DATABASE_URL
```
- [ ] DATABASE_URL displayed correctly

---

## PHASE 4: DATABASE SETUP ✓

### 4.1 Ensure PostgreSQL is running
```bash
# Windows: Check Services → PostgreSQL
# Or test connection:
psql -U postgres -d postgres -c "SELECT 1"
```
- [ ] PostgreSQL service is running
- [ ] Can connect without errors

### 4.2 Sync database schema
```bash
npm run db:push
```
- [ ] Command completes successfully
- [ ] Output shows tables created
- [ ] No migration errors

### 4.3 Verify tables created
```bash
npm run db:studio
```
- [ ] Opens Prisma Studio at http://localhost:5555
- [ ] Can see all 8 tables:
  - [ ] User
  - [ ] Account
  - [ ] Session
  - [ ] Business
  - [ ] Brand
  - [ ] Location
  - [ ] Review
  - [ ] AiReply
  - [ ] Notification
  - [ ] AuditLog

---

## PHASE 5: CODE QUALITY ✓

### 5.1 Check TypeScript compilation
```bash
npm run lint
```
- [ ] Command completes
- [ ] No major errors (warnings are ok)
- [ ] Output shows "✓ All files checked"

### 5.2 Production build test
```bash
npm run build
```
- [ ] Build completes successfully
- [ ] No errors like "Type error" or "Build failed"
- [ ] `.next/` folder created
- [ ] File size is reasonable (50-100 MB)

### 5.3 Check output details
```bash
# Check build output for:
```
- [ ] Route compilation shows all pages
- [ ] API routes compiled
- [ ] Image optimization complete
- [ ] No "error" in output

---

## PHASE 6: DEVELOPMENT SERVER ✓

### 6.1 Start development server
```bash
npm run dev
```
- [ ] Server starts on port 3000
- [ ] Output shows: `ready - started server on 0.0.0.0:3000, url: http://localhost:3000`
- [ ] No startup errors

### 6.2 Keep server running for browser tests
- [ ] Terminal shows "ready" status
- [ ] No error logs appearing
- [ ] Server responsive (ready to accept requests)

---

## PHASE 7: BROWSER TESTING ✓

### 7.1 Test Home Page
```
Open: http://localhost:3000
```
- [ ] Page loads (no 404 or blank page)
- [ ] Redirects to `/auth/signin` (if not logged in)
- [ ] No console errors (F12 → Console)
- [ ] Page title shows correctly

### 7.2 Test Sign-In Page
```
Open: http://localhost:3000/auth/signin
```
- [ ] Page loads successfully
- [ ] Title: "Google Reviews Manager"
- [ ] Description text visible
- [ ] "Sign in with Google" button visible
- [ ] Tailwind CSS styling applied (colors, spacing)
- [ ] Responsive design works (try F12 → Device toolbar)
- [ ] No images broken
- [ ] No console errors

### 7.3 Test Navigation
- [ ] Click logo → works
- [ ] Text readable and aligned correctly
- [ ] Button is clickable (hover effect visible)
- [ ] Links have proper styling

### 7.4 Test Responsive Design
```
F12 → Click device toolbar icon → Select mobile
```
- [ ] Page layout adjusts for mobile
- [ ] Text remains readable
- [ ] Buttons remain clickable
- [ ] No horizontal scrolling

### 7.5 Console Checks
```
F12 → Console tab
```
- [ ] No red errors
- [ ] No warnings about deprecated APIs
- [ ] Network tab: all requests succeed (200 status)

---

## PHASE 8: API TESTING ✓

### 8.1 Test API Endpoints (using browser or curl)

**Without Authentication:**
```
Open: http://localhost:3000/api/businesses
```
- [ ] Returns 401 Unauthorized (expected - no session)
- [ ] Status code is 401, not 500

**Database Query:**
```
GET http://localhost:3000/api/businesses
Response: {"error": "Unauthorized"}
```
- [ ] Returns proper error message
- [ ] No database errors
- [ ] No internal server errors (500)

### 8.2 Test Health (if available)
```
Open: http://localhost:3000/api/auth/callback/google
```
- [ ] Returns error (expected - no callback)
- [ ] Status is 400/401, not 500
- [ ] Server is responsive

---

## PHASE 9: ERROR HANDLING ✓

### 9.1 Test invalid route
```
Open: http://localhost:3000/invalid-page
```
- [ ] Shows 404 page or Next.js error page
- [ ] Not a blank page or 500 error
- [ ] Styling shows correctly

### 9.2 Test API error
```
Open: http://localhost:3000/api/invalid-endpoint
```
- [ ] Returns 404 or proper error
- [ ] Not a blank response
- [ ] JSON error format (if applicable)

---

## PHASE 10: CONFIGURATION VERIFICATION ✓

### 10.1 Check configuration files
- [ ] `tsconfig.json` exists and valid
- [ ] `next.config.ts` exists and valid
- [ ] `tailwind.config.js` exists
- [ ] `.eslintrc.json` exists
- [ ] `prisma/schema.prisma` exists

### 10.2 Verify package.json scripts
```bash
npm run
```
Shows:
- [ ] `dev` - Development server
- [ ] `build` - Production build
- [ ] `start` - Production start
- [ ] `lint` - Linting
- [ ] `db:push` - Database sync
- [ ] `db:studio` - Prisma Studio

---

## PHASE 11: FILE STRUCTURE ✓

Verify all required files exist:

### Source Code
- [ ] `src/app/page.tsx`
- [ ] `src/app/layout.tsx`
- [ ] `src/app/globals.css`
- [ ] `src/app/auth/signin/page.tsx`
- [ ] `src/app/dashboard/page.tsx`
- [ ] `src/app/api/auth/[...nextauth]/route.ts`
- [ ] `src/app/api/businesses/route.ts`
- [ ] `src/app/api/reviews/route.ts`
- [ ] `src/app/api/reviews/[reviewId]/route.ts`
- [ ] `src/app/api/webhooks/whatsapp/route.ts`

### Libraries
- [ ] `src/lib/auth.ts`
- [ ] `src/lib/prisma.ts`

### Services
- [ ] `src/services/review-ingestion.ts`
- [ ] `src/services/ai-reply.ts`
- [ ] `src/services/whatsapp.ts`

### Database
- [ ] `prisma/schema.prisma`
- [ ] `prisma/seed.ts`

### Configuration
- [ ] `package.json`
- [ ] `.env.local`
- [ ] `tsconfig.json`
- [ ] `next.config.ts`
- [ ] `tailwind.config.js`
- [ ] `.eslintrc.json`
- [ ] `.gitignore`

---

## PHASE 12: DOCUMENTATION ✓

- [ ] `README.md` exists
- [ ] `GETTING_STARTED.md` exists
- [ ] `ARCHITECTURE.md` exists
- [ ] `.github/copilot-instructions.md` exists

---

## FINAL CHECKS ✓

### 12.1 Performance Baseline
```bash
npm run build
```
Check build times:
- [ ] Build completes in < 60 seconds
- [ ] No warnings about large bundle
- [ ] All routes included in manifest

### 12.2 Security Check
- [ ] No API keys in code (all in `.env.local`)
- [ ] No passwords hardcoded
- [ ] `next-auth` properly configured
- [ ] CORS ready for production

### 12.3 Ready for Deployment
- [ ] All checks passed: ✓
- [ ] No errors or critical warnings
- [ ] Production build successful
- [ ] Database connection verified
- [ ] All files in place

---

## SUMMARY TABLE

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Environment | [ ] | Node.js, PostgreSQL installed |
| 2. Dependencies | [ ] | npm install completed |
| 3. Configuration | [ ] | .env.local created with values |
| 4. Database | [ ] | Tables created, Prisma ready |
| 5. Code Quality | [ ] | Lint and build pass |
| 6. Dev Server | [ ] | Server starts on port 3000 |
| 7. Browser Tests | [ ] | Pages load, no errors |
| 8. API Tests | [ ] | Endpoints respond correctly |
| 9. Error Handling | [ ] | Invalid routes handled |
| 10. Config Files | [ ] | All config files valid |
| 11. File Structure | [ ] | All files exist |
| 12. Documentation | [ ] | All docs present |

---

## ✅ DEPLOYMENT APPROVAL

When all checks are complete and passed, sign off:

```
Date: _______________
Tester: _______________
Status: [ ] PASS [ ] FAIL [ ] PARTIAL

Issues Found:
_______________________________________

Ready for Vercel: [ ] YES [ ] NO

Notes:
_______________________________________
```

---

## 🚀 Next Steps After Passing All Tests

1. **Commit to GitHub**
   ```bash
   git add .
   git commit -m "MVP tested and ready for deployment"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to https://vercel.com/
   - Import GitHub repository
   - Set environment variables
   - Deploy!

3. **Post-Deployment Testing**
   - Test live URL
   - Monitor error logs
   - Check performance

---

**Congratulations! Your MVP is ready for production deployment!** 🎉

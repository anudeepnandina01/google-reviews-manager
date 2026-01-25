# Production Deployment Guide

## Prerequisites

Before deploying to Vercel, you need to set up a PostgreSQL database.

## Step 1: Set Up PostgreSQL Database (Free)

Choose one of these free options:

### Option A: Neon (Recommended)
1. Go to [neon.tech](https://neon.tech)
2. Sign up with GitHub
3. Create a new project
4. Copy the connection string (looks like: `postgresql://user:pass@host/db?sslmode=require`)

### Option B: Supabase
1. Go to [supabase.com](https://supabase.com)
2. Sign up and create a new project
3. Go to Settings → Database → Connection string
4. Copy the URI connection string

### Option C: PlanetScale (MySQL)
Note: If using PlanetScale, change `provider = "postgresql"` to `provider = "mysql"` in `prisma/schema.prisma`

## Step 2: Enable Firebase Email/Password Auth

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Authentication → Sign-in method
4. Enable "Email/Password"
5. Save

## Step 3: Deploy to Vercel

### Option A: One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Option B: Manual Deploy
```bash
npm install -g vercel
vercel login
vercel
```

## Step 4: Configure Environment Variables in Vercel

In Vercel Dashboard → Project → Settings → Environment Variables, add:

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | Your PostgreSQL connection string | ✅ Yes |
| `JWT_SECRET` | Generate with: `openssl rand -base64 32` | ✅ Yes |
| `NEXTAUTH_SECRET` | Same as JWT_SECRET | ✅ Yes |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | From Firebase Console | ✅ Yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | From Firebase Console | ✅ Yes |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | From Firebase Console | ✅ Yes |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | From Firebase Console | ✅ Yes |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | From Firebase Console | ✅ Yes |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | From Firebase Console | ✅ Yes |
| `OPENAI_API_KEY` | From OpenAI (for AI replies) | Optional |
| `WHATSAPP_BUSINESS_TOKEN` | From Meta Business | Optional |
| `WHATSAPP_PHONE_NUMBER_ID` | From Meta Business | Optional |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | From Meta Business | Optional |

## Step 5: Run Database Migration

After first deploy, run:
```bash
npx prisma db push
```

Or in Vercel, add this to your build command in `vercel.json`:
```json
{
  "buildCommand": "npx prisma generate && npx prisma db push && npm run build"
}
```

## Step 6: Update Firebase Authorized Domains

1. Go to Firebase Console → Authentication → Settings
2. Add your Vercel domain to "Authorized domains":
   - `your-app.vercel.app`
   - `your-custom-domain.com` (if applicable)

## Security Checklist

- [x] JWT-signed sessions (not plain base64)
- [x] Rate limiting on all API endpoints
- [x] Firebase token verification
- [x] HTTPS-only cookies in production
- [x] Environment variables secured
- [ ] Set up monitoring (optional)
- [ ] Configure custom domain (optional)

## Cost Estimates

| Service | Free Tier | Paid |
|---------|-----------|------|
| Vercel | Hobby (free) | Pro $20/mo |
| PostgreSQL (Neon) | 0.5GB free | Pay as you go |
| Firebase Auth | Unlimited | Free |
| OpenAI | None | ~$0.01-0.03/reply |
| WhatsApp API | None | ~$0.005-0.08/msg |

## Troubleshooting

### "Cannot connect to database"
- Check DATABASE_URL is correct
- Ensure SSL mode is enabled (`?sslmode=require`)

### "Firebase auth not working"
- Add Vercel domain to Firebase authorized domains
- Check all NEXT_PUBLIC_FIREBASE_* variables are set

### "Session not persisting"
- Ensure JWT_SECRET is set
- Check cookies are being set (same domain)

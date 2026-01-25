# Copilot Instructions for Google Reviews Manager

This workspace contains a Next.js MVP for an automated Google Review → WhatsApp Alert System with AI-generated replies.

## Key Architecture Principles
- **Event-Driven & Async**: Reviews, AI generation, and notifications process independently
- **Parallel Processing**: Locations/reviews processed in parallel with distributed locking
- **Human-in-the-Loop AI**: No auto-posting; owner must approve every reply
- **Business-Agnostic**: Works for any industry
- **Single Source of Truth**: Backend owns all state

## Project Structure
```
src/
├── app/                 # Next.js App Router (pages + API routes)
├── lib/                 # Core utilities (auth, prisma)
├── services/            # Business logic (review fetching, AI, WhatsApp)
├── components/          # React components (TBD)
prisma/
└── schema.prisma       # Database schema (Users, Businesses, Reviews, AI Replies, etc)
```

## Key Features
- ✓ Google OAuth authentication
- ✓ Multi-business, multi-location management
- ✓ Google Business Profile review ingestion (with deduplication)
- ✓ OpenAI-powered reply generation (async, non-blocking)
- ✓ WhatsApp notifications (instant alerts with AI suggestions)
- ✓ Owner approval workflow (mandatory before posting)
- ✓ Event audit logging
- ✓ Retry logic with exponential backoff

## API Endpoints

### Reviews
- `GET /api/reviews` - List reviews with filtering
- `GET /api/reviews/:reviewId` - Get review with AI reply
- `POST /api/reviews/:reviewId` - Approve/skip reply

### Business
- `GET /api/businesses` - List user's businesses
- `POST /api/businesses` - Create new business

### Webhooks
- `GET/POST /api/webhooks/whatsapp` - WhatsApp delivery status

## Database Setup
1. Install PostgreSQL 13+
2. Update `DATABASE_URL` in `.env.local`
3. Run `npm run db:push` to sync schema
4. Optional: `npm run db:studio` to view/edit data

## Environment Variables Required
```
DATABASE_URL=postgresql://...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_BUSINESS_API_KEY=<from Google Cloud>
OPENAI_API_KEY=<from OpenAI>
WHATSAPP_BUSINESS_ACCOUNT_ID=<from Meta>
WHATSAPP_PHONE_NUMBER_ID=<from Meta>
WHATSAPP_BUSINESS_TOKEN=<from Meta>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<custom, any string>
```

## Common Tasks

### Add New API Endpoint
1. Create file in `src/app/api/[route]/route.ts`
2. Export GET/POST/PUT/DELETE functions
3. Add authentication with `getServerSession(authOptions)`

### Add New Database Entity
1. Update `prisma/schema.prisma`
2. Run `npm run db:migrate`
3. Use Prisma Client in services

### Add Frontend Page
1. Create component in `src/app/[route]/page.tsx`
2. Use `getServerSession()` to protect routes
3. Fetch API data with `fetch()` or client-side hooks

## Development Workflow
```bash
npm run dev              # Start dev server (port 3000)
npm run db:studio       # Open Prisma Studio (manage data)
npm run lint            # Check TypeScript & ESLint
npm run build           # Production build
```

## Important Notes
- All reviews are immutable (external source of truth)
- AI replies never auto-post; owner approval is mandatory
- Notifications are fire-and-forget (don't block other systems)
- Location processing has distributed locking to prevent overlaps
- All events logged for audit/compliance

## Deployment
- Optimized for Vercel one-click deploy
- Environment variables set in Vercel dashboard
- Database connection via `DATABASE_URL`
- NextAuth auto-configured for production

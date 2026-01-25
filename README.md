# Google Review → WhatsApp Alert System (MVP)

A production-ready Next.js full-stack application that instantly notifies business owners via WhatsApp when they receive Google reviews, with AI-generated professional replies that require owner approval before posting.

## 🎯 MVP Features

### ✅ P0 - Must Have
- **Authentication**: Google OAuth login for business owners
- **Business Management**: Create and manage multiple businesses, brands, and locations
- **Google Review Integration**: Automated fetching of reviews from Google Business Profiles
- **AI Reply Generation**: OpenAI-powered professional reply suggestions (non-blocking, async)
- **WhatsApp Notifications**: Instant alerts with review details and AI suggestions
- **Owner Approval Workflow**: Mandatory review and approval before any reply is posted
- **Event-Driven Architecture**: Parallel processing of reviews, notifications, and AI generation

### 🔴 P1 - High Value (Coming Soon)
- Negative review highlighting in WhatsApp messages
- Reply status tracking (Pending, Approved, Sent, Skipped)

### 🟡 P2 - Post-Launch
- Location-wise review view with grouping
- Basic review history

## 🏗️ Architecture

### Backend Design Principles
1. **Event-Driven & Async**: Reviews, AI generation, and notifications process independently
2. **Parallel by Default**: Locations and reviews are processed in parallel with locking to prevent overlaps
3. **Human-in-the-Loop**: AI replies never auto-post; owner must approve each reply
4. **Business-Agnostic**: Works for any industry, not limited to restaurants
5. **Single Source of Truth**: Backend owns all state for reviews, replies, and notifications

### Key Components

#### Services
- **`services/review-ingestion.ts`**: Fetches Google reviews, prevents duplicates, triggers parallel tasks
- **`services/ai-reply.ts`**: Generates AI suggestions using OpenAI (async, non-blocking)
- **`services/whatsapp.ts`**: Sends WhatsApp notifications with retry logic

#### API Routes
- `POST /api/reviews/:reviewId` - Approve or skip AI-generated reply
- `GET /api/reviews` - List reviews with filtering
- `GET/POST /api/businesses` - Manage businesses
- `POST /api/webhooks/whatsapp` - Handle WhatsApp delivery status

#### Database (Prisma + PostgreSQL)
- User accounts (NextAuth)
- Business hierarchy (Business → Brand → Location)
- Reviews (immutable, externally sourced)
- AI Replies (with approval workflow)
- Notifications (with retry tracking)
- Audit logs (event tracking)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Google OAuth credentials
- Google Business Profile API access
- OpenAI API key
- WhatsApp Business Account with API access

### Installation

1. **Clone and Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Environment Variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Fill in all required variables:
   - Database connection
   - NextAuth configuration
   - Google OAuth credentials
   - API keys (Google Business, OpenAI, WhatsApp)

3. **Setup Database**
   ```bash
   npx prisma db push
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```
   
   Visit `http://localhost:3000`

5. **Optional: View Database**
   ```bash
   npm run db:studio
   ```

## 📋 Database Schema

### Core Tables

#### User
- OAuth authentication with NextAuth
- Can manage multiple businesses

#### Business → Brand → Location
- One business can have multiple brands
- Each brand can have multiple locations
- Reviews are tied to locations

#### Review
- Immutable records from Google Business Profile
- Unique external ID to prevent duplicates
- Linked to location and business

#### AiReply
- Suggested reply from OpenAI
- States: PENDING_APPROVAL → APPROVED → SENT (or SKIPPED)
- Owner can edit before approval

#### Notification
- WhatsApp message record
- Tracks delivery status and retries
- Fire-and-forget with exponential backoff

#### AuditLog
- Event tracking for compliance
- Events: REVIEW_CREATED, AI_REPLY_GENERATED, REPLY_APPROVED, REPLY_SENT, etc.

## 🔄 Event Flow

```
1. New Review Detected from Google
   ↓
2. Persist Review (Immutable)
   ↓
3. PARALLEL EXECUTION:
   ├─ WhatsApp Notification (Immediate, fire-and-forget)
   └─ AI Reply Generation (Async, non-blocking)
   ↓
4. Owner Receives WhatsApp Alert
   ├─ Review details
   ├─ Location info
   └─ Pending AI reply (if ready)
   ↓
5. Owner Review & Approval
   ├─ Edit AI suggestion (optional)
   ├─ Approve or skip
   └─ Only APPROVED replies post to Google
```

## 🔐 Security

- **Authentication**: Google OAuth only (no passwords)
- **Authorization**: Account-level + Business-level checks
- **Data**: Encrypted in transit (HTTPS/TLS)
- **Secrets**: Environment-based, never hardcoded
- **Audit Trail**: All actions logged for compliance

## 📱 WhatsApp Integration

### Message Format
```
🔔 New Review at [Location Name]

⭐⭐⭐⭐⭐ (5/5 stars)

From: [Reviewer Name]

Review:
[Review text]

Suggested Reply:
[AI-generated reply - pending approval]

[Link to approve/skip]
```

### Retry Logic
- Exponential backoff: 1s, 2s, 4s
- Max 3 retries before marking failed
- Non-blocking: Failures don't affect other systems

## 🤖 AI Reply Generation

### Powered By: OpenAI GPT-4 Turbo

### Safety Guarantees
- ✓ Professional, polite tone
- ✓ Brand-safe responses
- ✓ Never auto-posts (requires approval)
- ✓ Non-blocking (fires async)
- ✓ Graceful failure (system continues if AI fails)

### Customization
Owners can:
- Review suggested reply
- Edit reply text
- Approve to post
- Skip without replying

## 🚀 Deployment (Vercel)

### One-Click Deploy
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

### Environment Setup in Vercel
```
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=generate-with: openssl rand -base64 32
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
OPENAI_API_KEY=...
WHATSAPP_BUSINESS_TOKEN=...
```

## 📊 Scalability

Built-in support for:
- ✓ More businesses (multi-tenant design)
- ✓ More locations per business (location-level processing)
- ✓ Higher review volumes (parallel, async processing)
- ✓ Additional notification channels (WhatsApp structure extensible)
- ✓ Without additional infrastructure (optimized for serverless)

## 🔧 Development

### File Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Protected pages
│   └── layout.tsx         # Root layout
├── lib/                   # Utilities
│   ├── auth.ts           # NextAuth setup
│   └── prisma.ts         # Prisma client
├── services/              # Business logic
│   ├── review-ingestion.ts
│   ├── ai-reply.ts
│   └── whatsapp.ts
└── components/            # React components (TBD)

prisma/
└── schema.prisma         # Database schema
```

### Available Scripts
```bash
npm run dev              # Start dev server
npm run build            # Production build
npm start                # Start production server
npm run lint             # Run ESLint
npm run db:push          # Sync schema to DB
npm run db:migrate       # Create migration
npm run db:studio        # Open Prisma Studio
```

## 🚨 API Rate Limits (MVP)
- Google Business API: As per Google's limits
- OpenAI: As per OpenAI's rate limits
- WhatsApp: Per-account limits

## 🛣️ Roadmap (Post-MVP)

### P1
- [ ] Negative review highlighting
- [ ] Reply status dashboard
- [ ] Bulk operations

### P2
- [ ] Analytics & sentiment analysis
- [ ] Review scheduling
- [ ] Team collaboration features

### P3
- [ ] Competitor monitoring
- [ ] Multi-language replies
- [ ] Custom reply templates

## 📄 License

MIT - Feel free to use for your business

## 🤝 Support

For issues or questions, please create an issue in the repository.

---

**Built with** ❤️ using Next.js, Prisma, PostgreSQL, OpenAI, and WhatsApp Business API
#   D e p l o y e d   o n   V e r c e l  
 
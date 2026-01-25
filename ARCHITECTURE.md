# 🏗️ Architecture & Data Flow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Next.js App Router                                             │
│  ├─ /auth/signin          (Google OAuth)                       │
│  ├─ /dashboard            (Business management)                │
│  └─ /api/**               (API routes)                         │
│                                                                  │
│  React Components                                               │
│  ├─ SignIn Page          (OAuth flow)                          │
│  ├─ Dashboard            (Business list, review queue)         │
│  └─ Review Approval      (Approve/edit/skip replies)           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                          ↓ (HTTP/REST)
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER (Next.js Routes)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  /api/auth/[...nextauth]    NextAuth.js handler               │
│  /api/businesses            Business CRUD                      │
│  /api/reviews               Review list & create               │
│  /api/reviews/[reviewId]    Get/approve review                │
│  /api/webhooks/whatsapp     WhatsApp delivery status          │
│                                                                  │
│  + Authentication & Authorization                             │
│  + Input validation                                            │
│  + Error handling                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                  BUSINESS LOGIC LAYER (Services)               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Review Ingestion Service                              │   │
│  │ • Fetches from Google Business API                    │   │
│  │ • Prevents duplicates                                 │   │
│  │ • Location-level locking                              │   │
│  │ • Triggers parallel tasks                             │   │
│  └────────────────────────────────────────────────────────┘   │
│                          ↓                                      │
│  ┌─────────────────────────────────────────────────────┐      │
│  │  PARALLEL EXECUTION (Non-blocking)                 │      │
│  ├─────────────────────────────────────────────────────┤      │
│  │                                                     │      │
│  │  AI Reply Service          WhatsApp Service        │      │
│  │  • OpenAI integration      • Async notifications   │      │
│  │  • Graceful failure        • Retry logic           │      │
│  │  • Stores with approval    • Webhook handling      │      │
│  │                                                     │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER (Prisma + PostgreSQL)            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Tables:                                                        │
│  • User              (NextAuth sessions)                        │
│  • Account           (OAuth credentials)                        │
│  • Business          (User's businesses)                        │
│  • Brand             (Sub-category of business)                 │
│  • Location          (Physical branch)                          │
│  • Review            (Google reviews - immutable)               │
│  • AiReply           (Generated replies - pending approval)     │
│  • Notification      (WhatsApp messages - tracking)             │
│  • AuditLog          (Event trail)                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES (APIs)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Google Business API    ← Fetch reviews                        │
│  OpenAI API            ← Generate AI replies                   │
│  WhatsApp Business API ← Send notifications                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Review Processing Flow (Detailed)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. REVIEW DETECTION                                                │
└─────────────────────────────────────────────────────────────────────┘
        ↓
    Google posts new review to Business Profile
        ↓
    Review Ingestion Service.fetchAndProcessReviews()
        ↓
    ┌───────────────────────────────────────────────────────┐
    │ Get all Brands with Locations                        │
    │ → Check lock status (prevent overlaps)               │
    │ → Acquire lock for this location                     │
    └───────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. REVIEW INGESTION                                                │
└─────────────────────────────────────────────────────────────────────┘
        ↓
    fetchReviewsFromGoogle(placeId)
        ↓
    ✓ Check if review already exists (externalId)
    ✓ If exists → Skip (deduplication)
    ✓ If new → Continue
        ↓
    CREATE Review record (immutable)
    {
        externalId: "google-review-id",
        rating: 4,
        text: "Great service!",
        authorName: "John",
        locationId: "loc-123",
        businessId: "biz-456",
        reviewedAt: <timestamp>
    }
        ↓
    Log AuditLog event: REVIEW_CREATED
        ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. PARALLEL EXECUTION STARTS ⚡ (Non-blocking)                     │
└─────────────────────────────────────────────────────────────────────┘
        ↓
    ┌──────────────────────────┬──────────────────────────┐
    │                          │                          │
    ▼                          ▼                          ▼
┌──────────────────┐    ┌──────────────────┐
│ A. WhatsApp      │    │ B. AI Generation │
│ Notification     │    │ Service          │
└──────────────────┘    └──────────────────┘

A. WHATSAPP NOTIFICATION (Immediate)
    ├─ Create Notification record
    │  {
    │      reviewId: "rev-789",
    │      recipientPhone: "+1234567890",
    │      messageBody: "🔔 New Review at Downtown Café\n⭐⭐⭐⭐...",
    │      status: PENDING,
    │      retryCount: 0
    │  }
    │
    ├─ Format message with:
    │  • Rating (⭐)
    │  • Review text
    │  • Location name
    │  • Approval link
    │  • AI reply (if available)
    │
    ├─ Send to WhatsApp Business API (async)
    │  POST /v18.0/{phoneNumberId}/messages
    │
    ├─ Handle response:
    │  ✓ Success → Update notification.status = SENT
    │  ✗ Failure → Retry with exponential backoff
    │             (1s, 2s, 4s, then FAILED)
    │
    └─ Log AuditLog: NOTIFICATION_SENT

B. AI REPLY GENERATION (Async, Non-blocking)
    ├─ Trigger async (don't wait)
    │
    ├─ generateAiReply() runs independently
    │  {
    │      reviewId: "rev-789",
    │      reviewText: "Great service!",
    │      rating: 4,
    │      brandName: "Downtown Café"
    │  }
    │
    ├─ Call OpenAI API:
    │  model: "gpt-4-turbo"
    │  prompt: "Generate professional reply..."
    │
    ├─ Store AiReply:
    │  {
    │      reviewId: "rev-789",
    │      suggestedText: "Thank you for your wonderful review!...",
    │      status: PENDING_APPROVAL,
    │      approvedAt: null,
    │      sentAt: null
    │  }
    │
    ├─ Graceful failure:
    │  if (error) {
    │      log error
    │      continue (don't block review ingestion)
    │  }
    │
    └─ Log AuditLog: AI_REPLY_GENERATED
        ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. OWNER RECEIVES WHATSAPP ALERT                                  │
└─────────────────────────────────────────────────────────────────────┘
        ↓
    Message received:
    "🔔 New Review at Downtown Café
     ⭐⭐⭐⭐ (4/5)
     
     From: John Smith
     
     Review: Great service!
     
     Suggested Reply: [Pending approval...]
     
     [Review & Approve Reply]"
        ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 5. OWNER ACTION (Via Dashboard or Link)                           │
└─────────────────────────────────────────────────────────────────────┘
        ↓
    Owner clicks approval link or goes to dashboard
        ↓
    ┌─────────────────┐    ┌──────────────┐    ┌──────────────┐
    │ Option A:       │    │ Option B:    │    │ Option C:    │
    │ APPROVE         │    │ EDIT & OK    │    │ SKIP         │
    └─────────────────┘    └──────────────┘    └──────────────┘
        ↓                       ↓                   ↓
    Use AI reply         Edit suggestion      No reply posted
    as-is                then approve
        ↓                       ↓
    POST /api/reviews/{reviewId}
    {
        action: "approve",
        customReplyText: null (or edited text)
    }
        ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 6. REPLY APPROVAL & POSTING                                        │
└─────────────────────────────────────────────────────────────────────┘
        ↓
    Verify ownership (authorization check)
        ↓
    Update AiReply:
    {
        status: APPROVED,
        sentText: "Thank you...",
        approvedAt: <now>
    }
        ↓
    POST reply to Google Business API
    PUT /businesses/{businessId}/locations/{locationId}/reviews/{reviewId}/reply
    {
        reply: {
            comment: "Thank you for your wonderful review!..."
        }
    }
        ↓
    Update AiReply.status = SENT
    Set AiReply.sentAt = <now>
        ↓
    Log AuditLog: REPLY_SENT
        ↓
    ✅ DONE! Reply is now public on Google
```

---

## Database Relationships

```
┌───────────────────┐
│     User          │
│  (from NextAuth)  │
├───────────────────┤
│ id (pk)           │
│ name              │
│ email             │
│ image             │
└────────┬──────────┘
         │ 1:M
         ▼
┌───────────────────────┐
│    Business           │
│ (User's business)     │
├───────────────────────┤
│ id (pk)               │
│ name                  │
│ userId (fk)           │
└────────┬──────────────┘
         │ 1:M
         ▼
┌───────────────────────┐
│     Brand             │
│ (Sub-category)        │
├───────────────────────┤
│ id (pk)               │
│ name                  │
│ businessId (fk)       │
└────────┬──────────────┘
         │ 1:M
         ▼
┌───────────────────────┐
│    Location           │
│ (Physical branch)     │
├───────────────────────┤
│ id (pk)               │
│ name                  │
│ address               │
│ googlePlaceId         │
│ brandId (fk)          │
│ lastFetchedAt         │
│ fetchLockUntil        │
└────────┬──────────────┘
         │ 1:M
         ▼
┌───────────────────────┐         ┌──────────────────────┐
│     Review            │◄────────│   Business           │
│ (from Google)         │ M:1     │ (reference)          │
├───────────────────────┤         └──────────────────────┘
│ id (pk)               │
│ externalId (unique)   │
│ rating                │
│ text                  │
│ authorName            │
│ locationId (fk)       │
│ businessId (fk)       │
│ reviewedAt            │
└────────┬──────────────┘
         │ 1:1
         ▼
┌───────────────────────┐
│     AiReply           │
│ (Generated suggestion)│
├───────────────────────┤
│ id (pk)               │
│ reviewId (fk, unique) │
│ suggestedText         │
│ status (enum)         │◄─── PENDING_APPROVAL
│ sentText              │     APPROVED
│ approvedAt            │     SKIPPED
│ sentAt                │     SENT
└───────────────────────┘

┌───────────────────────┐
│   Notification        │
│ (WhatsApp message)    │
├───────────────────────┤
│ id (pk)               │
│ reviewId (fk)         │
│ recipientPhone        │
│ status (enum)         │◄─── PENDING
│ messageBody           │     SENT
│ retryCount            │     DELIVERED
│ lastRetryAt           │     FAILED
│ sentAt                │
└───────────────────────┘

┌───────────────────────┐
│     AuditLog          │
│ (Event tracking)      │
├───────────────────────┤
│ id (pk)               │
│ event (enum)          │◄─── REVIEW_CREATED
│ entityId              │     AI_REPLY_GENERATED
│ details (JSON)        │     REPLY_APPROVED
│ createdAt             │     REPLY_SENT
└───────────────────────┘
```

---

## State Machine: AI Reply Lifecycle

```
         ┌─────────────────────┐
         │  PENDING_APPROVAL   │
         │  (Initial state)    │
         │  Waiting for owner  │
         └──────────┬──────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
   ┌────────────┐          ┌──────────┐
   │  APPROVED  │          │  SKIPPED │
   │ Owner says │          │ Owner    │
   │ YES → POST │          │ declines │
   └──────┬─────┘          └──────────┘
          │
          ▼
   ┌──────────────┐
   │    SENT      │
   │ Posted to    │
   │ Google (final│
   │ state)       │
   └──────────────┘
```

---

## Parallel Processing Timeline

```
Timeline (seconds)
0s ────────────────────────────────────────► 10s

Review Ingested (0s)
├─ Review stored ✓ (0.1s)
│
└─ PARALLEL EXECUTION START
   │
   ├─ Task A: WhatsApp Notification
   │  ├─ Format message (0.05s)
   │  ├─ Create record (0.1s)
   │  ├─ Call WhatsApp API (0.5s)
   │  └─ Done ✓ (0.65s)
   │
   └─ Task B: AI Reply Generation
      ├─ Call OpenAI (1-3s)
      ├─ Format reply (0.1s)
      ├─ Store in DB (0.1s)
      └─ Done ✓ (1.5-3s)

Owner notified ✓ (0.65s)
AI reply ready ✓ (1.5-3s)
Owner approves at ~5s
Reply posted to Google ✓ (5.5s)

Total time: ~5.5 seconds from review creation to public reply
(without AI generation waiting)
```

---

## Error Handling & Retry Flow

```
Review Processing
        ↓
    Try: Fetch from Google
        │
    ┌───┴───┐
    │       │
Success  Failure
    │       └──→ Log error
    │           Retry with backoff
    │           Max 3 retries
    │           Then FAILED
    │
    ▼
Create Review
        ↓
    Try: Send WhatsApp
        │
    ┌───┴───┐
    │       │
Success  Failure
    │       └──→ Retry 1: Wait 1s
    │           Retry 2: Wait 2s
    │           Retry 3: Wait 4s
    │           Then FAILED
    │
    ▼
Trigger AI
        │
    ┌───┴────────┐
    │            │
Success      Failure
    │        └──→ Log error
    │            Continue anyway
    │            (no AI reply, but review processed)
    │
    ▼
✅ Done
(All failures isolated - one error doesn't break others)
```

---

## Authentication & Authorization Flow

```
Public User
    │
    ▼
Visit /auth/signin
    │
    ▼
Click "Sign in with Google"
    │
    ▼
Redirect to Google OAuth
    │
    ▼
User logs in
    │
    ▼
Google redirects with auth code
    │
    ▼
NextAuth handles code → creates session
    │
    ▼
Redirect to /dashboard
    │
    ▼
middleware checks session
    │
    ┌─────────────────┐
    │                 │
 Valid?           Invalid
    │                 │
    ▼                 ▼
Allow          Redirect to /auth/signin
    │
    ▼
Access protected page/API
    │
    ▼
getServerSession() retrieves user.id
    │
    ▼
Check authorization:
├─ User owns business? ✓
├─ Can access review? ✓
└─ Can modify data? ✓
    │
    ▼
Return data OR 403 Forbidden
```

---

This covers the complete architecture and flow of your MVP! 🎉

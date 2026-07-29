# ReachInbox Email Job Scheduler

A production-grade email scheduling system built with Node.js/TypeScript on the backend and Next.js 16 on the frontend. Emails are scheduled as BullMQ delayed jobs backed by Redis. No cron. No polling. No in-memory state. Every email survives a server restart.
Video Demonstration Link: https://drive.google.com/file/d/1o--7GrKI7g-gWfWBVCdtC-BdqX90RunX/view?usp=sharing
---

## Table of Contents

1. [Overview](#overview)
2. [Features Implemented](#features-implemented)
3. [Architecture](#architecture)
4. [Backend](#backend)
   - [Stack](#backend-stack)
   - [Directory Structure](#backend-directory-structure)
   - [API Reference](#api-reference)
   - [Rate Limiting](#rate-limiting)
   - [Restart Safety](#restart-safety)
   - [Worker](#worker)
4. [Frontend](#frontend)
   - [Stack](#frontend-stack)
   - [Directory Structure](#frontend-directory-structure)
   - [Pages](#pages)
   - [Authentication](#authentication)
5. [Data Model](#data-model)
6. [Environment Variables](#environment-variables)
7. [Running with Docker](#running-with-docker)
8. [Local Development](#local-development)
9. [Production Checklist](#production-checklist)

---

## Overview

The system accepts a campaign creation request containing a list of recipient email addresses, a subject, a body, a scheduled start time, an optional delay between sends (seconds), and an optional hourly send limit. It writes each recipient as a separate row in PostgreSQL, enqueues each as a BullMQ delayed job in Redis keyed by a deterministic job ID, and processes them in a background worker. If the server is restarted before any job fires, a reconciliation pass on startup re-enqueues any jobs that were lost.

The frontend is a Gmail-style single-page application with Google OAuth sign-in, a two-column dashboard (sidebar + email list), and a full-page compose screen.

---

## Features Implemented

### Backend
- **Scheduler**: Utilizes **BullMQ** backed by **Redis** for robust, cron-less job scheduling. Jobs are queued dynamically with specific delay timestamps.
- **Persistence**: Gracefully handles server restarts. Data is persistently stored in PostgreSQL. If a server crashes, BullMQ resumes processing from Redis without dropping a single job.
- **Rate Limiting**: Implements a highly scalable, atomic **Redis Lua script** to enforce hourly limits per sender and campaign. Jobs exceeding the limit are not dropped but cleanly rescheduled (`retryAfterMs`) to the next hour boundary.
- **Concurrency**: Worker is configured to process multiple jobs simultaneously (`WORKER_CONCURRENCY=5`), ensuring high throughput without blocking the main thread.
- **Idempotency**: Every email sent is guarded by an idempotency check in Postgres to guarantee no recipient ever receives the exact same email twice.

### Frontend
- **Login**: Secured via NextAuth using **real Google OAuth** integration.
- **Dashboard**: Features a sleek, responsive sidebar layout cleanly separating Scheduled and Sent email views. Includes real-time polling to keep data synchronized without page reloads.
- **Compose**: Rich text editor for drafting emails. Supports bulk recipient imports by directly extracting emails from uploaded `.csv` or `.txt` files using a powerful Regex parser.
- **Data Tables**: Detailed table views with dynamic status badges, loading skeletons, and empty states. Beautifully renders HTML bodies into the expanded view.

---

## Architecture

```
Browser (Next.js 16)
    |
    | HTTP REST (JSON)
    v
Backend API (Express + TypeScript)
    |-- POST /api/campaigns   --> writes Email rows to PostgreSQL
    |                         --> enqueues BullMQ delayed jobs in Redis
    |-- GET  /api/emails      --> reads Email rows with status/pagination
    |-- GET  /api/campaigns   --> aggregated campaign view
    |-- GET  /api/health      --> liveness check
    |
    +-- Worker process (BullMQ)
            |-- pulls jobs from Redis queue
            |-- checks per-sender hourly rate limit (Lua script, atomic)
            |-- sends via Nodemailer (SMTP)
            |-- updates Email row (sent/failed/rescheduled)
            |-- on rate-limit hit: moves job to next hourly window
    |
PostgreSQL (via Prisma ORM)
Redis (BullMQ queue + rate-limit counters)
```

### Job ID Convention

Every BullMQ job has a deterministic ID: `email_send_{emailId}`. This makes the system idempotent: re-enqueueing the same email on restart does not create duplicate jobs; BullMQ deduplicates by ID.

### Why Not Cron

Cron-based schedulers poll the database on a fixed interval, which means:
- They cannot achieve sub-minute precision without hammering the DB.
- They lose all pending jobs on restart unless they scan the DB on boot anyway.
- They create thundering-herd problems when many emails are due at the same second.

BullMQ delayed jobs sit in a sorted set in Redis keyed by their scheduled timestamp. Redis is responsible for promoting them to the active queue at exactly the right millisecond. The worker only wakes up when there is actual work to do.

---

## Backend

### Backend Stack

| Dependency | Purpose |
|---|---|
| Node.js 20 + TypeScript | Runtime and type safety |
| Express 4 | HTTP server |
| Prisma ORM | PostgreSQL schema, migrations, typed client |
| BullMQ | Redis-backed job queue with delayed job support |
| ioredis | Redis client (shared between API and worker) |
| Nodemailer | SMTP email delivery |
| Zod | Request validation |
| express-rate-limit | API-level rate limiting |

### Backend Directory Structure

```
backend/
  prisma/
    schema.prisma          -- data model (Campaign, Email)
    migrations/            -- Prisma migration history
  src/
    config.ts              -- environment variable validation and export
    index.ts               -- Express app, boot sequence, reconciliation
    worker.ts              -- BullMQ worker: rate limiting, send, update
    lib/
      prisma.ts            -- singleton Prisma client
      queue.ts             -- BullMQ queue and connection
      rateLimiter.ts       -- atomic Lua-based hourly rate limiter
    routes/
      campaigns.ts         -- POST /api/campaigns, GET /api/campaigns
      emails.ts            -- GET /api/emails
      health.ts            -- GET /api/health
    services/
      emailService.ts      -- createCampaign: write DB rows + enqueue jobs
      mailer.ts            -- Nodemailer transport factory
    scripts/
      seed.ts              -- (optional) seed script for local testing
```

### API Reference

#### POST /api/campaigns

Creates a campaign and schedules all recipient emails as BullMQ delayed jobs.

**Request body**

```json
{
  "sender": "you@example.com",
  "recipients": ["alice@example.com", "bob@example.com"],
  "subject": "Hello from the scheduler",
  "body": "<p>This is the email body. HTML is supported.</p>",
  "scheduledTime": "2026-08-01T09:00:00.000Z",
  "delayBetweenSendsMs": 5000,
  "hourlyLimit": 50
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| sender | string | yes | Must be a valid email address |
| recipients | string[] | yes | 1 to 10,000 addresses |
| subject | string | yes | Max 998 characters (RFC 5321) |
| body | string | yes | HTML or plain text |
| scheduledTime | ISO 8601 string | yes | Must be in the future |
| delayBetweenSendsMs | number | no | Milliseconds between consecutive sends. Default: 0 |
| hourlyLimit | number | no | Max emails per hour per sender. Default: unlimited |

**Response 201**

```json
{
  "campaignId": "clz...",
  "emailCount": 2,
  "scheduledTime": "2026-08-01T09:00:00.000Z"
}
```

**Error responses**

| Code | Meaning |
|---|---|
| 400 | Validation error (Zod) |
| 429 | API rate limit exceeded |
| 500 | Database or Redis error |

---

#### GET /api/emails

Returns a paginated list of email records with optional filtering.

**Query parameters**

| Parameter | Type | Default | Notes |
|---|---|---|---|
| status | string | (all) | Comma-separated list: pending, scheduled, sending, sent, failed, rescheduled |
| campaignId | string | (all) | Filter by campaign |
| page | number | 1 | 1-indexed |
| limit | number | 20 | Max 100 |

**Response 200**

```json
{
  "data": [
    {
      "id": "...",
      "campaignId": "...",
      "emailAddress": "alice@example.com",
      "subject": "Hello",
      "body": "<p>...</p>",
      "scheduledTime": "2026-08-01T09:00:00.000Z",
      "status": "scheduled",
      "sender": "you@example.com",
      "bullmqJobId": "email_send_...",
      "attemptCount": 0,
      "lastError": null,
      "sentAt": null,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 47,
    "totalPages": 3
  }
}
```

---

#### GET /api/campaigns

Returns all campaigns with aggregated email counts by status.

**Response 200**

```json
[
  {
    "id": "...",
    "sender": "you@example.com",
    "scheduledTime": "...",
    "createdAt": "...",
    "_count": {
      "emails": 50
    }
  }
]
```

---

#### GET /api/health

Returns HTTP 200 if the server is up. No authentication required.

```json
{ "status": "ok", "timestamp": "2026-07-28T09:00:00.000Z" }
```

---

### Rate Limiting

Rate limiting operates at two layers.

**Layer 1: API-level (express-rate-limit)**

Limits inbound requests to the REST API. Configured via `API_RATE_LIMIT_WINDOW_MS` and `API_RATE_LIMIT_MAX` environment variables. Returns HTTP 429 on breach.

**Layer 2: Per-sender hourly volume (Lua script in Redis)**

Before each SMTP send, the worker calls an atomic Lua script that:
1. Increments a Redis key `rate:{sender}:{hourBucket}` using `INCRBY 1`.
2. Sets a TTL of 3600 seconds on first creation.
3. Compares the new count against the campaign's `hourlyLimit`.
4. Returns 1 (allowed) or 0 (blocked).

If blocked, the worker does not retry via BullMQ's standard retry mechanism. Instead, it:
- Calculates the start of the next hourly window.
- Marks the Email row as `rescheduled` in the database.
- Calls `job.moveToDelayed(nextWindowTimestamp)` to push the job back into the delayed set.

This ensures emails are never silently dropped and the hourly limit is honored precisely without any cronjob.

---

### Restart Safety

At server boot, `reconcilePendingEmails()` runs before the HTTP server starts accepting connections. It queries PostgreSQL for all emails with status `pending`, `scheduled`, or `rescheduled` whose `scheduledTime` has not yet passed. For each one it calls `queue.add(...)` with the deterministic job ID. BullMQ silently ignores any job ID that already exists in the queue, so this operation is fully idempotent.

---

### Worker

The worker (`src/worker.ts`) runs as a separate process. It connects to the same Redis instance as the API and processes jobs from the `email-send` queue.

For each job:
1. Fetches the Email row from PostgreSQL.
2. Checks per-sender hourly rate limit via the Lua script.
3. If rate limit is hit, moves job to next hourly window and updates DB row to `rescheduled`.
4. If allowed, updates DB row to `sending`, sends via Nodemailer.
5. On success, updates DB row to `sent` with `sentAt` timestamp.
6. On SMTP failure, updates DB row to `failed` with `lastError` text. BullMQ will retry up to `MAX_RETRIES` times with exponential backoff (`backoff.type: 'exponential'`).

---

## Frontend

### Frontend Stack

| Dependency | Purpose |
|---|---|
| Next.js 16 (Turbopack) | React framework with App Router |
| NextAuth 4 | Google OAuth session management |
| TypeScript 5 | Type safety |
| Tailwind CSS 4 | Utility-first styling |
| Lucide React | Icon set |
| PapaParse | CSV parsing for bulk recipient upload |

### Frontend Directory Structure

```
frontend/
  app/
    layout.tsx             -- root layout with font and providers
    page.tsx               -- root redirect to /dashboard
    providers.tsx          -- SessionProvider wrapper
    globals.css            -- global CSS variables and base styles
    api/
      auth/
        [...nextauth]/
          route.ts         -- NextAuth handler (Google OAuth)
    auth/
      signin/
        page.tsx           -- sign-in page with Google button
    dashboard/
      page.tsx             -- main dashboard: sidebar + email list
    compose/
      page.tsx             -- full-page compose screen
  components/
    layout/
      Sidebar.tsx          -- logo, user profile, nav, compose button
    emails/
      EmailList.tsx        -- search bar, filter dropdown, email rows
      EmailRow.tsx         -- individual row with expand, star, status badge
    compose/
      ScheduleModal.tsx    -- datetime picker modal for Send Later
    ui/
      Toast.tsx            -- toast notification system
  lib/
    api.ts                 -- typed fetch wrappers for backend REST API
  types/
    index.ts               -- Email, Campaign, PaginatedResponse types
  proxy.ts                 -- NextAuth route protection (Next.js 16)
  .env.local               -- local environment variables (not committed)
```

### Pages

#### / (root)

Immediately redirects to `/dashboard`. If the user is not authenticated, the proxy redirects to `/auth/signin`.

#### /auth/signin

A clean white card with a single "Continue with Google" button. Triggers the NextAuth Google OAuth flow. On success, redirects to `/dashboard`.

#### /dashboard

The main interface. Two-column layout:

**Left sidebar (200px)**
- ONB logo (bold, black)
- User avatar, name, and email with a chevron dropdown (sign out option)
- Green-outlined "Compose" button that navigates to `/compose`
- Core navigation: "Scheduled" and "Sent" links with live counts and active highlight

**Main panel**
- Search bar (filters by recipient email or subject in real time)
- Filter button (opens status filter dropdown: Pending / Scheduled / Rescheduled / Sending for the Scheduled tab, Sent / Failed for the Sent tab). Active filters shown as removable chips. Filter icon shows a count badge.
- Refresh button
- Email count indicator
- Scrollable list of EmailRow components
- Demo mode banner (amber) when the backend is unreachable; the list falls back to realistic mock data so the UI always looks populated

Each email row shows:
- Recipient name (derived from email address)
- Status badge: orange pill with clock and timestamp (scheduled view) or colored badge (sent/failed/rescheduled)
- Subject line
- Body preview (plain text, truncated)
- Star button (toggles filled/unfilled amber, stops row click propagation)
- Click anywhere on the row to expand an inline detail view showing the full body, all metadata (from/to/scheduled time/sent time/attempt count), and any error message

#### /compose

Full-page compose screen:

- Back arrow returns to dashboard
- Paperclip button opens a file attachment dialog; attached files appear as removable chips below the editor; badge shows count
- Clock button opens the Schedule modal directly
- Send Later button validates subject and recipients before opening the Schedule modal
- "To" field: email chip input. Type an address and press Enter, comma, or space to add it as a chip. Backspace removes the last chip. If more than 3 chips, a "+N" button appears that expands all chips inline ("Show less" collapses them).
- Upload List button: accepts .csv or .txt files. Extracts all valid email addresses from the file using regex and adds them as chips.
- Subject input
- Delay Between 2 Emails (seconds) and Hourly Limit numeric inputs
- Rich text editor with formatting toolbar: bold, italic, underline, strikethrough, ordered list, unordered list, blockquote, align left/center/right, link insertion, undo, redo
- Schedule modal: datetime-local picker with a minimum of 1 minute from now; Cancel and Schedule buttons

### Authentication

NextAuth is configured with the Google OAuth provider. The `proxy.ts` file (Next.js 16 naming convention for middleware) protects `/dashboard` and `/compose` routes. Unauthenticated requests are redirected to `/auth/signin`.

The session contains the user's name, email, and avatar image from their Google account. The email is used as the default sender address when creating a campaign.

---

## Data Model

```prisma
model Campaign {
  id            String   @id @default(cuid())
  sender        String
  scheduledTime DateTime
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  emails        Email[]
}

model Email {
  id            String      @id @default(cuid())
  campaignId    String
  campaign      Campaign    @relation(fields: [campaignId], references: [id])
  emailAddress  String
  subject       String
  body          String      @db.Text
  scheduledTime DateTime
  status        EmailStatus @default(pending)
  sender        String
  bullmqJobId   String?
  attemptCount  Int         @default(0)
  lastError     String?     @db.Text
  sentAt        DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

enum EmailStatus {
  pending
  scheduled
  sending
  sent
  failed
  rescheduled
}
```

Indexes:
- `Email.campaignId` (foreign key, indexed)
- `Email.status` (for reconciliation and API filtering)
- `Email.scheduledTime` (for reconciliation ordering)

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/scheduler"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""

# Ethereal Email Setup (Fake SMTP)
# Ethereal is a fake SMTP service used to safely test email delivery without spamming real inboxes.
# Leave ETHEREAL_USER and ETHEREAL_PASS blank in your .env file. 
# When the worker boots and attempts to send its first email, it will automatically generate a fresh, guaranteed-valid Ethereal test account and print the login credentials to the server logs.
ETHEREAL_USER=""
ETHEREAL_PASS=""

# Worker settings
MAX_RETRIES="3"
MIN_DELAY_BETWEEN_SENDS_MS="1000"

# API rate limiting
API_RATE_LIMIT_WINDOW_MS="900000"
API_RATE_LIMIT_MAX="100"

# Server
PORT="3001"
NODE_ENV="development"
```

### Frontend (`frontend/.env.local`)

```env
# NextAuth
NEXTAUTH_SECRET="replace-with-a-strong-random-string"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Backend API base URL
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## Running with Docker

The entire application is fully containerized for seamless deployment. This is the **recommended** way to run the app.

**1. Build and Start all containers**
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
**2. Access the Frontend** -> [http://localhost:3000](http://localhost:3000)

**3. Access the Backend** -> [http://localhost:3001](http://localhost:3001)

**4. View Live Logs (Rate limits & Ethereal credentials)**
```bash
docker compose -f docker-compose.prod.yml logs -f backend-worker
```

---

## Local Development (Manual Setup)

### Prerequisites

- Node.js 20+
- Docker Desktop (for PostgreSQL and Redis)
- A Google Cloud project with OAuth 2.0 credentials

### Step 1: Clone and install

```bash
git clone <repo-url>
cd Scheduler

cd backend
npm install

cd ../frontend
npm install
```

### Step 2: Start infrastructure

```bash
# From project root
docker-compose up -d
```

This starts PostgreSQL on port 5432 and Redis on port 6379.

### Step 3: Set up the backend environment

Create `backend/.env` using the template above. Then run Prisma migrations:

```bash
cd backend
npx prisma migrate dev --name init
```

### Step 4: Set up Google OAuth

1. Go to https://console.cloud.google.com
2. Create a project (or select an existing one)
3. Navigate to APIs and Services > OAuth consent screen
4. Set User Type to External and fill in App name, support email, and developer contact
5. Navigate to APIs and Services > Credentials > Create Credentials > OAuth 2.0 Client ID
6. Application type: Web application
7. Under Authorized redirect URIs, add: `http://localhost:3000/api/auth/callback/google`
8. Copy the Client ID and Client Secret into `frontend/.env.local`

### Step 5: Set up the frontend environment

Create `frontend/.env.local` using the template above. Set `NEXTAUTH_SECRET` to any random string (e.g., output of `openssl rand -hex 32`).

### Step 6: Start the backend API

```bash
cd backend
npm run dev
```

The API listens on http://localhost:3001.

### Step 7: Start the worker

In a separate terminal:

```bash
cd backend
npm run worker
```

The worker connects to the same Redis instance and begins processing jobs.

### Step 8: Start the frontend

In a separate terminal:

```bash
cd frontend
npm run dev
```

The frontend listens on http://localhost:3000. If port 3000 is in use, Next.js will automatically use the next available port (3003, etc.) and print it to the console. If you change the port, update `NEXTAUTH_URL` and the Google Console redirect URI accordingly.

### Step 9: Create a test campaign

With all services running, use curl or any REST client:

```bash
curl -X POST http://localhost:3001/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "test@example.com",
    "recipients": ["alice@example.com"],
    "subject": "Test scheduled email",
    "body": "<p>This is a test.</p>",
    "scheduledTime": "2026-08-01T09:00:00.000Z",
    "delayBetweenSendsMs": 0,
    "hourlyLimit": 100
  }'
```

Check the dashboard at http://localhost:3000/dashboard to see the email appear in the Scheduled tab.

---

## Production Checklist

- [ ] Set `NODE_ENV=production` in both backend and frontend environments
- [ ] Use a production PostgreSQL instance with SSL enabled; update `DATABASE_URL` with `?sslmode=require`
- [ ] Use a managed Redis service (e.g., Upstash, Redis Cloud) with a password; set `REDIS_PASSWORD`
- [ ] Set `NEXTAUTH_URL` to the publicly accessible frontend URL (e.g., `https://app.yourdomain.com`)
- [ ] Rotate `NEXTAUTH_SECRET` to a securely generated value (at least 32 random bytes)
- [ ] Add the production callback URL to the Google Cloud Console OAuth 2.0 authorized redirect URIs: `https://app.yourdomain.com/api/auth/callback/google`
- [ ] Configure SMTP credentials for a production mail provider (e.g., SendGrid, Postmark, AWS SES) and set `SMTP_SECURE=true` with port 465 or use STARTTLS on port 587
- [ ] Run `npx prisma migrate deploy` (not `migrate dev`) in the production environment
- [ ] Run the worker as a separate persistent process (systemd unit, Kubernetes Deployment, or PM2)
- [ ] Expose only port 3001 to the frontend; do not expose it publicly unless behind an API gateway
- [ ] Set `API_RATE_LIMIT_MAX` and `API_RATE_LIMIT_WINDOW_MS` to values appropriate for your expected traffic
- [ ] Monitor the BullMQ queue with a dashboard such as Bull Board or Arena

# 🎓 Trosc Backend

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb&logoColor=white" alt="MongoDB">
  <img src="https://img.shields.io/badge/Swagger-3.0-orange?logo=swagger&logoColor=white" alt="Swagger">
  <img src="https://img.shields.io/badge/JWT-Auth-000000?logo=jsonwebtokens&logoColor=white" alt="JWT">
  <img src="https://img.shields.io/badge/Tests-Jest%20%2B%20Supertest-C21325?logo=jest&logoColor=white" alt="Tests">
  <img src="https://img.shields.io/badge/License-ISC-blue.svg" alt="License">
</p>
<p align="center">
  <img src="https://github.com/basem3sam/trosc-backend/actions/workflows/test.yml/badge.svg" alt="Test Status">
</p>

<p align="center">
  <b>Backend API for Trosc</b> — the student club at <em>Faculty of Computers and Informatics, Suez Canal University</em>.<br>
  Built to be <strong>cheap, fast, and maintainable</strong>. Media lives on YouTube & Google Drive, not your server.
</p>

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [System Design](#-system-design)
- [Database Overview](#-database-overview)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Authentication Flow](#-authentication-flow)
- [Key Architectural Decisions](#-key-architectural-decisions)
- [Security](#-security)
- [Cost Strategy](#-cost-strategy)
- [Scripts & Utilities](#-scripts--utilities)
- [Deployment Guide](#-deployment-guide)
- [Testing](#-testing)
- [Roadmap](#-roadmap)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

| Feature                   | Description                                                                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🔐 **Authentication**     | JWT (bearer + httpOnly cookie), role-based access control (`student` / `instructor` / `admin`)                                                                                                                     |
| 📚 **Learning Tracks**    | Structured curricula grouping courses and sessions                                                                                                                                                                 |
| 🎬 **Courses & Sessions** | YouTube / Google Drive integration — zero storage cost                                                                                                                                                             |
| 📅 **Events**             | Online/offline events with RSVP and attendance tracking                                                                                                                                                            |
| 📌 **Announcements**      | Pinned posts with audience targeting (`all` / `track` / `course`)                                                                                                                                                  |
| 📊 **Dashboard Feed**     | Aggregated pinned announcements + upcoming events                                                                                                                                                                  |
| 🛡️ **Ownership Model**    | Instructors edit only their own content; admins bypass restrictions                                                                                                                                                |
| ⚡ **Bulk Actions**       | Admin tools for mass user activation, deactivation, or deletion                                                                                                                                                    |
| 🔍 **Full-Text Search**   | MongoDB text indexes on tracks, courses, and sessions                                                                                                                                                              |
| 📈 **Track Analytics**    | Enrollment rates, student counts, and engagement metrics                                                                                                                                                           |
| ✉️ **Contact Form**       | Public contact submission, stored + emailed to admin; admins can list, view, and triage submissions (`new` / `read` / `archived`)                                                                                  |
| ⭐ **Reviews**            | Enrolled students rate & review tracks, courses, and sessions (1–5 stars, one per student per resource); review's own author or an admin can delete it                                                             |
| 📝 **Assignments**        | Full CRUD (owner instructor / admin) at the course and standalone-session level, plus track-aggregated listing; student submission/resubmission with a computed `late` flag, and instructor/admin grading          |
| 📅 **Weekly Tasks**       | Per-course weekly task buckets with typed items (reading/quiz/video) and per-student completion tracking                                                                                                           |
| 🧾 **Activity Logs**      | Server-written audit trail (signup, login, enrollment, profile changes, admin bulk actions, …); self-service "my activity" timeline plus admin listing, per-user lookup, aggregated summary, and retention pruning |
| 📈 **Dashboard Stats**    | Admin-only analytics: live platform stats computed on demand, plus persisted daily/weekly/monthly snapshots for trend charts (upsertable, cron-friendly, retention pruning)                                        |

---

## 🧰 Tech Stack

| Layer          | Technology                                      | Version  |
| -------------- | ----------------------------------------------- | -------- |
| **Runtime**    | Node.js                                         | ≥ 18 LTS |
| **Framework**  | Express.js                                      | 4.x      |
| **Database**   | MongoDB (Mongoose ODM)                          | 7.x+     |
| **Auth**       | JWT (jsonwebtoken) + bcrypt                     | —        |
| **Validation** | Joi                                             | 17.x     |
| **Security**   | Helmet, express-rate-limit, mongo-sanitize, hpp | —        |
| **Email**      | Nodemailer + html-to-text                       | —        |
| **Docs**       | Swagger (swagger-jsdoc + swagger-ui-express)    | 3.0      |
| **Logging**    | Winston + DailyRotateFile                       | —        |
| **Testing**    | Jest + Supertest + mongodb-memory-server        | —        |
| **Tooling**    | ESLint (airbnb-base) + Prettier                 | —        |

> **Design Principle:** No file uploads. All media (images, videos, PDFs) are referenced via URLs from trusted hosts (YouTube, Google Drive, Cloudinary, Imgur, GitHub, Dropbox). This keeps hosting 100% free.

---

## 📁 Architecture

```
src/
├── app.js                 # Express app setup, global middleware, route mounting
├── server.js              # Entry point: env validation, DB connection, error handlers
│
├── controllers/           # Thin request/response handlers (delegate to services)
│   ├── auth.controller.js
│   ├── user.controller.js
│   ├── track.controller.js
│   ├── course.controller.js
│   ├── session.controller.js
│   ├── event.controller.js
│   ├── announcement.controller.js
│   ├── review.controller.js
│   ├── assignment.controller.js
│   ├── assignmentSubmission.controller.js
│   ├── weeklyTask.controller.js
│   ├── contact.controller.js
│   ├── feed.controller.js
│   ├── activityLog.controller.js
│   ├── dashboardStats.controller.js
│   └── error.controller.js      # Global error handler (dev vs prod responses, Mongo/JWT error mapping)
│
├── services/              # Business logic & database operations
│   ├── auth.service.js
│   ├── user.service.js
│   ├── track.service.js
│   ├── course.service.js
│   ├── session.service.js
│   ├── event.service.js
│   ├── announcement.service.js
│   ├── review.service.js
│   ├── assignment.service.js
│   ├── assignmentSubmission.service.js
│   ├── weeklyTask.service.js
│   ├── contact.service.js
│   ├── enrollment.service.js    # Enrollment rules & prerequisites
│   ├── cascade.service.js       # Keeps User enrollments in sync across collections (with MongoDB transactions)
│   ├── activityLog.service.js   # Audit-trail writes (internal only, no public POST) + reads/summary/prune
│   └── dashboardStats.service.js # Period-boundary math, live/snapshot stat computation, trends, prune
│
├── models/                # Mongoose schemas + Swagger component definitions
│   ├── user.model.js
│   ├── track.model.js
│   ├── course.model.js
│   ├── session.model.js
│   ├── event.model.js
│   ├── announcement.model.js
│   ├── review.model.js
│   ├── assignment.model.js
│   ├── weeklytask.model.js
│   ├── contact.model.js
│   ├── activitylog.model.js     # Audit-log entries; user+createdAt/action+createdAt/targetModel+targetId indexes
│   └── dashboardstats.model.js  # Point-in-time stat snapshots; unique (period, date) compound index
│
├── routes/                # Route definitions + Swagger JSDoc annotations
│   ├── user.route.js
│   ├── track.route.js
│   ├── course.route.js
│   ├── session.route.js
│   ├── event.route.js
│   ├── announcement.route.js
│   ├── review.route.js              # generic factory, mounted per resource type
│   ├── resourceAssignment.route.js  # generic factory, mounted per resource type
│   ├── assignment.route.js          # track-level aggregated assignment listing
│   ├── assignmentSubmission.route.js
│   ├── weeklyTask.route.js
│   ├── weeklyTaskProgress.route.js  # top-level /v1/weekly-tasks mount (per-item completion toggling)
│   ├── trackWeeklyTask.route.js     # track-level aggregated weekly-task listing
│   ├── contact.route.js
│   ├── feed.route.js
│   ├── activityLog.route.js
│   └── dashboardStats.route.js
│
├── validations/           # Joi schemas for request body/params/query
│   ├── user.validation.js
│   ├── track.validation.js
│   ├── course.validation.js
│   ├── session.validation.js
│   ├── event.validation.js
│   ├── announcement.validation.js
│   ├── review.validation.js
│   ├── assignment.validation.js
│   ├── assignmentSubmission.validation.js
│   ├── weeklyTask.validation.js
│   ├── contact.validation.js
│   ├── activityLog.validation.js
│   └── dashboardStats.validation.js
│
├── middlewares/           # Reusable Express middleware
│   ├── auth.middleware.js       # protect, restrictTo, checkOwnership
│   ├── ownership.middleware.js
│   ├── rateLimit.middleware.js  # authLimiter — applied to login/signup/reset + enrollment/RSVP/contact endpoints
│   ├── validate.middleware.js
│   └── selfApproval.js
│
├── utils/                 # Reusable utilities
│   ├── APIFeatures.js         # Filter, sort, paginate, search
│   ├── AppError.js            # Operational error class
│   ├── catchAsync.js          # Async handler wrapper
│   ├── Email.js               # HTML email templates with plaintext fallback
│   ├── escapeHtml.js          # Escapes user input before interpolating into HTML email bodies
│   ├── generateToken.js
│   ├── logger.js              # Winston configuration with log rotation
│   ├── trustedHosts.js        # single source of truth for the attachment/resource host allowlist (the data)
│   ├── isTrustedHost.js       # single source of truth for matching a URL's host against that allowlist (the logic)
│   ├── validateAttachments.js
│   ├── attachmentValidation.js
│   └── photoValidation.js
│
└── config/                # Configuration & bootstrapping
    ├── db.config.js
    ├── env.config.js
    ├── mailer.config.js
    └── swagger.config.js

scripts/                   # One-off / cron-triggered CLI utilities (outside src/)
├── createAdmin.js
└── generateDashboardSnapshot.js
```

### Design Patterns Used

- **Service Layer**: Controllers are thin; all business logic lives in services.
- **Cascade Service**: Centralized synchronization of `User.enrolledTracks`, `enrolledCourses`, and `enrolledSessions` to prevent data drift — now with **MongoDB transactions** for atomicity.
- **Ownership Middleware**: Generic, reusable authorization factory that checks `instructor`, `createdBy`, or `user` fields before allowing mutations — used consistently across tracks, courses, sessions, announcements, events, weekly tasks, assignments, and reviews.
- **Resource-Type Factories**: `review.route.js` and `resourceAssignment.route.js` each export a single factory function mounted three times (`track` / `course` / `session`), so create/list/delete logic for reviews and assignments is written once and shared, not duplicated per resource type.
- **Factory Functions**: `catchAsync`, `checkOwnership`, and `APIFeatures` reduce boilerplate.
- **Internal-Only Write Path for Audit Data**: `activityLog.service.js`'s `logActivity()` is called from other services as a side effect (signup, login, enrollment, profile updates, admin bulk actions) — there is deliberately no public `POST /v1/activity-logs` endpoint, so a client can never forge its own audit history. It also never throws: a failed audit write is logged and swallowed rather than failing the request that triggered it.
- **Snapshot-Based Analytics**: `dashboardStats.service.js` separates "compute" from "persist" — the same `computeStats()` aggregation powers both the live, never-saved `GET /dashboard-stats/live` endpoint and the persisted, upsertable `generateSnapshot()` used for daily/weekly/monthly trend data.

---

## 🏗️ System Design

<details>
<summary>📐 Data Flow Diagram (Level 1) (click to expand)</summary>
<br>

```mermaid
flowchart TD
    subgraph ext [External Entities]
        direction LR
        Student([Student / User])
        Instructor([Instructor])
        Admin([Admin])
    end

    subgraph auth [Authentication]
        P1[1.0 Authenticate User]
    end

    subgraph content [Content Management]
        direction TB
        P2[2.0 Manage Tracks, Courses, Sessions]
        P3[3.0 Manage Events]
        P4[4.0 Manage Announcements]
    end

    subgraph enroll [Enrollment & Approval]
        P5[5.0 Process Enrollment & RSVP]
    end

    subgraph feed [Dashboard & Discovery]
        P6[6.0 Build Dashboard Feed]
    end

    subgraph stores [Data Stores]
        direction TB
        DS1[(User Store)]
        DS2[(Content Store<br/>Tracks, Courses, Sessions)]
        DS3[(Event Store)]
        DS4[(Announcement Store)]
    end

    %% Authentication flows
    Student -->|signup / login credentials| P1
    Instructor -->|login credentials| P1
    Admin -->|login credentials| P1
    P1 -->|JWT token + user profile| Student
    P1 -->|JWT token + user profile| Instructor
    P1 -->|JWT token + user profile| Admin
    P1 <-->|read / write user record, lastLogin| DS1

    %% Content CRUD (Instructor + Admin)
    Instructor -->|create / update / delete content| P2
    Admin -->|create / update / delete / bulk| P2
    P2 <-->|read / write tracks, courses, sessions| DS2
    P2 <-->|read / write instructor ref| DS1

    Instructor -->|create / update event| P3
    Admin -->|create / update event| P3
    Student -->|RSVP / cancel RSVP| P3
    P3 <-->|read / write events| DS3
    P3 <-->|read creator ref| DS1

    Instructor -->|create / update announcement| P4
    Admin -->|create / update announcement| P4
    P4 <-->|read / write announcements| DS4
    P4 <-->|read creator ref| DS1

    %% Enrollment & Approval
    Student -->|self-enroll / request leave| P5
    Instructor -->|manual add / approve / reject| P5
    Admin -->|manual add / bulk manage| P5
    P5 -->|update enrolledTracks / Courses / Sessions| DS1
    P5 -->|update students / pending / pendingLeaves| DS2

    %% Public browsing & Feed
    Student -->|browse / view / search| P2
    P2 -->|public content + instructor info| Student
    Student -->|request dashboard| P6
    P6 -->|pinned + upcoming + creator info| Student
    DS1 -->|user / creator data| P6
    DS3 -->|upcoming events| P6
    DS4 -->|pinned announcements| P6
```

</details>

<details>
<summary>📊 Entity Relationship Diagram (click to expand)</summary>
<br>

> Rendered from [`design/trosc-ERD.mmd`](./design/trosc-ERD.mmd) — open that file directly (or paste it into [mermaid.live](https://mermaid.live)) for the full entity/field breakdown; it's long enough that inlining it here would hurt readability.

</details>

> 📂 Source files: [`design/trosc-DFD-level1.mmd`](./design/trosc-DFD-level1.mmd) · [`design/trosc-ERD.mmd`](./design/trosc-ERD.mmd)
>
> ⚠️ **Note:** both diagrams predate the reviews, assignments, weekly-tasks, and contact-form features and only model the original auth/content/events/announcements/feed slice of the API. They're useful for the high-level shape of the system but shouldn't be treated as exhaustive — see the [Database Overview](#-database-overview) table below for the current, complete collection list.

---

## 🗄️ Database Overview

| Collection       | Purpose                               | Key Indexes                                                                              |
| ---------------- | ------------------------------------- | ---------------------------------------------------------------------------------------- |
| `users`          | Authentication, profiles, enrollments | `email` (unique), `enrolledTrack`                                                        |
| `tracks`         | Learning paths                        | `title` (text), `instructor`, `students`, `published+level`                              |
| `courses`        | Course content                        | `title` (text), `track`, `instructor`, `students`, `published+level`                     |
| `sessions`       | Video sessions                        | `tracks`, `course`, `instructor`, `published+level`                                      |
| `events`         | Club events & RSVP                    | `date` (for upcoming feed)                                                               |
| `announcements`  | Pinned posts                          | `isPinned` + `createdAt` (compound)                                                      |
| `reviews`        | Ratings & feedback                    | one partial-unique index per resource type (`track+user`, `course+user`, `session+user`) |
| `assignments`    | Course/session assignments            | `course`, `session`, `instructor`                                                        |
| `weeklytasks`    | Per-course weekly task buckets        | `course + week` (unique), `instructor`                                                   |
| `contacts`       | Contact form submissions              | none beyond `_id` — low volume, admin-triaged                                            |
| `activitylogs`   | Audit trail of user actions           | `user + createdAt`, `action + createdAt`, `targetModel + targetId`, `createdAt`          |
| `dashboardstats` | Point-in-time analytics snapshots     | `period + date` (unique — enables upsert-in-place regeneration)                          |

### Enrollment Cascade Rules

When a student joins a **track**, the system automatically enrolls them in:

- All courses within that track
- All sessions within that track
- Updates `User.enrolledTrack`, `User.enrolledCourses`, `User.enrolledSessions`

When a student **leaves** (or is removed), all of the above are reversed atomically.

Deleting a **course** or **track** also cascades to remove its assignments, reviews, and weekly tasks, so nothing is left pointing at a deleted parent.

> ✅ **Note:** MongoDB transactions are fully implemented in `cascade.service.js` for all critical enrollment sync operations, ensuring consistency even under race conditions.

---

## ⚡ Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- [MongoDB](https://www.mongodb.com/) (local or [Atlas free tier](https://www.mongodb.com/atlas))
- (Optional) [Mailtrap](https://mailtrap.io/) account for email testing

### 1. Clone & Install

```bash
git clone https://github.com/basem3sam/trosc-backend.git
cd trosc-backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

See the [Environment Variables](#-environment-variables) section for the full reference.

### 3. Run

```bash
# Development (nodemon + debug logging)
npm start

# Production
NODE_ENV=production npm start
```

The server will start on `http://localhost:5000` (or your `PORT`).

### 4. Verify

```bash
# Health check
curl http://localhost:5000/health

# Swagger UI
open http://localhost:5000/api-docs
```

---

## 🔧 Environment Variables

| Variable                    | Required | Default                           | Description                                    |
| --------------------------- | -------- | --------------------------------- | ---------------------------------------------- |
| `NODE_ENV`                  | ✅       | `development`                     | `development` or `production`                  |
| `PORT`                      | ❌       | `5000`                            | Server port                                    |
| `DATABASE_URL`              | ✅       | —                                 | MongoDB connection string                      |
| `DATABASE_PASSWORD`         | ❌       | —                                 | If using `<PASSWORD>` placeholder in URL       |
| `DATABASE_USERNAME`         | ❌       | —                                 | If using `<USERNAME>` placeholder in URL       |
| `JWT_SECRET`                | ✅       | —                                 | Min 32 characters                              |
| `JWT_EXPIRES_IN`            | ✅       | `30d`                             | Token lifetime (e.g., `90d`, `7d`)             |
| `JWT_COOKIE_EXPIRES_IN`     | ❌       | `7`                               | Cookie expiry in days                          |
| `FRONTEND_URL`              | ✅       | —                                 | For CORS and password reset links              |
| `BASE_URL`                  | ❌       | `http://localhost:5000`           | Server base URL                                |
| `RATE_LIMIT_MAX`            | ❌       | `300`                             | Max requests per window per IP                 |
| `RATE_LIMIT_WINDOW_MS`      | ❌       | `900000`                          | Rate limit window (15 min in ms)               |
| `AUTH_RATE_LIMIT_MAX`       | ❌       | `5`                               | Max auth attempts per window                   |
| `AUTH_RATE_LIMIT_WINDOW_MS` | ❌       | `900000`                          | Auth rate limit window                         |
| `MONGODB_POOL_SIZE`         | ❌       | `10`                              | Connection pool size                           |
| `EMAIL_HOST`                | ✅\*     | —                                 | SMTP host (dev: Mailtrap)                      |
| `EMAIL_PORT`                | ✅\*     | `2525`                            | SMTP port                                      |
| `EMAIL_USER`                | ✅\*     | —                                 | SMTP username                                  |
| `EMAIL_PASS`                | ✅\*     | —                                 | SMTP password                                  |
| `EMAIL_FROM`                | ❌       | `Trosc Club <noreply@trosc.club>` | Sender address                                 |
| `EMAIL_SERVICE`             | ❌       | `SendGrid`                        | Used in production instead of host/port        |
| `ADMIN_EMAIL`               | ❌       | —                                 | Inbox notified on new contact form submissions |

\* Required if sending emails (password reset, welcome). Not required for basic API operation.

### Example `.env`

```env
NODE_ENV=development
PORT=5000

DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/trosc
# Or local: mongodb://localhost:27017/trosc

JWT_SECRET=your_super_secret_key_min_32_chars_here
JWT_EXPIRES_IN=30d
JWT_COOKIE_EXPIRES_IN=7

FRONTEND_URL=http://localhost:3000
BASE_URL=http://localhost:5000

RATE_LIMIT_MAX=300
RATE_LIMIT_WINDOW_MS=900000
MONGODB_POOL_SIZE=10

EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your_mailtrap_user
EMAIL_PASS=your_mailtrap_pass
EMAIL_FROM=Trosc Club <noreply@trosc.club>

ADMIN_EMAIL=admin@trosc.club
```

---

## 📚 API Documentation

### Quick Reference

| Resource            | Base Endpoint                                               | Key Capabilities                                  |
| ------------------- | ----------------------------------------------------------- | ------------------------------------------------- |
| **Auth**            | `/v1/users`                                                 | signup, login, logout, password reset             |
| **Users**           | `/v1/users`                                                 | profiles, enrollments, bulk actions               |
| **Tracks**          | `/v1/tracks`                                                | CRUD, enrollment approval, analytics              |
| **Courses**         | `/v1/courses`                                               | CRUD, session management, prerequisites           |
| **Sessions**        | `/v1/sessions`                                              | CRUD, student gating, YouTube/Drive URLs          |
| **Events**          | `/v1/events`                                                | CRUD, RSVP, online/offline locations              |
| **Announcements**   | `/v1/announcements`                                         | Pinned posts, audience targeting                  |
| **Reviews**         | `/v1/{tracks,courses,sessions}/:id/reviews`                 | Create, list, delete (author/admin)               |
| **Assignments**     | `/v1/{courses,sessions}/:id/assignments`, `/v1/assignments` | CRUD, submissions, grading                        |
| **Weekly Tasks**    | `/v1/courses/:id/weekly-tasks`, `/v1/weekly-tasks`          | CRUD, per-item completion tracking                |
| **Feed**            | `/v1/feed`                                                  | Dashboard aggregation                             |
| **Contact**         | `/v1/contact`                                               | Public submission; admin list/view/triage         |
| **Activity Logs**   | `/v1/activity-logs`                                         | Self "my activity"; admin list/user/summary/prune |
| **Dashboard Stats** | `/v1/dashboard-stats`                                       | Admin-only: live stats, snapshots, trends, prune  |
| **Health**          | `/health`                                                   | Server & DB status                                |

📖 **Full endpoint table →** [`API.md`](./API.md)

### Interactive Docs

Run the server and open:

```
http://localhost:5000/api-docs
```

The Swagger UI includes request schemas, response formats, authentication helpers, and live "Try it out" functionality.

### Authentication

The API uses **dual-token delivery**:

1. **Authorization Header** for API clients: `Authorization: Bearer <jwt>`
2. **httpOnly Cookie** for browser clients: `jwt=<token>`

Protected endpoints require at least one of the above.

### Example Request Flow

```bash
# 1. Sign up
curl -X POST http://localhost:5000/v1/users/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Basem","email":"basem@example.com","password":"StrongPass123","passwordConfirm":"StrongPass123"}'

# 2. Log in (stores cookie + returns token)
curl -X POST http://localhost:5000/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"basem@example.com","password":"StrongPass123"}'

# 3. Access protected route
curl http://localhost:5000/v1/users/me \
  -H "Authorization: Bearer <token_from_login>"
```

### Response Envelope

All successful list responses follow this structure:

```json
{
  "status": "success",
  "results": 10,
  "total": 45,
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalPages": 5,
    "totalResults": 45,
    "hasNext": true,
    "hasPrev": false
  },
  "data": { ... }
}
```

### Error Response Structure

```json
{
  "status": "fail",
  "message": "Invalid input: title is required"
}
```

Common HTTP status codes:

- `200` – Success
- `201` – Created
- `204` – No Content (successful deletion)
- `400` – Bad Request (validation error)
- `401` – Unauthorized (missing or invalid token)
- `403` – Forbidden (insufficient permissions)
- `404` – Not Found
- `409` – Conflict (duplicate resource)
- `429` – Too Many Requests (rate limited)
- `500` – Internal Server Error

---

## 🔐 Authentication Flow

```
┌──────────┐       ┌──────────┐      ┌──────────┐       ┌──────────┐
│  Client  │─────▶│  Login   │─────▶│  Server  │─────▶│  MongoDB │
└──────────┘       └──────────┘      └──────────┘       └──────────┘
                                           │
                                           ▼
                                     ┌──────────┐
                                     │  bcrypt  │
                                     │  compare │
                                     └──────────┘
                                           │
                                           ▼
                                     ┌──────────┐
                                     │   JWT    │
                                     │  sign()  │
                                     └──────────┘
                                           │
                                           ▼
┌──────────┐       ┌──────────┐      ┌──────────┐
│  Client  │◀─────│  Cookie  │◀─────│  Server  │
│  (store) │       │  + JSON  │      │          │
└──────────┘       └──────────┘      └──────────┘
```

1. Client sends `email` + `password`.
2. Server hashes password with bcrypt (cost 12) and compares.
3. If valid, server signs a JWT with `user._id` and expiry.
4. Server sends token in JSON body **and** sets an `httpOnly`, `Secure`, `SameSite` cookie.
5. Subsequent requests send either the cookie automatically or the `Authorization: Bearer <token>` header.

---

## 🏛️ Key Architectural Decisions

### 1. No File Uploads

Instead of S3/Cloudinary storage costs, all media is referenced by URL. The system validates URLs against a single, shared whitelist of trusted hosts (`src/utils/trustedHosts.js` — YouTube, Drive, Dropbox, GitHub, Cloudinary, Imgur, Discord CDN), used consistently by both the Mongoose-level and Joi-level attachment validators. This makes the backend stateless and free to host.

### 2. Cascade Enrollment Service with Transactions

Instead of scattering enrollment logic across controllers, a dedicated `cascade.service.js` handles the many-to-many synchronization between `User` and `Track`/`Course`/`Session`. This prevents bugs where a user is in a track but not its courses. Deleting a course or track similarly cascades to clean up its assignments, reviews, and weekly tasks rather than leaving them orphaned.

**All critical cascade operations use MongoDB transactions** for atomicity, ensuring the system never ends up in an inconsistent state.

### 3. Generic Ownership Middleware

Rather than writing `if (req.user.id !== resource.instructor)` in every controller, the `checkOwnership` factory accepts a model name, owner field, and param name. This keeps authorization DRY and testable, and is applied uniformly — including to review deletion (`ownerField: 'user'`) and assignment mutation (`ownerField: 'instructor'`), not just the original track/course/session/event/announcement set.

### 4. Resource-Type Factories for Reviews & Assignments

Reviews and assignments both attach to three different parent types (track, course, session) with identical business rules (enrollment required to create, one review per student, owner-or-admin required to mutate). Rather than triplicating that logic, `review.route.js` and `resourceAssignment.route.js` each export a single factory function parameterized by resource type, mounted once per parent router.

### 5. Joi + Swagger Co-location

Validation schemas (Joi) are defined in `validations/` and referenced in route JSDoc. This ensures the API docs never drift from the actual validation rules.

---

## 🛡️ Security

| Layer                   | Implementation                                                                                                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HTTP Headers**        | Helmet (CSP, HSTS, X-Frame-Options, etc.)                                                                                                                                                                                   |
| **Rate Limiting**       | 300 req / 15 min (global); 5 req / 15 min (auth endpoints)                                                                                                                                                                  |
| **NoSQL Injection**     | `express-mongo-sanitize` strips `$` and `.` from user input                                                                                                                                                                 |
| **Parameter Pollution** | `hpp` whitelists array fields (`role`, `level`, `prerequisites`, etc.)                                                                                                                                                      |
| **CORS**                | Whitelist-based with credentials; ngrok allowed in dev                                                                                                                                                                      |
| **Passwords**           | bcrypt (cost 12), never returned in queries (`select: false`)                                                                                                                                                               |
| **JWT**                 | `httpOnly` cookie + `SameSite` strict; 30-day expiry                                                                                                                                                                        |
| **Input Validation**    | Joi on all body/params/query; custom URL validators for attachments                                                                                                                                                         |
| **Ownership**           | Instructors can only mutate their own content; review authors can only delete their own review; admins bypass both                                                                                                          |
| **Body Spoofing**       | Controllers delete `req.body.instructor`, `req.body.students`, etc. before saving                                                                                                                                           |
| **Data Exposure**       | Enrolled-student lists (name/email/photo) on public track/course detail pages are only populated for the owner, an admin, or an enrolled caller — never shown to anonymous or unrelated visitors                            |
| **Audit Trail**         | `activityLog.service.js` writes are internal-only (no public `POST` endpoint) — a client can never forge its own history; a failed audit write is logged and swallowed, never allowed to fail the request that triggered it |

---

## 💰 Cost Strategy

| Feature         | Solution                                | Cost      |
| --------------- | --------------------------------------- | --------- |
| Video hosting   | YouTube / Google Drive                  | Free      |
| Images          | External URLs (Cloudinary, Imgur, etc.) | Free      |
| Database        | MongoDB Atlas M0 (512 MB)               | Free      |
| Backend hosting | Render / Railway / Fly.io               | Free tier |
| Email           | Mailtrap (dev) / SendGrid (prod)        | Free tier |
| File storage    | None — we don't store files             | $0        |

---

## 🛠️ Scripts & Utilities

| Command                                                                         | Description                                                              |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `npm start`                                                                     | Development mode with nodemon                                            |
| `npm start:prod`                                                                | Production mode                                                          |
| `npm run swagger:export`                                                        | Generate `swagger.json` from JSDoc comments                              |
| `npm test`                                                                      | Run Jest test suite                                                      |
| `npm run test:watch`                                                            | Run tests in watch mode                                                  |
| `npm run test:coverage`                                                         | Run tests with coverage report                                           |
| `npm run lint`                                                                  | Run ESLint                                                               |
| `npm run lint:fix`                                                              | Fix ESLint issues automatically                                          |
| `node testEmail.js <email>`                                                     | Diagnose SMTP configuration and send a test email                        |
| `node scripts/createAdmin.js <email>`                                           | Promote a user to admin                                                  |
| `node scripts/generateDashboardSnapshot.js <daily\|weekly\|monthly> [ISO date]` | Generate/refresh a dashboard-stats snapshot — meant to be cron-triggered |

### Email Diagnostic Tool

```bash
node testEmail.js your-email@example.com
```

This script verifies your `.env` variables, tests the SMTP connection, and sends a styled HTML test email.

### Admin Promotion

```bash
node scripts/createAdmin.js user@example.com
```

Promotes an existing user to admin role.

### Dashboard Stats Snapshot Generation

```bash
node scripts/generateDashboardSnapshot.js daily
node scripts/generateDashboardSnapshot.js weekly
node scripts/generateDashboardSnapshot.js monthly
node scripts/generateDashboardSnapshot.js daily 2025-06-15   # backfill a specific date
```

Computes and **upserts** a `DashboardStats` snapshot for the given period (re-running for the same period/date refreshes it in place rather than duplicating). Calls the service directly — no HTTP, no auth token — so it's meant to be wired up to an OS-level cron job:

```cron
5 0 * * *    cd /path/to/app && node scripts/generateDashboardSnapshot.js daily
10 0 * * 1   cd /path/to/app && node scripts/generateDashboardSnapshot.js weekly
15 0 1 * *   cd /path/to/app && node scripts/generateDashboardSnapshot.js monthly
```

The same result is also reachable on-demand via `POST /v1/dashboard-stats/snapshot` (admin only), for a manual "refresh now" action from an admin UI.

---

## 🚀 Deployment Guide

### Render (Recommended)

1. Push code to GitHub.
2. Create a new **Web Service** on [Render](https://render.com/).
3. Connect your repo.
4. Set environment variables in the Render dashboard.
5. Use the following settings:
   - **Build Command:** `npm install`
   - **Start Command:** `NODE_ENV=production npm start`
   - **Health Check Path:** `/health`

### Railway

1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Link project: `railway link`
4. Add MongoDB plugin (or use Atlas).
5. Deploy: `railway up`

### Environment Checklist for Production

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` is strong and unique (≥ 32 chars)
- [ ] `DATABASE_URL` points to production cluster
- [ ] `FRONTEND_URL` and `BASE_URL` are set to production domains
- [ ] `EMAIL_SERVICE` is configured (SendGrid, AWS SES, etc.)
- [ ] `JWT_COOKIE_EXPIRES_IN` matches your security policy
- [ ] Rate limits are appropriate for your traffic
- [ ] Database indexes are synced (Mongoose `syncIndexes()` runs on startup)

---

## 🧪 Testing

### Manual Testing

```bash
# Health check
curl http://localhost:5000/health

# Public endpoint
curl http://localhost:5000/v1/tracks

# Swagger UI
open http://localhost:5000/api-docs
```

### Automated Testing (Jest + Supertest)

```bash
npm test              # run the full suite once
npm run test:watch    # re-run automatically as you edit
npm run test:coverage # run once + generate a coverage report (coverage/lcov-report/index.html)
```

Tests run against a real, throwaway in-memory MongoDB **replica set** (`mongodb-memory-server`'s `MongoMemoryReplSet`) — never your real dev or production database. A replica set (rather than a plain standalone instance) is required so that the MongoDB transactions in `cascade.service.js` can actually run during tests. See **[TESTING.md](./TESTING.md)** for a full walkthrough of how the setup works and how to write your next test.

```
tests/
├── globalSetup.js        # starts the in-memory MongoDB replica set once per run
├── globalTeardown.js     # stops it once per run
├── setupAfterEnv.js      # per-file: connects Mongoose, mocks Email, clears data between tests
├── __mocks__/Email.js    # no-op Email mock, applied globally via setupAfterEnv.js
├── helpers/
│   ├── testUser.js       # creates a user + valid JWT without hitting /signup
│   └── fixtures.js       # shared track/course/session fixture builders
├── config/                     # mailer.config.js unit tests
├── controllers/                # endpoints not covered by the top-level *.test.js files
│   (course/session/track/weeklyTask "missing endpoints" suites)
├── services/                   # service-layer unit tests (course/session/track/
│   enrollment/weeklyTask), incl. cascade/transaction edge cases
├── utils/                      # pure-function/class tests (Email, logger, escapeHtml,
│   attachment validation)
├── auth.test.js, passwordReset.test.js         # signup/login/logout, forgot/reset/update password
├── adminUsers.test.js, bulkUser.test.js         # admin user management
├── trackCourseCRUD.test.js, trackEndpoints.test.js  # track/course CRUD + analytics/pending/leaves
├── enrollment.test.js, cascade.test.js, sessionGating.test.js
├── announcement.test.js, events.test.js, feed.test.js
├── contact.test.js, contactAdmin.test.js
├── reviews.test.js, assignments.test.js, weeklyTask.test.js
├── updateMe.test.js
├── error.controller.test.js, errorHandling.test.js, app.test.js, APIFeatures.test.js
```

41 test files (455 tests) span auth, password recovery, every CRUD resource (tracks/courses/sessions/events/announcements), enrollment + the MongoDB transaction paths in `cascade.service.js`, reviews, assignments (incl. grading), weekly tasks, contact (public + admin), activity logs (audit-trail read/write + auth/role guards), dashboard stats (period-boundary math, snapshot generation/upsert, trends, prune), the global error handler, and `src/app.js`'s own production-vs-development configuration. See **[TESTING.md](./TESTING.md)** for the full file-by-file coverage table and the (short) list of what's still deliberately untested — mainly that email-sending is mocked everywhere rather than asserted on, and a couple of narrow model-validator edge cases.

---

## 🗺️ Roadmap

### Implemented ✅

- [x] JWT Authentication (bearer + cookie)
- [x] Role-based access control
- [x] Track / Course / Session CRUD
- [x] Enrollment with prerequisites & access rules
- [x] Events & RSVP
- [x] Announcements with pinning
- [x] Dashboard feed
- [x] Bulk user actions
- [x] Track analytics
- [x] Session enrollment lookup by student (`GET /v1/sessions/student/:studentId`, matching Track/Course)
- [x] Email service (welcome, password reset)
- [x] Swagger documentation
- [x] Public contact form (stored + admin email notification)
- [x] Contact form admin management — admins can list, view, and update a submission's status (`new` / `read` / `archived`)
- [x] Track reviews (enrolled-student ratings & feedback) — extended to also cover courses and sessions
- [x] Review deletion — the review's own author, or an admin, can remove it
- [x] Assignments — full CRUD (create/update/delete) for owner instructor or admin, at the course and standalone-session level
- [x] Assignments list — track (aggregated), course, and standalone-session level (`GET .../assignments`, each with per-user submission status)
- [x] Weekly tasks — per-course buckets of items (reading/quiz/video/etc.) with per-student completion tracking, aggregated at the track level; full CRUD (create/update/delete) plus per-item completion toggling
- [x] Assignment submissions — students submit/resubmit work (`POST /assignments/:id/submissions`), with a computed `late` flag
- [x] Assignment grading — owner instructor / admin grades a submission (`PATCH /assignments/:id/submissions/:studentId/grade`)
- [x] MongoDB Transactions for cascade enrollment operations (`cascade.service.js`)

* [x] Request Correlation IDs — full implementation with `AsyncLocalStorage`, automatic injection into every log, and `X-Request-ID` round-trip to clients

- [x] Jest + Supertest test setup — in-memory MongoDB **replica set** (enabling real transaction tests), shared fixture builders, a global Email mock, and 41 test files covering auth, password recovery, every CRUD resource, enrollment + cascade transactions, reviews, assignments, weekly tasks, contact, activity logs, dashboard stats, the global error handler, and `app.js` config (see [TESTING.md](./TESTING.md) for the full breakdown)
- [x] **Activity Logs** (`activityLog.model.js` / `activityLog.service.js`) — server-written audit trail (no public create endpoint), self-service "my activity" timeline, admin listing/per-user lookup/aggregated summary, and retention pruning
- [x] **Admin Analytics Dashboard** (`dashboardStats.model.js` / `dashboardStats.service.js`) — live on-demand stats plus persisted, upsertable daily/weekly/monthly snapshots for trend charts, a cron-friendly CLI generator (`scripts/generateDashboardSnapshot.js`), and retention pruning

### Planned 🔮

- [ ] **`logActivity` wired into the remaining domain services** — tracks, courses, sessions, events, announcements, assignments, weekly tasks, and reviews don't yet call `activityLog.service.js#logActivity`; currently only auth (signup/login/password), enrollment, and user-profile actions are logged
- [ ] **Email verification flow** — the `emailVerified` flag exists and resets on email change, but there's no self-service send/verify-token endpoint yet; currently only an admin can flip it
- [ ] **Announcement audience filtering** — `audience`/`targetTrack`/`targetCourse` are stored but not yet used to filter what `GET /v1/announcements` returns
- [ ] **Webhook Support** for external integrations (Discord, Slack)
- [ ] **Full test coverage** — still need tests

---

## 🚑 Troubleshooting

### "Cannot connect to MongoDB"

- Verify `DATABASE_URL` is correct.
- If using Atlas, whitelist your IP in Network Access.
- If using local MongoDB, ensure `mongod` is running.

### "CORS error from frontend"

- Add your frontend URL to `FRONTEND_URL`.
- In development, `http://localhost:3000` is already whitelisted.

### "Emails not sending"

- Run `node testEmail.js your@email.com` to diagnose.
- Check Mailtrap inbox (dev) or SendGrid dashboard (prod).
- Verify `EMAIL_USER` and `EMAIL_PASS` are correct.

### "Swagger UI not loading / YAML errors"

- Ensure JSDoc indentation is consistent in `src/routes/*.js`.
- Avoid `description: | text-on-same-line` — use inline strings or proper multi-line blocks.
- Run `npm start` and check the console for `swagger-jsdoc` parse errors.

### "Invalid token" after password change

- This is by design. Changing your password invalidates existing JWTs via `passwordChangedAt`.
- Simply log in again to receive a new token.

---

## 🤝 Contributing

Contributions are welcome! This is an educational project, but we follow clean code principles.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use **async/await**; avoid callbacks.
- Use **camelCase** for variables and functions.
- Use **PascalCase** for models and classes.
- Always wrap async route handlers with `catchAsync`.
- Never trust `req.body` — validate with Joi and strip sensitive fields in controllers.

---

## 👤 Author

**Basem Esam Omar**  
Backend Engineer — Node.js | MongoDB | Express.js  
[GitHub](https://github.com/basem3sam) · [LinkedIn](https://linkedin.com/in/basemesam)

---

## 📄 License

[ISC License](LICENSE) — Free for educational use.

> **Disclaimer:** This project was built for the Trosc Student Club at Suez Canal University. It is intended for educational and non-commercial use. Use at your own risk in production environments.

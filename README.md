# 🎓 Trosc Backend

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb&logoColor=white" alt="MongoDB">
  <img src="https://img.shields.io/badge/Swagger-3.0-orange?logo=swagger&logoColor=white" alt="Swagger">
  <img src="https://img.shields.io/badge/JWT-Auth-000000?logo=jsonwebtokens&logoColor=white" alt="JWT">
  <img src="https://img.shields.io/badge/License-ISC-blue.svg" alt="License">
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

| Feature                   | Description                                                                                                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔐 **Authentication**     | JWT (bearer + httpOnly cookie), role-based access control (`student` / `instructor` / `admin`)                                                                                                            |
| 📚 **Learning Tracks**    | Structured curricula grouping courses and sessions                                                                                                                                                        |
| 🎬 **Courses & Sessions** | YouTube / Google Drive integration — zero storage cost                                                                                                                                                    |
| 📅 **Events**             | Online/offline events with RSVP and attendance tracking                                                                                                                                                   |
| 📌 **Announcements**      | Pinned posts with audience targeting (`all` / `track` / `course`)                                                                                                                                         |
| 📊 **Dashboard Feed**     | Aggregated pinned announcements + upcoming events                                                                                                                                                         |
| 🛡️ **Ownership Model**    | Instructors edit only their own content; admins bypass restrictions                                                                                                                                       |
| ⚡ **Bulk Actions**       | Admin tools for mass user activation, deactivation, or deletion                                                                                                                                           |
| 🔍 **Full-Text Search**   | MongoDB text indexes on tracks, courses, and sessions                                                                                                                                                     |
| 📈 **Track Analytics**    | Enrollment rates, student counts, and engagement metrics                                                                                                                                                  |
| ✉️ **Contact Form**       | Public contact submission, stored + emailed to admin; admins can list, view, and triage submissions (`new` / `read` / `archived`)                                                                         |
| ⭐ **Reviews**            | Enrolled students rate & review tracks, courses, and sessions (1–5 stars, one per student per resource); review's own author or an admin can delete it                                                    |
| 📝 **Assignments**        | Full CRUD (owner instructor / admin) at the course and standalone-session level, plus track-aggregated listing; student submission/resubmission with a computed `late` flag, and instructor/admin grading |
| 📅 **Weekly Tasks**       | Per-course weekly task buckets with typed items (reading/quiz/video) and per-student completion tracking                                                                                                  |

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
│   └── feed.controller.js
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
│   └── cascade.service.js       # Keeps User enrollments in sync across collections (with MongoDB transactions)
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
│   ├── weeklyTask.model.js
│   └── contact.model.js
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
│   ├── assignmentSubmission.route.js
│   ├── weeklyTask.route.js
│   ├── contact.route.js
│   └── feed.route.js
│
├── validations/           # Joi schemas for request body/params/query
│   ├── user.validation.js
│   ├── track.validation.js
│   ├── course.validation.js
│   ├── session.validation.js
│   ├── event.validation.js
│   ├── review.validation.js
│   ├── assignment.validation.js
│   ├── weeklyTask.validation.js
│   └── contact.validation.js
│
├── middlewares/           # Reusable Express middleware
│   ├── auth.middleware.js       # protect, restrictTo, checkOwnership
│   ├── ownership.middleware.js
│   ├── validate.middleware.js
│   └── selfApproval.js
│
├── utils/                 # Reusable utilities
│   ├── APIFeatures.js         # Filter, sort, paginate, search
│   ├── AppError.js            # Operational error class
│   ├── catchAsync.js          # Async handler wrapper
│   ├── Email.js               # HTML email templates with plaintext fallback
│   ├── generateToken.js
│   ├── logger.js              # Winston configuration with log rotation
│   ├── trustedHosts.js        # single source of truth for the attachment/resource host allowlist
│   ├── validateAttachments.js
│   ├── attachmentValidation.js
│   └── photoValidation.js
│
└── config/                # Configuration & bootstrapping
    ├── db.config.js
    ├── env.config.js
    ├── mailer.config.js
    └── swagger.config.js
```

### Design Patterns Used

- **Service Layer**: Controllers are thin; all business logic lives in services.
- **Cascade Service**: Centralized synchronization of `User.enrolledTracks`, `enrolledCourses`, and `enrolledSessions` to prevent data drift — now with **MongoDB transactions** for atomicity.
- **Ownership Middleware**: Generic, reusable authorization factory that checks `instructor`, `createdBy`, or `user` fields before allowing mutations — used consistently across tracks, courses, sessions, announcements, events, weekly tasks, assignments, and reviews.
- **Resource-Type Factories**: `review.route.js` and `resourceAssignment.route.js` each export a single factory function mounted three times (`track` / `course` / `session`), so create/list/delete logic for reviews and assignments is written once and shared, not duplicated per resource type.
- **Factory Functions**: `catchAsync`, `checkOwnership`, and `APIFeatures` reduce boilerplate.

---

## 🏗️ System Design

<details>
<summary>📐 Data Flow Diagram (Level 1) (click to expand)</summary>
<br>

![DFD Level 1](./design/DFD.svg)

</details>

<details>
<summary>📊 Entity Relationship Diagram (click to expand)</summary>
<br>

![ERD](./design/ERD.svg)

</details>

> 📂 Source files: [`design/trosc-DFD-level1.mmd`](./design/trosc-DFD-level1.mmd) · [`design/trosc-ERD.mmd`](./design/trosc-ERD.mmd)

---

## 🗄️ Database Overview

| Collection      | Purpose                               | Key Indexes                                                                              |
| --------------- | ------------------------------------- | ---------------------------------------------------------------------------------------- |
| `users`         | Authentication, profiles, enrollments | `email` (unique), `enrolledTrack`                                                        |
| `tracks`        | Learning paths                        | `title` (text), `instructor`, `students`, `published+level`                              |
| `courses`       | Course content                        | `title` (text), `track`, `instructor`, `students`, `published+level`                     |
| `sessions`      | Video sessions                        | `tracks`, `course`, `instructor`, `published+level`                                      |
| `events`        | Club events & RSVP                    | `date` (for upcoming feed)                                                               |
| `announcements` | Pinned posts                          | `isPinned` + `createdAt` (compound)                                                      |
| `reviews`       | Ratings & feedback                    | one partial-unique index per resource type (`track+user`, `course+user`, `session+user`) |
| `assignments`   | Course/session assignments            | `course`, `session`, `instructor`                                                        |
| `weeklytasks`   | Per-course weekly task buckets        | `course + week` (unique), `instructor`                                                   |
| `contacts`      | Contact form submissions              | none beyond `_id` — low volume, admin-triaged                                            |

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

| Resource          | Base Endpoint                                               | Key Capabilities                          |
| ----------------- | ----------------------------------------------------------- | ----------------------------------------- |
| **Auth**          | `/v1/users`                                                 | signup, login, logout, password reset     |
| **Users**         | `/v1/users`                                                 | profiles, enrollments, bulk actions       |
| **Tracks**        | `/v1/tracks`                                                | CRUD, enrollment approval, analytics      |
| **Courses**       | `/v1/courses`                                               | CRUD, session management, prerequisites   |
| **Sessions**      | `/v1/sessions`                                              | CRUD, student gating, YouTube/Drive URLs  |
| **Events**        | `/v1/events`                                                | CRUD, RSVP, online/offline locations      |
| **Announcements** | `/v1/announcements`                                         | Pinned posts, audience targeting          |
| **Reviews**       | `/v1/{tracks,courses,sessions}/:id/reviews`                 | Create, list, delete (author/admin)       |
| **Assignments**   | `/v1/{courses,sessions}/:id/assignments`, `/v1/assignments` | CRUD, submissions, grading                |
| **Weekly Tasks**  | `/v1/courses/:id/weekly-tasks`, `/v1/weekly-tasks`          | CRUD, per-item completion tracking        |
| **Feed**          | `/v1/feed`                                                  | Dashboard aggregation                     |
| **Contact**       | `/v1/contact`                                               | Public submission; admin list/view/triage |
| **Health**        | `/health`                                                   | Server & DB status                        |

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

| Layer                   | Implementation                                                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **HTTP Headers**        | Helmet (CSP, HSTS, X-Frame-Options, etc.)                                                                                                                                                        |
| **Rate Limiting**       | 300 req / 15 min (global); 5 req / 15 min (auth endpoints)                                                                                                                                       |
| **NoSQL Injection**     | `express-mongo-sanitize` strips `$` and `.` from user input                                                                                                                                      |
| **Parameter Pollution** | `hpp` whitelists array fields (`role`, `level`, `prerequisites`, etc.)                                                                                                                           |
| **CORS**                | Whitelist-based with credentials; ngrok allowed in dev                                                                                                                                           |
| **Passwords**           | bcrypt (cost 12), never returned in queries (`select: false`)                                                                                                                                    |
| **JWT**                 | `httpOnly` cookie + `SameSite` strict; 30-day expiry                                                                                                                                             |
| **Input Validation**    | Joi on all body/params/query; custom URL validators for attachments                                                                                                                              |
| **Ownership**           | Instructors can only mutate their own content; review authors can only delete their own review; admins bypass both                                                                               |
| **Body Spoofing**       | Controllers delete `req.body.instructor`, `req.body.students`, etc. before saving                                                                                                                |
| **Data Exposure**       | Enrolled-student lists (name/email/photo) on public track/course detail pages are only populated for the owner, an admin, or an enrolled caller — never shown to anonymous or unrelated visitors |

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

| Command                               | Description                                                     |
| ------------------------------------- | --------------------------------------------------------------- |
| `npm start`                           | Development mode with nodemon                                   |
| `npm start:prod`                      | Production mode                                                 |
| `npm run swagger:export`              | Generate `swagger.json` from JSDoc comments                     |
| `npm test`                            | Run Jest test suite                                             |
| `npm run test:watch`                  | Run tests in watch mode                                         |
| `npm run test:coverage`               | Run tests with coverage report                                  |
| `npm run lint`                        | Run ESLint                                                      |
| `npm run lint:fix`                    | Fix ESLint issues automatically                                 |
| `node testEmail.js <email>`           | Diagnose SMTP configuration and send a test email               |
| `node scripts/createAdmin.js <email>` | Promote a user to admin                                         |

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

Tests run against a real, throwaway in-memory MongoDB instance (`mongodb-memory-server`) — never your real dev or production database. See **[TESTING.md](./TESTING.md)** for a full walkthrough of how the setup works and how to write your next test.

```
tests/
├── globalSetup.js       # starts the in-memory MongoDB once per run
├── globalTeardown.js    # stops it once per run
├── setupAfterEnv.js     # per-file: connects Mongoose, clears data between tests
├── helpers/
│   └── testUser.js      # creates a user + valid JWT without hitting /signup
├── contact.test.js      # example: public endpoint
└── weeklyTask.test.js   # example: auth, roles, ownership, full create→complete flow
```

Coverage so far is intentionally small (two example route files) — the pattern is established, and the natural next step is writing tests for one more route file at a time. Assignment CRUD, review deletion, and the new contact admin endpoints don't have tests yet — see [TESTING.md](./TESTING.md) for suggested next tests.

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
+ [x] Request Correlation IDs — full implementation with `AsyncLocalStorage`, automatic injection into every log, and `X-Request-ID` round-trip to clients
- [x] Jest + Supertest test setup — in-memory MongoDB, test-user helper, two example route test files (see TESTING.md; growing coverage is ongoing)

### Planned 🔮

- [ ] **Activity Logs** (`activityLog.model.js`) — audit trail for user actions
- [ ] **Admin Analytics Dashboard** (`dashboardStats.model.js`)
- [ ] **Email verification flow** — the `emailVerified` flag exists and resets on email change, but there's no self-service send/verify-token endpoint yet; currently only an admin can flip it
- [ ] **Announcement audience filtering** — `audience`/`targetTrack`/`targetCourse` are stored but not yet used to filter what `GET /v1/announcements` returns
- [ ] **Webhook Support** for external integrations (Discord, Slack)
- [ ] **Full test coverage** — expand beyond the two example route files

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

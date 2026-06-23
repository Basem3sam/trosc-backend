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

| Feature                   | Description                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| 🔐 **Authentication**     | JWT (bearer + httpOnly cookie), role-based access control (`student` / `instructor` / `admin`) |
| 📚 **Learning Tracks**    | Structured curricula grouping courses and sessions                                             |
| 🎬 **Courses & Sessions** | YouTube / Google Drive integration — zero storage cost                                         |
| 📅 **Events**             | Online/offline events with RSVP and attendance tracking                                        |
| 📌 **Announcements**      | Pinned posts with audience targeting (`all` / `track` / `course`)                              |
| 📊 **Dashboard Feed**     | Aggregated pinned announcements + upcoming events                                              |
| 🛡️ **Ownership Model**    | Instructors edit only their own content; admins bypass restrictions                            |
| ⚡ **Bulk Actions**       | Admin tools for mass user activation, deactivation, or deletion                                |
| 🔍 **Full-Text Search**   | MongoDB text indexes on tracks, courses, and sessions                                          |
| 📈 **Track Analytics**    | Enrollment rates, student counts, and engagement metrics                                       |

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
| **Logging**    | Winston                                         | —        |

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
│   ├── enrollment.service.js    # Enrollment rules & prerequisites
│   └── cascade.service.js       # Keeps User enrollments in sync across collections
│
├── models/                # Mongoose schemas + Swagger component definitions
│   ├── user.model.js
│   ├── track.model.js
│   ├── course.model.js
│   ├── session.model.js
│   ├── event.model.js
│   └── announcement.model.js
│
├── routes/                # Route definitions + Swagger JSDoc annotations
│   ├── user.route.js
│   ├── track.route.js
│   ├── course.route.js
│   ├── session.route.js
│   ├── event.route.js
│   ├── announcement.route.js
│   └── feed.route.js
│
├── validations/           # Joi schemas for request body/params/query
│   ├── user.validation.js
│   ├── track.validation.js
│   ├── course.validation.js
│   ├── session.validation.js
│   └── event.validation.js
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
│   ├── logger.js              # Winston configuration
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
- **Cascade Service**: Centralized synchronization of `User.enrolledTracks`, `enrolledCourses`, and `enrolledSessions` to prevent data drift.
- **Ownership Middleware**: Generic, reusable authorization factory that checks `instructor` or `createdBy` fields before allowing mutations.
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

| Collection      | Purpose                               | Key Indexes                                                          |
| --------------- | ------------------------------------- | -------------------------------------------------------------------- |
| `users`         | Authentication, profiles, enrollments | `email` (unique), `enrolledTrack`                                    |
| `tracks`        | Learning paths                        | `title` (text), `instructor`, `students`, `published+level`          |
| `courses`       | Course content                        | `title` (text), `track`, `instructor`, `students`, `published+level` |
| `sessions`      | Video sessions                        | `tracks`, `course`, `instructor`, `published+level`                  |
| `events`        | Club events & RSVP                    | `date` (for upcoming feed)                                           |
| `announcements` | Pinned posts                          | `isPinned` + `createdAt` (compound)                                  |

### Enrollment Cascade Rules

When a student joins a **track**, the system automatically enrolls them in:

- All courses within that track
- All sessions within that track
- Updates `User.enrolledTrack`, `User.enrolledCourses`, `User.enrolledSessions`

When a student **leaves** (or is removed), all of the above are reversed atomically.

> ⚠️ **Note:** MongoDB transactions are recommended for production deployments to ensure cascade operations remain consistent under race conditions.

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

| Variable                    | Required | Default                           | Description                              |
| --------------------------- | -------- | --------------------------------- | ---------------------------------------- |
| `NODE_ENV`                  | ✅       | `development`                     | `development` or `production`            |
| `PORT`                      | ❌       | `5000`                            | Server port                              |
| `DATABASE_URL`              | ✅       | —                                 | MongoDB connection string                |
| `DATABASE_PASSWORD`         | ❌       | —                                 | If using `<PASSWORD>` placeholder in URL |
| `DATABASE_USERNAME`         | ❌       | —                                 | If using `<USERNAME>` placeholder in URL |
| `JWT_SECRET`                | ✅       | —                                 | Min 32 characters                        |
| `JWT_EXPIRES_IN`            | ✅       | `30d`                             | Token lifetime (e.g., `90d`, `7d`)       |
| `JWT_COOKIE_EXPIRES_IN`     | ❌       | `7`                               | Cookie expiry in days                    |
| `FRONTEND_URL`              | ✅       | —                                 | For CORS and password reset links        |
| `BASE_URL`                  | ❌       | `http://localhost:5000`           | Server base URL                          |
| `RATE_LIMIT_MAX`            | ❌       | `300`                             | Max requests per window per IP           |
| `RATE_LIMIT_WINDOW_MS`      | ❌       | `900000`                          | Rate limit window (15 min in ms)         |
| `AUTH_RATE_LIMIT_MAX`       | ❌       | `5`                               | Max auth attempts per window             |
| `AUTH_RATE_LIMIT_WINDOW_MS` | ❌       | `900000`                          | Auth rate limit window                   |
| `EMAIL_HOST`                | ✅\*     | —                                 | SMTP host (dev: Mailtrap)                |
| `EMAIL_PORT`                | ✅\*     | `2525`                            | SMTP port                                |
| `EMAIL_USER`                | ✅\*     | —                                 | SMTP username                            |
| `EMAIL_PASS`                | ✅\*     | —                                 | SMTP password                            |
| `EMAIL_FROM`                | ❌       | `Trosc Club <noreply@trosc.club>` | Sender address                           |
| `EMAIL_SERVICE`             | ❌       | `SendGrid`                        | Used in production instead of host/port  |

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

EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your_mailtrap_user
EMAIL_PASS=your_mailtrap_pass
EMAIL_FROM=Trosc Club <noreply@trosc.club>
```

---

## 📚 API Documentation

### Quick Reference

| Resource          | Base Endpoint       | Key Capabilities                         |
| ----------------- | ------------------- | ---------------------------------------- |
| **Auth**          | `/v1/users`         | signup, login, logout, password reset    |
| **Users**         | `/v1/users`         | profiles, enrollments, bulk actions      |
| **Tracks**        | `/v1/tracks`        | CRUD, enrollment approval, analytics     |
| **Courses**       | `/v1/courses`       | CRUD, session management, prerequisites  |
| **Sessions**      | `/v1/sessions`      | CRUD, student gating, YouTube/Drive URLs |
| **Events**        | `/v1/events`        | CRUD, RSVP, online/offline locations     |
| **Announcements** | `/v1/announcements` | Pinned posts, audience targeting         |
| **Feed**          | `/v1/feed`          | Dashboard aggregation                    |
| **Health**        | `/health`           | Server & DB status                       |

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

Instead of S3/Cloudinary storage costs, all media is referenced by URL. The system validates URLs against a whitelist of trusted hosts (YouTube, Drive, Dropbox, GitHub, Cloudinary, Imgur, Discord CDN). This makes the backend stateless and free to host.

### 2. Cascade Enrollment Service

Instead of scattering enrollment logic across controllers, a dedicated `cascade.service.js` handles the many-to-many synchronization between `User` and `Track`/`Course`/`Session`. This prevents bugs where a user is in a track but not its courses.

### 3. Generic Ownership Middleware

Rather than writing `if (req.user.id !== resource.instructor)` in every controller, the `checkOwnership` factory accepts a model name, owner field, and param name. This keeps authorization DRY and testable.

### 4. Joi + Swagger Co-location

Validation schemas (Joi) are defined in `validations/` and referenced in route JSDoc. This ensures the API docs never drift from the actual validation rules.

---

## 🛡️ Security

| Layer                   | Implementation                                                                    |
| ----------------------- | --------------------------------------------------------------------------------- |
| **HTTP Headers**        | Helmet (CSP, HSTS, X-Frame-Options, etc.)                                         |
| **Rate Limiting**       | 300 req / 15 min (global); 5 req / 15 min (auth endpoints)                        |
| **NoSQL Injection**     | `express-mongo-sanitize` strips `$` and `.` from user input                       |
| **Parameter Pollution** | `hpp` whitelists array fields (`role`, `level`, `prerequisites`, etc.)            |
| **CORS**                | Whitelist-based with credentials; ngrok allowed in dev                            |
| **Passwords**           | bcrypt (cost 12), never returned in queries (`select: false`)                     |
| **JWT**                 | `httpOnly` cookie + `SameSite` strict; 30-day expiry                              |
| **Input Validation**    | Joi on all body/params/query; custom URL validators for attachments               |
| **Ownership**           | Instructors can only mutate their own content; admins bypass                      |
| **Body Spoofing**       | Controllers delete `req.body.instructor`, `req.body.students`, etc. before saving |

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

| Command                     | Description                                       |
| --------------------------- | ------------------------------------------------- |
| `npm start`                 | Development mode with nodemon                     |
| `npm start:prod`            | Production mode                                   |
| `node testEmail.js <email>` | Diagnose SMTP configuration and send a test email |

### Email Diagnostic Tool

```bash
node testEmail.js your-email@example.com
```

This script verifies your `.env` variables, tests the SMTP connection, and sends a styled HTML test email.

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

### Recommended Test Stack (Not Yet Implemented)

For a production-grade test suite, consider adding:

| Type        | Tool                  | Purpose                    |
| ----------- | --------------------- | -------------------------- |
| Unit        | Jest                  | Service logic, utilities   |
| Integration | Jest + Supertest      | HTTP endpoints, auth flows |
| DB          | mongodb-memory-server | Isolated in-memory MongoDB |
| Coverage    | Jest `--coverage`     | Track test coverage        |

### Example Test Structure (Future)

```
tests/
├── unit/
│   ├── services/
│   └── utils/
├── integration/
│   ├── auth.test.js
│   ├── track.test.js
│   └── course.test.js
└── fixtures/
    └── users.js
```

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
- [x] Email service (welcome, password reset)
- [x] Swagger documentation

### Planned 🔮

- [ ] **MongoDB Transactions** for cascade enrollment operations
- [ ] **Activity Logs** (`activityLog.model.js`) — audit trail for user actions
- [ ] **Assignments** (`assignment.model.js`) — deadlines, submissions, grading
- [ ] **Reviews** (`review.model.js`) — course ratings & feedback
- [ ] **Admin Analytics Dashboard** (`dashboardStats.model.js`)
- [ ] **Jest + Supertest** integration test suite
- [ ] **Request Correlation IDs** for distributed tracing
- [ ] **Webhook Support** for external integrations (Discord, Slack)

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

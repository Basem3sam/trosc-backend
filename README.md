# 🎓 Trosc Backend

> Backend API for **Trosc**, the student club at **Faculty of Computers and Informatics, Suez Canal University**.  
> Built to be cheap, fast, and maintainable — media lives on YouTube/Google Drive, not your server.

---

## 🚀 What It Does

- **Authentication** — JWT + secure httpOnly cookies, role-based access (student / instructor / admin)
- **Learning Tracks** — Organize courses and sessions into structured tracks
- **Courses & Sessions** — Link to YouTube videos and Google Drive files (zero storage cost)
- **Events** — Schedule online/offline events with RSVP
- **Announcements** — Pinned posts with audience targeting
- **Dashboard Feed** — Pinned announcements + upcoming events
- **Admin Tools** — Bulk user actions, analytics, full CRUD

---

## 🧰 Tech Stack

| Layer      | Tech                                            |
| ---------- | ----------------------------------------------- |
| Runtime    | Node.js + Express.js                            |
| Database   | MongoDB (Mongoose ODM)                          |
| Auth       | JWT (bearer + cookie), bcrypt                   |
| Validation | Joi                                             |
| Security   | Helmet, express-rate-limit, mongo-sanitize, hpp |
| Email      | Nodemailer (SMTP / Mailtrap / SendGrid)         |
| Docs       | Swagger (auto-generated from JSDoc)             |

> **Note:** No file upload server. Images and session videos are URLs (YouTube, Drive, Cloudinary, Imgur, etc.) to keep hosting 100% free.

---

## 📁 Architecture

```
src/
├── app.js                 # Express setup, middleware, routes
├── server.js              # Entry point, DB connection, error handling
├── controllers/           # Request/response handling (thin)
├── services/              # Business logic & DB operations
├── models/                # Mongoose schemas
├── routes/                # Route definitions + Swagger JSDoc
├── validations/           # Joi schemas
├── middlewares/           # Auth, validation
├── utils/                 # APIFeatures, AppError, Email, catchAsync
└── config/                # DB, mailer, env validation, swagger
```

---

## ⚡ Quick Start

### Prerequisites

- Node.js ≥ 18
- MongoDB (local or [Atlas free tier](https://www.mongodb.com/atlas))

### 1. Clone & Install

```bash
git clone https://github.com/basem3sam/trosc-backend.git
cd trosc-backend
npm install
```

### 2. Environment Variables

Create `.env` in the root:

```env
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/trosc
# Or local: mongodb://localhost:27017/trosc

# Auth
JWT_SECRET=your_super_secret_key_min_32_chars
JWT_EXPIRES_IN=30d
JWT_COOKIE_EXPIRES_IN=7

# Frontend (for CORS and password reset links)
FRONTEND_URL=http://localhost:3000
BASE_URL=http://localhost:5000

# Rate Limiting
RATE_LIMIT_MAX=300
RATE_LIMIT_WINDOW_MS=900000

# Email (use Mailtrap for dev, SendGrid for prod)
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your_mailtrap_user
EMAIL_PASS=your_mailtrap_pass
EMAIL_FROM=Trosc Club <noreply@trosc.club>
```

### 3. Run

```bash
# Development (nodemon)
npm start

# production
NODE_ENV=production npm start
```

---

## 📚 API Documentation

Once running, open:

```plain
http://localhost:5000/api-docs
```

Auto-generated Swagger UI with all endpoints, schemas, and auth.

### Key Endpoints

| Resource                   | Endpoint                                    | Method | Access           |
| -------------------------- | ------------------------------------------- | ------ | ---------------- |
| **Auth**                   |                                             |        |                  |
| Sign up                    | `/v1/users/signup`                          | POST   | Public           |
| Log in                     | `/v1/users/login`                           | POST   | Public           |
| Forgot password            | `/v1/users/forgotPassword`                  | POST   | Public           |
| Reset password             | `/v1/users/resetPassword/:token`            | PATCH  | Public           |
| Log out                    | `/v1/users/logout`                          | POST   | Protected        |
| Update my password         | `/v1/users/updateMyPassword`                | PATCH  | Protected        |
| **Users**                  |                                             |        |                  |
| Get me                     | `/v1/users/me`                              | GET    | Protected        |
| Update me                  | `/v1/users/updateMe`                        | PATCH  | Protected        |
| Delete me                  | `/v1/users/deleteMe`                        | DELETE | Protected        |
| My enrollments             | `/v1/users/me/enrollments`                  | GET    | Protected        |
| List users                 | `/v1/users`                                 | GET    | Admin            |
| Create user                | `/v1/users`                                 | POST   | Admin            |
| Get user                   | `/v1/users/:id`                             | GET    | Admin            |
| Update user                | `/v1/users/:id`                             | PATCH  | Admin            |
| Delete user                | `/v1/users/:id`                             | DELETE | Admin            |
| Bulk action                | `/v1/users/bulk`                            | POST   | Admin            |
| **Tracks**                 |                                             |        |                  |
| List tracks                | `/v1/tracks`                                | GET    | Public           |
| Popular tracks             | `/v1/tracks/popular`                        | GET    | Public           |
| Create track               | `/v1/tracks`                                | POST   | Admin/Instructor |
| Get track                  | `/v1/tracks/:id`                            | GET    | Public           |
| Update track               | `/v1/tracks/:id`                            | PATCH  | Admin/Instructor |
| Delete track               | `/v1/tracks/:id`                            | DELETE | Admin            |
| Track analytics            | `/v1/tracks/:id/analytics`                  | GET    | Admin/Instructor |
| Self-enroll                | `/v1/tracks/:id/enroll-me`                  | POST   | Protected        |
| Add student                | `/v1/tracks/:id/students`                   | POST   | Admin/Instructor |
| Remove student             | `/v1/tracks/:id/students/:studentId`        | DELETE | Admin/Instructor |
| Add course to track        | `/v1/tracks/:trackId/courses/:courseId`     | PATCH  | Admin/Instructor |
| Remove course from track   | `/v1/tracks/:trackId/courses/:courseId`     | DELETE | Admin/Instructor |
| Add session to track       | `/v1/tracks/:trackId/sessions/:sessionId`   | PATCH  | Admin/Instructor |
| Remove session from track  | `/v1/tracks/:trackId/sessions/:sessionId`   | DELETE | Admin/Instructor |
| **Courses**                |                                             |        |                  |
| List courses               | `/v1/courses`                               | GET    | Public           |
| Create course              | `/v1/courses`                               | POST   | Admin/Instructor |
| Get course                 | `/v1/courses/:id`                           | GET    | Public           |
| Update course              | `/v1/courses/:id`                           | PATCH  | Admin/Instructor |
| Delete course              | `/v1/courses/:id`                           | DELETE | Admin            |
| By instructor              | `/v1/courses/instructor/:instructorId`      | GET    | Public           |
| By track                   | `/v1/courses/track/:trackId`                | GET    | Public           |
| By student                 | `/v1/courses/student/:studentId`            | GET    | Public           |
| Add student                | `/v1/courses/:id/students`                  | POST   | Admin/Instructor |
| Remove student             | `/v1/courses/:id/students/:studentId`       | DELETE | Admin/Instructor |
| Add session to course      | `/v1/courses/:courseId/sessions/:sessionId` | PATCH  | Admin/Instructor |
| Remove session from course | `/v1/courses/:courseId/sessions/:sessionId` | DELETE | Admin/Instructor |
| **Sessions**               |                                             |        |                  |
| List sessions              | `/v1/sessions`                              | GET    | Protected        |
| Create session             | `/v1/sessions`                              | POST   | Admin/Instructor |
| Get session                | `/v1/sessions/:id`                          | GET    | Protected        |
| Update session             | `/v1/sessions/:id`                          | PATCH  | Admin/Instructor |
| Delete session             | `/v1/sessions/:id`                          | DELETE | Admin            |
| By instructor              | `/v1/sessions/instructor/:instructorId`     | GET    | Protected        |
| By track                   | `/v1/sessions/track/:trackId`               | GET    | Protected        |
| Add student                | `/v1/sessions/:id/students`                 | POST   | Admin/Instructor |
| Remove student             | `/v1/sessions/:id/students/:studentId`      | DELETE | Admin/Instructor |
| **Events**                 |                                             |        |                  |
| List events                | `/v1/events`                                | GET    | Public           |
| My events                  | `/v1/events/my-events`                      | GET    | Protected        |
| Get event                  | `/v1/events/:id`                            | GET    | Public           |
| Create event               | `/v1/events`                                | POST   | Admin/Instructor |
| Update event               | `/v1/events/:id`                            | PATCH  | Admin/Instructor |
| Delete event               | `/v1/events/:id`                            | DELETE | Admin            |
| RSVP                       | `/v1/events/:id/rsvp`                       | POST   | Protected        |
| Cancel RSVP                | `/v1/events/:id/rsvp`                       | DELETE | Protected        |
| **Announcements**          |                                             |        |                  |
| List announcements         | `/v1/announcements`                         | GET    | Public           |
| Create announcement        | `/v1/announcements`                         | POST   | Admin/Instructor |
| Get announcement           | `/v1/announcements/:id`                     | GET    | Public           |
| Update announcement        | `/v1/announcements/:id`                     | PATCH  | Admin/Instructor |
| Delete announcement        | `/v1/announcements/:id`                     | DELETE | Admin            |
| **Feed**                   |                                             |        |                  |
| Dashboard feed             | `/v1/feed`                                  | GET    | Public           |
| **Health**                 |                                             |        |                  |
| Health check               | `/health`                                   | GET    | Public           |

---

## 🔐 Security

- **Helmet** — Secure HTTP headers
- **Rate Limiting** — 300 req / 15 min per IP
- **NoSQL Injection** — `express-mongo-sanitize`
- **Input Sanitization** — Joi validation on all inputs
- **HPP** — Parameter pollution protection
- **CORS** — Whitelist-based with credentials
- **Passwords** — bcrypt (cost 12)
- **JWT** — Stored in httpOnly cookie + `sameSite: strict`
- **Ownership** — Instructors can only modify their own content; admins bypass

---

## 💰 Cost Strategy

| Feature         | Solution                                | Cost      |
| --------------- | --------------------------------------- | --------- |
| Video hosting   | YouTube / Google Drive                  | Free      |
| Images          | External URLs (Cloudinary, Imgur, etc.) | Free      |
| Database        | MongoDB Atlas M0                        | Free      |
| Backend hosting | Render / Railway / Vercel               | Free tier |
| Email           | Mailtrap (dev) / SendGrid (prod)        | Free tier |

---

## 🛠️ Scripts

| Command          | Description              |
| ---------------- | ------------------------ |
| `npm start`      | Start with nodemon (dev) |
| `npm start:prod` | Production mode          |

---

## 🧪 Testing

```bash
# Health check
curl http://localhost:5000/health

# Swagger docs
open http://localhost:5000/api-docs
```

---

## 👤 Author

**Basem Esam Omar**  
Backend Engineer — Node.js | MongoDB | Express.js  
[GitHub](https://github.com/basem3sam) · [LinkedIn](https://linkedin.com/in/basemesam)

---

## 📄 License

ISC — Free for educational use.

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

| Layer | Tech |
|-------|------|
| Runtime | Node.js + Express.js |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT (bearer + cookie), bcrypt |
| Validation | Joi |
| Security | Helmet, express-rate-limit, mongo-sanitize, xss-clean, hpp |
| Email | Nodemailer (SMTP / Mailtrap / SendGrid) |
| Docs | Swagger (auto-generated from JSDoc) |

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

http://localhost:5000/api-docs

Auto-generated Swagger UI with all endpoints, schemas, and auth.

### Key Endpoints

| Resource | Endpoint | Access |
|----------|----------|--------|
| Auth | `POST /v1/users/signup` | Public |
| Auth | `POST /v1/users/login` | Public |
| Auth | `POST /v1/users/forgotPassword` | Public |
| Auth | `PATCH /v1/users/resetPassword/:token` | Public |
| Auth | `POST /v1/users/logout` | Protected |
| Auth | `PATCH /v1/users/updateMyPassword` | Protected |
| Users | `GET /v1/users/me` | Protected |
| Users | `PATCH /v1/users/updateMe` | Protected |
| Users | `DELETE /v1/users/deleteMe` | Protected |
| Users | `GET /v1/users/me/enrollments` | Protected |
| Users | `GET /v1/users` | Admin |
| Users | `POST /v1/users` | Admin |
| Users | `GET /v1/users/:id` | Admin |
| Users | `PATCH /v1/users/:id` | Admin |
| Users | `DELETE /v1/users/:id` | Admin |
| Users | `POST /v1/users/bulk` | Admin |
| Tracks | `GET /v1/tracks` | Public |
| Tracks | `GET /v1/tracks/popular` | Public |
| Tracks | `POST /v1/tracks` | Admin/Instructor |
| Tracks | `GET /v1/tracks/:id` | Public |
| Tracks | `PATCH /v1/tracks/:id` | Admin/Instructor |
| Tracks | `DELETE /v1/tracks/:id` | Admin |
| Tracks | `GET /v1/tracks/:id/analytics` | Admin/Instructor |
| Tracks | `POST /v1/tracks/:id/enroll-me` | Protected |
| Tracks | `POST /v1/tracks/:id/students` | Admin/Instructor |
| Tracks | `DELETE /v1/tracks/:id/students/:studentId` | Admin/Instructor |
| Tracks | `PATCH /v1/tracks/:trackId/courses/:courseId` | Admin/Instructor |
| Tracks | `DELETE /v1/tracks/:trackId/courses/:courseId` | Admin/Instructor |
| Tracks | `PATCH /v1/tracks/:trackId/sessions/:sessionId` | Admin/Instructor |
| Tracks | `DELETE /v1/tracks/:trackId/sessions/:sessionId` | Admin/Instructor |
| Courses | `GET /v1/courses` | Public |
| Courses | `POST /v1/courses` | Admin/Instructor |
| Courses | `GET /v1/courses/:id` | Public |
| Courses | `PATCH /v1/courses/:id` | Admin/Instructor |
| Courses | `DELETE /v1/courses/:id` | Admin |
| Courses | `GET /v1/courses/instructor/:instructorId` | Public |
| Courses | `GET /v1/courses/track/:trackId` | Public |
| Courses | `GET /v1/courses/student/:studentId` | Public |
| Courses | `POST /v1/courses/:id/students` | Admin/Instructor |
| Courses | `DELETE /v1/courses/:id/students/:studentId` | Admin/Instructor |
| Courses | `PATCH /v1/courses/:courseId/sessions/:sessionId` | Admin/Instructor |
| Courses | `DELETE /v1/courses/:courseId/sessions/:sessionId` | Admin/Instructor |
| Sessions | `GET /v1/sessions` | Protected |
| Sessions | `POST /v1/sessions` | Admin/Instructor |
| Sessions | `GET /v1/sessions/:id` | Protected |
| Sessions | `PATCH /v1/sessions/:id` | Admin/Instructor |
| Sessions | `DELETE /v1/sessions/:id` | Admin |
| Sessions | `GET /v1/sessions/instructor/:instructorId` | Protected |
| Sessions | `GET /v1/sessions/track/:trackId` | Protected |
| Sessions | `POST /v1/sessions/:id/students` | Admin/Instructor |
| Sessions | `DELETE /v1/sessions/:id/students/:studentId` | Admin/Instructor |
| Events | `GET /v1/events` | Public |
| Events | `GET /v1/events/my-events` | Protected |
| Events | `GET /v1/events/:id` | Public |
| Events | `POST /v1/events` | Admin/Instructor |
| Events | `PATCH /v1/events/:id` | Admin/Instructor |
| Events | `DELETE /v1/events/:id` | Admin |
| Events | `POST /v1/events/:id/rsvp` | Protected |
| Events | `DELETE /v1/events/:id/rsvp` | Protected |
| Announcements | `GET /v1/announcements` | Public |
| Announcements | `POST /v1/announcements` | Admin/Instructor |
| Announcements | `GET /v1/announcements/:id` | Public |
| Announcements | `PATCH /v1/announcements/:id` | Admin/Instructor |
| Announcements | `DELETE /v1/announcements/:id` | Admin |
| Feed | `GET /v1/feed` | Public |
| Health | `GET /health` | Public |

---

## 🔐 Security

- **Helmet** — Secure HTTP headers
- **Rate Limiting** — 300 req / 15 min per IP
- **NoSQL Injection** — `express-mongo-sanitize`
- **XSS** — `xss-clean` + input validation
- **HPP** — Parameter pollution protection
- **CORS** — Whitelist-based with credentials
- **Passwords** — bcrypt (cost 12)
- **JWT** — Stored in httpOnly cookie + `sameSite: strict`

---

## 💰 Cost Strategy

| Feature | Solution | Cost |
|---------|----------|------|
| Video hosting | YouTube / Google Drive | Free |
| Images | External URLs (Cloudinary, Imgur, etc.) | Free |
| Database | MongoDB Atlas M0 | Free |
| Backend hosting | Render / Railway / Vercel | Free tier |
| Email | Mailtrap (dev) / SendGrid (prod) | Free tier |

---

## 🛠️ Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start with nodemon (dev) |
| `npm start:prod` | Production mode |

---

## 👤 Author

**Basem Esam Omar**  
Backend Engineer — Node.js | MongoDB | Express.js  
[GitHub](https://github.com/basem3sam) · [LinkedIn](https://linkedin.com/in/basemesam)

---

## 📄 License

ISC — Free for educational use.
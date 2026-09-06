# 📚 API Reference

> Complete endpoint reference for the Trosc Backend API.  
> For interactive testing, run the server and visit [`/api-docs`](http://localhost:5000/api-docs).

---

## 🔐 Authentication

All protected endpoints accept either:
- `Authorization: Bearer <jwt>` header
- `jwt=<token>` httpOnly cookie (sent automatically by browser)

---

## Response Format

All successful list responses follow this envelope:

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

## Query Parameters

List endpoints (`GET /tracks`, `GET /courses`, `GET /sessions`, `GET /events`, `GET /announcements`, `GET /users`) support:

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page, max 100 (default: 10–20) |
| `sort` | string | Sort field, prefix `-` for descending (e.g., `-createdAt`) |
| `fields` | string | Comma-separated fields to include/exclude |
| `search` | string | Full-text search on title/description where applicable |
| `[field][op]` | mixed | MongoDB-style operators: `?duration[gte]=10`, `?date[gte]=2025-01-01` |

---

## Endpoints

### Auth

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/v1/users/signup` | Public | Register a new account (rate limited: 5 attempts / 15 min) |
| `POST` | `/v1/users/login` | Public | Authenticate and receive JWT (rate limited: 5 attempts / 15 min) |
| `POST` | `/v1/users/logout` | Protected | Clear auth cookie |
| `POST` | `/v1/users/forgotPassword` | Public | Request password reset email (rate limited: 5 attempts / 15 min) |
| `PATCH` | `/v1/users/resetPassword/:token` | Public | Reset password with token (rate limited: 5 attempts / 15 min) |
| `PATCH` | `/v1/users/updateMyPassword` | Protected | Change current password (invalidates existing tokens) |

### Users

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/v1/users/me` | Protected | Get current user profile |
| `PATCH` | `/v1/users/updateMe` | Protected | Update profile (name, email, photo, bio; email change resets verification) |
| `DELETE` | `/v1/users/deleteMe` | Protected | Soft-delete own account |
| `GET` | `/v1/users/me/enrollments` | Protected | Get enrolled track, courses, and sessions |
| `GET` | `/v1/users` | Admin | List all active users (inactive accounts hidden) |
| `POST` | `/v1/users` | Admin | Create user with any role |
| `GET` | `/v1/users/:id` | Admin | Get user by ID |
| `PATCH` | `/v1/users/:id` | Admin | Update user (including role) |
| `DELETE` | `/v1/users/:id` | Admin | Hard-delete user |
| `POST` | `/v1/users/bulk` | Admin | Bulk activate / deactivate / delete |

### Tracks

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/v1/tracks` | Public | List all tracks (filter, sort, paginate) |
| `GET` | `/v1/tracks/popular` | Public | Most enrolled tracks |
| `GET` | `/v1/tracks/:id` | Public | Get track details (404 if unpublished and caller is not owner/admin) |
| `POST` | `/v1/tracks` | Admin / Instructor | Create track |
| `PATCH` | `/v1/tracks/:id` | Admin / Instructor | Update track (owner only; admin bypass) |
| `DELETE` | `/v1/tracks/:id` | Admin | Delete track (courses orphaned, sessions become standalone) |
| `GET` | `/v1/tracks/student/:studentId` | Self / Admin | Track a student is enrolled in (returns array; system enforces one track) |
| `GET` | `/v1/tracks/:id/analytics` | Admin / Instructor | Track stats |
| `POST` | `/v1/tracks/:id/enroll-me` | Protected | Self-enroll (pending approval; rejected if already in another track; rate limited) |
| `POST` | `/v1/tracks/:id/students` | Admin / Instructor | Manually enroll student |
| `DELETE` | `/v1/tracks/:id/students/:studentId` | Admin / Instructor | Remove student from track |
| `POST` | `/v1/tracks/:id/students/:studentId/approve` | Admin / Instructor | Approve enrollment request (self-approval blocked) |
| `POST` | `/v1/tracks/:id/students/:studentId/reject` | Admin / Instructor | Reject enrollment request |
| `POST` | `/v1/tracks/:id/leave-me` | Protected | Request to leave track (rate limited) |
| `GET` | `/v1/tracks/:id/leaves` | Admin / Instructor | View pending leave requests |
| `POST` | `/v1/tracks/:id/leaves/:studentId/approve` | Admin / Instructor | Approve leave request (self-approval blocked) |
| `POST` | `/v1/tracks/:id/leaves/:studentId/reject` | Admin / Instructor | Reject leave request |
| `PATCH` | `/v1/tracks/:trackId/courses/:courseId` | Admin / Instructor | Add course to track |
| `DELETE` | `/v1/tracks/:trackId/courses/:courseId` | Admin / Instructor | Remove course from track |
| `PATCH` | `/v1/tracks/:trackId/sessions/:sessionId` | Admin / Instructor | Add session to track |
| `DELETE` | `/v1/tracks/:trackId/sessions/:sessionId` | Admin / Instructor | Remove session from track |
| `POST` | `/v1/tracks/:id/reviews` | Protected (enrolled student) | Submit a rating + review for a track (one per student) |
| `GET` | `/v1/tracks/:id/reviews` | Public | List reviews for a track (paginated) |
| `GET` | `/v1/tracks/:id/assignments` | Protected (enrolled student / any instructor / admin) | All assignments across every course + standalone session in the track, with `mySubmission` attached |
| `GET` | `/v1/tracks/:id/weekly-tasks` | Protected (enrolled student / any instructor / admin) | All weekly task buckets across every course in the track, with per-item `done` flags |

### Courses

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/v1/courses` | Public | List all courses (filter, sort, paginate) |
| `GET` | `/v1/courses/:id` | Public | Get course details (404 if unpublished and caller is not owner/admin) |
| `POST` | `/v1/courses` | Admin / Instructor | Create course |
| `PATCH` | `/v1/courses/:id` | Admin / Instructor | Update course (owner only; admin bypass) |
| `DELETE` | `/v1/courses/:id` | Admin / Instructor | Delete course (sessions become standalone; owner only; admin bypass) |
| `GET` | `/v1/courses/instructor/:instructorId` | Public | Courses by instructor |
| `GET` | `/v1/courses/track/:trackId` | Public | Courses in a track |
| `GET` | `/v1/courses/student/:studentId` | Self / Admin | Courses a student is enrolled in |
| `POST` | `/v1/courses/:id/enroll-me` | Protected | Self-enroll (prerequisites + access rules enforced: public/track-only/private; rate limited) |
| `DELETE` | `/v1/courses/:id/leave-me` | Protected | Leave course (rate limited) |
| `POST` | `/v1/courses/:id/students` | Admin / Instructor | Manually enroll student |
| `DELETE` | `/v1/courses/:id/students/:studentId` | Admin / Instructor | Remove student from course |
| `PATCH` | `/v1/courses/:courseId/sessions/:sessionId` | Admin / Instructor | Add session to course |
| `DELETE` | `/v1/courses/:courseId/sessions/:sessionId` | Admin / Instructor | Remove session from course |
| `POST` | `/v1/courses/:id/reviews` | Protected (enrolled student) | Submit a rating + review for a course (one per student) |
| `GET` | `/v1/courses/:id/reviews` | Public | List reviews for a course (paginated) |
| `GET` | `/v1/courses/:id/assignments` | Protected (enrolled student / any instructor / admin) | Assignments for this course, with `mySubmission` attached |
| `POST` | `/v1/courses/:id/weekly-tasks` | Admin / owner instructor | Create a weekly task bucket for a course (one per week number) |
| `GET` | `/v1/courses/:id/weekly-tasks` | Protected (enrolled student / any instructor / admin) | Weekly task buckets for this course, with per-item `done` flags |

### Sessions

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/v1/sessions` | Protected | List all sessions (`url`, `embedUrl`, `resources` omitted in list view) |
| `GET` | `/v1/sessions/:id` | Protected | Get session details (`url`, `embedUrl`, `resources` stripped if not enrolled) |
| `POST` | `/v1/sessions` | Admin / Instructor | Create session |
| `PATCH` | `/v1/sessions/:id` | Admin / Instructor | Update session (owner only; admin bypass) |
| `DELETE` | `/v1/sessions/:id` | Admin / Instructor | Delete session (owner only; admin bypass) |
| `GET` | `/v1/sessions/instructor/:instructorId` | Protected | Sessions by instructor |
| `GET` | `/v1/sessions/track/:trackId` | Protected | Sessions in a track |
| `POST` | `/v1/sessions/:id/enroll-me` | Protected | Self-enroll in session (track-only/private access rules enforced; rate limited) |
| `DELETE` | `/v1/sessions/:id/leave-me` | Protected | Leave session (rate limited) |
| `POST` | `/v1/sessions/:id/students` | Admin / Instructor | Manually enroll student |
| `DELETE` | `/v1/sessions/:id/students/:studentId` | Admin / Instructor | Remove student from session |
| `POST` | `/v1/sessions/:id/reviews` | Protected (enrolled student) | Submit a rating + review for a session (one per student) |
| `GET` | `/v1/sessions/:id/reviews` | Public | List reviews for a session (paginated) |
| `GET` | `/v1/sessions/:id/assignments` | Protected (enrolled student / any instructor / admin) | Assignments for this standalone session, with `mySubmission` attached |

### Events

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/v1/events` | Public | List all events |
| `GET` | `/v1/events/my-events` | Protected | Events the current user RSVP'd to |
| `GET` | `/v1/events/:id` | Public | Get event details |
| `POST` | `/v1/events` | Admin / Instructor | Create event |
| `PATCH` | `/v1/events/:id` | Admin / Instructor | Update event (owner only; admin bypass) |
| `DELETE` | `/v1/events/:id` | Admin / Instructor | Delete event (owner only; admin bypass) |
| `POST` | `/v1/events/:id/rsvp` | Protected | RSVP to event (rate limited) |
| `DELETE` | `/v1/events/:id/rsvp` | Protected | Cancel RSVP (rate limited) |

### Announcements

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/v1/announcements` | Public | List all announcements, pinned first then newest |
| `GET` | `/v1/announcements/:id` | Public | Get single announcement |
| `POST` | `/v1/announcements` | Admin / Instructor | Create announcement |
| `PATCH` | `/v1/announcements/:id` | Admin / Instructor | Update announcement (owner only; admin bypass) |
| `DELETE` | `/v1/announcements/:id` | Admin / Instructor | Delete announcement (owner only; admin bypass) |

### Contact

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/v1/contact` | Public | Submit the contact us form (stores submission + notifies admin by email; rate limited) |

### Weekly Tasks

Creation and listing live under `/v1/courses/:id/weekly-tasks` and `/v1/tracks/:id/weekly-tasks` (see above). These are the standalone, top-level actions keyed by the task's own ID:

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `DELETE` | `/v1/weekly-tasks/:taskId` | Admin / owner instructor | Delete a weekly task bucket |
| `POST` | `/v1/weekly-tasks/:taskId/items/:itemId/complete` | Protected (enrolled student) | Mark an item as completed (idempotent) |
| `DELETE` | `/v1/weekly-tasks/:taskId/items/:itemId/complete` | Protected (enrolled student) | Unmark an item as completed (idempotent) |

### Feed & Health

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/v1/feed` | Public | Dashboard feed (pinned + upcoming events) |
| `GET` | `/health` | Public | Server & database health check |
| `GET` | `/v1/health` | Public | Health check (Swagger consistency) |

---

## 📖 Interactive Docs

Run the server and open:

```
http://localhost:5000/api-docs
```

The Swagger UI includes:
- Request/response schemas
- Authentication try-it-now
- Filter examples (`?level=intermediate`, `?sort=-createdAt`, `?search=react`)

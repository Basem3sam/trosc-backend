# 📚 API Reference

> Complete endpoint reference for the Trosc Backend API.  
> For interactive testing, run the server and visit [`/api-docs`](http://localhost:5000/api-docs).

---

## 🔐 Authentication

All protected endpoints accept either:
- `Authorization: Bearer <jwt>` header
- `jwt=<token>` httpOnly cookie (sent automatically by browser)

---

## Endpoints

### Auth

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/v1/users/signup` | Public | Register a new account |
| `POST` | `/v1/users/login` | Public | Authenticate and receive JWT |
| `POST` | `/v1/users/logout` | Protected | Clear auth cookie |
| `POST` | `/v1/users/forgotPassword` | Public | Request password reset email |
| `PATCH` | `/v1/users/resetPassword/:token` | Public | Reset password with token |
| `PATCH` | `/v1/users/updateMyPassword` | Protected | Change current password |

### Users

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/v1/users/me` | Protected | Get current user profile |
| `PATCH` | `/v1/users/updateMe` | Protected | Update profile (name, email, photo, bio) |
| `DELETE` | `/v1/users/deleteMe` | Protected | Soft-delete own account |
| `GET` | `/v1/users/me/enrollments` | Protected | Get enrolled tracks, courses, sessions |
| `GET` | `/v1/users` | Admin | List all users |
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
| `GET` | `/v1/tracks/:id` | Public | Get track details |
| `POST` | `/v1/tracks` | Admin / Instructor | Create track |
| `PATCH` | `/v1/tracks/:id` | Admin / Instructor | Update track (owner only) |
| `DELETE` | `/v1/tracks/:id` | Admin | Delete track |
| `GET` | `/v1/tracks/student/:studentId` | Self / Admin | Tracks a student is enrolled in |
| `GET` | `/v1/tracks/:id/analytics` | Admin / Instructor | Track stats |
| `POST` | `/v1/tracks/:id/enroll-me` | Protected | Self-enroll (pending approval) |
| `POST` | `/v1/tracks/:id/students` | Admin / Instructor | Manually enroll student |
| `DELETE` | `/v1/tracks/:id/students/:studentId` | Admin / Instructor | Remove student from track |
| `POST` | `/v1/tracks/:id/students/:studentId/approve` | Admin / Instructor | Approve enrollment request |
| `POST` | `/v1/tracks/:id/students/:studentId/reject` | Admin / Instructor | Reject enrollment request |
| `POST` | `/v1/tracks/:id/leave-me` | Protected | Request to leave track |
| `GET` | `/v1/tracks/:id/leaves` | Admin / Instructor | View pending leave requests |
| `POST` | `/v1/tracks/:id/leaves/:studentId/approve` | Admin / Instructor | Approve leave request |
| `POST` | `/v1/tracks/:id/leaves/:studentId/reject` | Admin / Instructor | Reject leave request |
| `PATCH` | `/v1/tracks/:trackId/courses/:courseId` | Admin / Instructor | Add course to track |
| `DELETE` | `/v1/tracks/:trackId/courses/:courseId` | Admin / Instructor | Remove course from track |
| `PATCH` | `/v1/tracks/:trackId/sessions/:sessionId` | Admin / Instructor | Add session to track |
| `DELETE` | `/v1/tracks/:trackId/sessions/:sessionId` | Admin / Instructor | Remove session from track |

### Courses

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/v1/courses` | Public | List all courses (filter, sort, paginate) |
| `GET` | `/v1/courses/:id` | Public | Get course details |
| `POST` | `/v1/courses` | Admin / Instructor | Create course |
| `PATCH` | `/v1/courses/:id` | Admin / Instructor | Update course (owner only) |
| `DELETE` | `/v1/courses/:id` | Admin / Instructor | Delete course (owner only) |
| `GET` | `/v1/courses/instructor/:instructorId` | Public | Courses by instructor |
| `GET` | `/v1/courses/track/:trackId` | Public | Courses in a track |
| `GET` | `/v1/courses/student/:studentId` | Self / Admin | Courses a student is enrolled in |
| `POST` | `/v1/courses/:id/enroll-me` | Protected | Self-enroll (prerequisites enforced) |
| `DELETE` | `/v1/courses/:id/leave-me` | Protected | Leave course |
| `POST` | `/v1/courses/:id/students` | Admin / Instructor | Manually enroll student |
| `DELETE` | `/v1/courses/:id/students/:studentId` | Admin / Instructor | Remove student from course |
| `PATCH` | `/v1/courses/:courseId/sessions/:sessionId` | Admin / Instructor | Add session to course |
| `DELETE` | `/v1/courses/:courseId/sessions/:sessionId` | Admin / Instructor | Remove session from course |

### Sessions

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/v1/sessions` | Protected | List all sessions |
| `GET` | `/v1/sessions/:id` | Protected | Get session details |
| `POST` | `/v1/sessions` | Admin / Instructor | Create session |
| `PATCH` | `/v1/sessions/:id` | Admin / Instructor | Update session (owner only) |
| `DELETE` | `/v1/sessions/:id` | Admin / Instructor | Delete session (owner only) |
| `GET` | `/v1/sessions/instructor/:instructorId` | Protected | Sessions by instructor |
| `GET` | `/v1/sessions/track/:trackId` | Protected | Sessions in a track |
| `POST` | `/v1/sessions/:id/enroll-me` | Protected | Self-enroll in session |
| `DELETE` | `/v1/sessions/:id/leave-me` | Protected | Leave session |
| `POST` | `/v1/sessions/:id/students` | Admin / Instructor | Manually enroll student |
| `DELETE` | `/v1/sessions/:id/students/:studentId` | Admin / Instructor | Remove student from session |

### Events

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/v1/events` | Public | List all events |
| `GET` | `/v1/events/my-events` | Protected | Events the current user RSVP'd to |
| `GET` | `/v1/events/:id` | Public | Get event details |
| `POST` | `/v1/events` | Admin / Instructor | Create event |
| `PATCH` | `/v1/events/:id` | Admin / Instructor | Update event (owner only) |
| `DELETE` | `/v1/events/:id` | Admin / Instructor | Delete event (owner only) |
| `POST` | `/v1/events/:id/rsvp` | Protected | RSVP to event |
| `DELETE` | `/v1/events/:id/rsvp` | Protected | Cancel RSVP |

### Announcements

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/v1/announcements` | Public | List announcements (pinned first) |
| `GET` | `/v1/announcements/:id` | Public | Get single announcement |
| `POST` | `/v1/announcements` | Admin / Instructor | Create announcement |
| `PATCH` | `/v1/announcements/:id` | Admin / Instructor | Update announcement (owner only) |
| `DELETE` | `/v1/announcements/:id` | Admin / Instructor | Delete announcement (owner only) |

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

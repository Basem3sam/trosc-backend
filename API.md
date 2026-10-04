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

## Error Response Structure

All error responses follow this format:

```json
{
  "status": "fail", // or "error" for 5xx
  "message": "Error description"
}
```

Common HTTP status codes:

| Code | Meaning                                                                                                    |
| ---- | ---------------------------------------------------------------------------------------------------------- |
| 200  | Success                                                                                                    |
| 201  | Created                                                                                                    |
| 204  | No Content (successful delete)                                                                             |
| 400  | Bad Request (validation error)                                                                             |
| 401  | Unauthorized (missing/invalid token)                                                                       |
| 403  | Forbidden (insufficient permissions)                                                                       |
| 404  | Not Found                                                                                                  |
| 409  | Conflict (duplicate resource, or a blocked action such as deleting a user who still owns required content) |
| 429  | Too Many Requests (rate limited)                                                                           |
| 500  | Internal Server Error                                                                                      |

---

## Rate Limiting

All endpoints are rate-limited. The global limit is **300 requests per 15 minutes** per IP. Authentication endpoints (`/v1/users/login`, `/v1/users/signup`, `/v1/users/forgotPassword`, `/v1/users/resetPassword`) have a stricter limit of **5 attempts per 15 minutes**.

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 295
X-RateLimit-Reset: 1700000000
```

When the limit is exceeded, the API returns `429 Too Many Requests`.

---

## Query Parameters

List endpoints (`GET /tracks`, `GET /courses`, `GET /sessions`, `GET /events`, `GET /announcements`, `GET /users`, `GET /contact`, `GET /activity-logs`, `GET /dashboard-stats`) support:

| Parameter     | Type    | Description                                                           |
| ------------- | ------- | --------------------------------------------------------------------- |
| `page`        | integer | Page number (default: 1)                                              |
| `limit`       | integer | Items per page, max 100 (default: 10–20)                              |
| `sort`        | string  | Sort field, prefix `-` for descending (e.g., `-createdAt`)            |
| `fields`      | string  | Comma-separated fields to include/exclude                             |
| `search`      | string  | Full-text search on title/description where applicable                |
| `[field][op]` | mixed   | MongoDB-style operators: `?duration[gte]=10`, `?date[gte]=2025-01-01` |

### Example: Pagination + Filtering

```
GET /v1/tracks?level=intermediate&published=true&page=2&limit=5
```

---

## 🛡️ Authorization model (stage 4)

Authorization is computed from the caller's **current** role and **current**
staff membership on every request (`src/services/policy.service.js`). Nothing
depends on who *created* an item; `createdBy` is attribution only.

1. **Admin** can do every protected action on every resource (create, edit,
   delete, link/unlink, assign instructors, grade, students, join/leave
   requests, review moderation) and never needs the instructor role.
2. **Creation.** `POST /courses` and `POST /sessions` are open to admins and
   any instructor, inside or outside a track; the creator becomes the item's
   `instructor` and fully manages it. `POST /tracks` is **admin-only**.
3. **Assigning instructors** (`instructor` on a track/course/session, and
   `Track.instructors`) is admin-only. A non-admin's value is silently dropped
   (create defaults `instructor` to the caller). The user must have role
   `instructor` or `admin`, else 400. Changing it revokes the old instructor
   immediately. On a track, a duplicate id and the lead's own id are removed
   from `instructors`; moving the lead to a current co-instructor removes them
   from `instructors`.
4. **Linking** a course/session to a track (`PATCH /tracks/:trackId/courses/
   :courseId`, `PATCH /tracks/:trackId/sessions/:sessionId`, `track` on
   `POST/PATCH /courses`): admin, OR a caller who is BOTH the item's own
   current instructor (staff of its current track is not enough) AND the lead
   or a co-instructor of the TARGET track. **Unlinking:** admin, OR staff of
   that track, OR the item's own instructor. `tracks` is not accepted on
   sessions; use the link endpoint.
5. **Track lead and co-instructors** manage everything inside their track:
   the track, its courses and sessions (edit/delete), assignments and weekly
   tasks (create/edit/delete), grading, opening submission files, students,
   join/leave requests. A **course or session instructor** manages only that
   item and its contents (a session in several tracks is also managed by the
   staff of any of them). An instructor with no track can create and fully
   manage his own standalone courses and sessions, and nothing else. If an
   admin later attaches his course to a track he keeps managing it.
6. **Only an admin** deletes a track or changes its `instructor` /
   `instructors`.
7. **Drafts** (`published: false`) are visible only to admins and to staff who
   manage them (lists and detail; others get 404 / are filtered out).

Assignments and weekly tasks get their authority from their PARENT course or
session, never from their stored `instructor` or `createdBy`. On create,
`instructor` is the parent's current instructor and `createdBy` is the caller.
Denied callers get 403 (401 if anonymous); a missing resource is 404.

### Breaking changes in stage 4

- `POST /tracks` is admin-only (instructors now get 403).
- Track `instructor` (and the new `instructors`) no longer include `email` or
  `role` on any `GET /tracks*` response, including `/tracks/popular`; the
  popular response now also carries `instructors`.
- `GET /tracks/:id/leaves` and `GET /tracks/:id/analytics` now require
  managing that track (previously any instructor).
- Creators lose management access when they lose authority; there is no
  creator override (affects assignments, weekly tasks, sessions, courses).
- Track staff now includes co-instructors, and track staff can edit/delete the
  track's courses and sessions, and grade its assignments.
- `PATCH /tracks/:trackId/courses|sessions/:id` (link) now requires the item's
  own instructor (or admin) in addition to being track staff; unlink is
  allowed to the item's own instructor too.
- Course link 403 text changed to "…a track you lead or co-instruct" /
  "…a track you manage".
- `GET /tracks?instructor=:id` returns lead OR co-instructor tracks (was lead
  only) and answers 400 for an invalid id.
- Draft tracks/courses/sessions are visible to instructors only if they
  currently manage them (previously: only their own stored `instructor`).
- `POST/PATCH /courses` and `/sessions` now accept `instructor` (admins only);
  previously rejected as unknown.
- `submissionCount` / `ungradedCount` go to everyone who manages the
  assignment (admin, parent's instructor, track lead/co-instructor).

## Endpoints

### Auth

| Method  | Endpoint                         | Access    | Description                                                      |
| ------- | -------------------------------- | --------- | ---------------------------------------------------------------- |
| `POST`  | `/v1/users/signup`               | Public    | Register a new account (rate limited: 5 attempts / 15 min)       |
| `POST`  | `/v1/users/login`                | Public    | Authenticate and receive JWT (rate limited: 5 attempts / 15 min); accepts an optional `rememberMe` boolean — see below |
| `POST`  | `/v1/users/logout`               | Protected | Clear auth cookie                                                |
| `POST`  | `/v1/users/forgotPassword`       | Public    | Request password reset email (rate limited: 5 attempts / 15 min) |
| `PATCH` | `/v1/users/resetPassword/:token` | Public    | Reset password with token (rate limited: 5 attempts / 15 min)    |
| `PATCH` | `/v1/users/updateMyPassword`     | Protected | Change current password (invalidates existing tokens)            |

#### `POST /v1/users/login` — `rememberMe`

```json
{
  "email": "user@example.com",
  "password": "password",
  "rememberMe": true
}
```

`rememberMe` is optional and defaults to `false`. It controls both the JWT's `expiresIn` and the `jwt` cookie's `maxAge` for that login — every other cookie/token security setting (`httpOnly`, `secure`, `sameSite`) is unchanged:

| `rememberMe`      | JWT / cookie lifetime |
| ------------------ | ---------------------- |
| `true`              | ~30 days               |
| `false` or omitted | ~1 day                 |

This is separate from the `JWT_EXPIRES_IN`/`JWT_COOKIE_EXPIRES_IN` env vars, which still govern the token issued by signup, password reset, and password update — only `/login` reads `rememberMe`.

### Users

> **Stage 6 (#5.1):** every user returned by `GET /v1/users` (with or without `?includeInactive=true` / `?active=false` / `?fields=`) and by `GET /v1/users/:id` carries an explicit `active` boolean (`false` = deactivated). All of these are admin-only.

| Method   | Endpoint                   | Access    | Description                                                                                                                                                                       |
| -------- | -------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/v1/users/me`             | Protected | Get current user profile, including `pendingTrack`: the `_id` of a track the user has applied to but isn't approved into yet, or `null` if none                                 |
| `PATCH`  | `/v1/users/updateMe`       | Protected | Update profile (name, email, photo, bio; email change resets verification)                                                                                                        |
| `DELETE` | `/v1/users/deleteMe`       | Protected | Soft-delete own account                                                                                                                                                           |
| `GET`    | `/v1/users/me/enrollments` | Protected | Get enrolled track, courses, and sessions                                                                                                                                         |
| `GET`    | `/v1/users`                 | Admin     | List users. Active-only by default; `?search=` matches name/email (case-insensitive), `?active=false` or `?includeInactive=true` surfaces deactivated accounts too                              |
| `POST`   | `/v1/users`                | Admin     | Create user with any role                                                                                                                                                         |
| `GET`    | `/v1/users/:id`            | Admin     | Get user by ID                                                                                                                                                                    |
| `PATCH`  | `/v1/users/:id`            | Admin     | Update user (including role)                                                                                                                                                      |
| `DELETE` | `/v1/users/:id`            | Admin     | Hard-delete user (409 if they're still the required instructor/creator of a Course, Track, Event, Announcement, Session, Assignment, or WeeklyTask — reassign that content first) |
| `POST`   | `/v1/users/bulk`           | Admin     | Bulk activate / deactivate / delete (`userIds`: 1 to 100 IDs per request)                                                                                                                                               |

> **⚠️ Breaking change (bulk user actions are capped):** `POST /v1/users/bulk`
> now accepts at most **100** entries in `userIds`. A request with 101 or more
> returns `400` with the message `You can act on at most 100 users per
> request`. Split larger batches into several requests. Requests with 1 to
> 100 IDs behave exactly as before.

> **⚠️ Breaking change (Q7 — public membership-array reduction):** for any
> caller who isn't a resource's current instructor or an admin, Track,
> Course, and Session responses no longer include the raw `students`
> array (and, for Track, `pendingStudents`/`pendingLeaves`) — those keys
> are simply absent, not emptied. Use `studentCount` (always present) and
> `isEnrolled`/`isPending`/`isPendingLeave` (booleans about the requesting
> user's own status) instead. This applies to every list and detail
> endpoint below except the explicitly self/admin-scoped ones
> (`/pending`, `/leaves`) and the manual
> enroll/remove-student action endpoints, which already required
> authorization to call and are unaffected.

> **⚠️ Breaking changes (Package 2 - carry-over sub-lists):**
> - `GET /courses/instructor/:id` and `GET /courses/track/:id` no longer
>   return the raw `students` array to non-staff (use `studentCount` /
>   `isEnrolled`) and no longer return drafts to non-staff. They now accept
>   an optional token, so staff see the drafts they manage.
> - `GET /courses/student/:id`, `GET /tracks/student/:id` and
>   `GET /sessions/student/:id` hide unpublished content and apply the same
>   redaction (`students`, `pendingStudents`, `pendingLeaves`, `progress`
>   are replaced by `studentCount` / `isEnrolled` / `isPending` /
>   `isPendingLeave`). **Rule:** a student's enrolled-but-since-unpublished
>   content is hidden from lists (like the detail endpoint's 404) unless the
>   caller manages it or is an admin; enrollment never grants visibility.
> - `GET /users/me/enrollments` omits unpublished track/courses/sessions
>   (admins excepted).
> - `GET /tracks/:id/session-catalog` omits draft sessions and returns 404
>   for a draft track.
> - `trackService.getTracksByInstructor` (no route) follows the same rules.

### Tracks

| Method   | Endpoint                                     | Access                                                | Description                                                                                         |
| -------- | -------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `GET`    | `/v1/tracks`                                 | Public                                                | List all tracks (filter, sort, paginate; `?instructor=:userId` = lead or co-instructor). Excludes drafts (`published: false`) you're not authorized for — you only see your own drafts, or all of them as admin. See the Q7 callout below for the `students`/`studentCount`/`isEnrolled` shape |
| `GET`    | `/v1/tracks/popular`                         | Public                                                | Most enrolled tracks, by `studentCount` — never includes `students`/`pendingStudents`/`pendingLeaves` |
| `GET`    | `/v1/tracks/:id`                             | Public                                                | Get track details (404 if unpublished and caller is not owner/admin). `pendingStudents`/`pendingLeaves` only present for the owning instructor/admin — everyone else gets `isPending`/`isPendingLeave` |
| `POST`   | `/v1/tracks`                                 | Admin                                                 | Create track (admin only). `instructor` (lead) and `instructors` (co-instructors) assign it to instructor/admin users |
| `PATCH`  | `/v1/tracks/:id`                             | Admin / Instructor                                    | Update track (admin, lead or co-instructor). `instructor` and `instructors` changes are admin only (dropped for others) |
| `DELETE` | `/v1/tracks/:id`                             | Admin                                                 | Delete track (courses orphaned, sessions become standalone)                                         |
| `GET`    | `/v1/tracks/:id/session-catalog`             | Public                                                | Sessions in this track, stripped to `{ _id, title, description, startDate, duration }` — no media/URLs. Published sessions of a published track only (404 for a draft track) |
| `GET`    | `/v1/tracks/student/:studentId`              | Self / Admin                                          | Track a student is enrolled in (returns array). Unpublished tracks are hidden; redacted like `GET /tracks` |
| `GET`    | `/v1/tracks/:id/analytics`                   | Admin / track lead / co-instructor                    | Track stats                                                                                         |
| `GET`    | `/v1/tracks/:id/pending`                     | Admin / Instructor                                    | Pending enrollment requests (`pendingStudents`) *and* pending leave requests (`pendingLeaves`), in one call (owning instructor or admin only) |
| `POST`   | `/v1/tracks/:id/enroll-me`                   | Protected                                             | Self-enroll (pending approval; rejected if already in another track; rate limited)                  |
| `POST`   | `/v1/tracks/:id/students`                    | Admin / Instructor                                    | Manually enroll student                                                                             |
| `DELETE` | `/v1/tracks/:id/students/:studentId`         | Admin / Instructor                                    | Remove student from track                                                                           |
| `POST`   | `/v1/tracks/:id/students/:studentId/approve` | Admin / Instructor                                    | Approve enrollment request (self-approval blocked; owning instructor or admin only)                 |
| `POST`   | `/v1/tracks/:id/students/:studentId/reject`  | Admin / Instructor                                    | Reject enrollment request (owning instructor or admin only)                                         |
| `POST`   | `/v1/tracks/:id/leave-me`                    | Protected                                             | Request to leave track (rate limited)                                                               |
| `GET`    | `/v1/tracks/:id/leaves`                      | Admin / track lead / co-instructor                    | View pending leave requests                                                                         |
| `POST`   | `/v1/tracks/:id/leaves/:studentId/approve`   | Admin / Instructor                                    | Approve leave request (self-approval blocked; owning instructor or admin only)                      |
| `POST`   | `/v1/tracks/:id/leaves/:studentId/reject`    | Admin / Instructor                                    | Reject leave request (owning instructor or admin only)                                              |
| `PATCH`  | `/v1/tracks/:trackId/courses/:courseId`      | Admin / Instructor                                    | Add course to track. Keeps `Track.courses` and `Course.track` in sync; safe to repeat — a half-linked course is repaired (200), a fully linked one is 400 |
| `DELETE` | `/v1/tracks/:trackId/courses/:courseId`      | Admin / Instructor                                    | Remove course from track                                                                            |
| `PATCH`  | `/v1/tracks/:trackId/sessions/:sessionId`    | Admin / Instructor                                    | Add session to track. Keeps `Track.sessions` and `Session.tracks` in sync; safe to repeat — a half-linked session is repaired (200), a fully linked one is 400 |
| `DELETE` | `/v1/tracks/:trackId/sessions/:sessionId`    | Admin / Instructor                                    | Remove session from track                                                                           |
| `POST`   | `/v1/tracks/:id/reviews`                     | Protected (enrolled student)                          | Submit a rating + review for a track (one per student). Response's `user` is populated (`_id`, `name`, `photo`) |
| `GET`    | `/v1/tracks/:id/reviews`                     | Public                                                | List reviews for a track (paginated)                                                                |
| `DELETE` | `/v1/tracks/:id/reviews/:reviewId`           | Author / Admin                                        | Delete a track review (review's own author, or admin bypass)                                        |
| `GET`    | `/v1/tracks/:id/assignments`                 | Protected (enrolled student / any instructor / admin) | All assignments across every course + standalone session in the track, with `mySubmission` attached; staff also get `submissionCount` / `ungradedCount` |
| `GET`    | `/v1/tracks/:id/weekly-tasks`                | Protected (enrolled student / any instructor / admin) | All weekly task buckets across every course in the track, with per-item `done` flags                |

### Courses

| Method   | Endpoint                                    | Access                                                | Description                                                                                  |
| -------- | ------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `GET`    | `/v1/courses`                               | Public                                                | List all courses (filter, sort, paginate). Excludes drafts (`published: false`) you're not authorized for — same rule as `/v1/tracks` |
| `GET`    | `/v1/courses/:id`                           | Public                                                | Get course details (404 if unpublished and caller is not owner/admin)                        |
| `POST`   | `/v1/courses`                               | Admin / Instructor                                    | Create course. Optional `track` attaches it immediately — requester must own that track (or be admin); keeps `Track.courses` in sync |
| `PATCH`  | `/v1/courses/:id`                           | Admin / Instructor                                    | Update course (owner only; admin bypass). `track` can be reassigned or set to `null` to detach — each side requires owning that track (or admin), and detaching enforces the same "track needs ≥1 course or session" rule `DELETE /tracks/:id/courses/:courseId` has |
| `DELETE` | `/v1/courses/:id`                           | Admin / Instructor                                    | Delete course (sessions become standalone; owner only; admin bypass)                         |
| `GET`    | `/v1/courses/instructor/:instructorId`      | Public                                                | Courses by instructor. Published only for the public; staff also get drafts they manage; admins all. Non-staff get `studentCount`/`isEnrolled` instead of `students` |
| `GET`    | `/v1/courses/track/:trackId`                | Public                                                | Courses in a track. Same draft filter + redaction as the row above                           |
| `GET`    | `/v1/courses/student/:studentId`            | Self / Admin                                          | Courses a student is enrolled in. Unpublished courses are hidden (admins and managers excepted); `isEnrolled` instead of `students` |
| `POST`   | `/v1/courses/:id/enroll-me`                 | Protected                                             | Self-enroll (prerequisites + access rules enforced: public/track-only/private; rate limited) |
| `DELETE` | `/v1/courses/:id/leave-me`                  | Protected                                             | Leave course (rate limited)                                                                  |
| `POST`   | `/v1/courses/:id/students`                  | Admin / Instructor                                    | Manually enroll student                                                                      |
| `DELETE` | `/v1/courses/:id/students/:studentId`       | Admin / Instructor                                    | Remove student from course                                                                   |
| `PATCH`  | `/v1/courses/:courseId/sessions/:sessionId` | Admin / Instructor                                    | Add session to course                                                                        |
| `DELETE` | `/v1/courses/:courseId/sessions/:sessionId` | Admin / Instructor                                    | Remove session from course                                                                   |
| `POST`   | `/v1/courses/:id/reviews`                   | Protected (enrolled student)                          | Submit a rating + review for a course (one per student). Response's `user` is populated (`_id`, `name`, `photo`) |
| `GET`    | `/v1/courses/:id/reviews`                   | Public                                                | List reviews for a course (paginated)                                                        |
| `DELETE` | `/v1/courses/:id/reviews/:reviewId`         | Author / Admin                                        | Delete a course review (review's own author, or admin bypass)                                |
| `POST`   | `/v1/courses/:id/assignments`               | Admin / owner instructor                              | Create an assignment for this course                                                         |
| `GET`    | `/v1/courses/:id/assignments`               | Protected (enrolled student / any instructor / admin) | Assignments for this course, with `mySubmission` attached; staff (admin / the assignment's instructor) also get `submissionCount` + `ungradedCount` |
| `POST`   | `/v1/courses/:id/weekly-tasks`              | Admin / owner instructor                              | Create a weekly task bucket for a course (one per week number)                               |
| `GET`    | `/v1/courses/:id/weekly-tasks`              | Protected (enrolled student / any instructor / admin) | Weekly task buckets for this course, with per-item `done` flags                              |

### Sessions

| Method   | Endpoint                                | Access                                                | Description                                                                     |
| -------- | --------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| `GET`    | `/v1/sessions`                          | Protected                                             | List all sessions. Excludes drafts you're not authorized for (same rule as tracks/courses); `url`/`embedUrl`/`resources`/`progress` omitted in list view unless you're the owner/admin/enrolled |
| `GET`    | `/v1/sessions/:id`                      | Protected                                             | Get session details — **404 if the session is a draft and you're not its owner or an admin** (not content-redacted, invisible); `url`/`embedUrl`/`resources` stripped if not enrolled; enrolled callers also get `myProgress: { status, watchedAt }` |
| `POST`   | `/v1/sessions`                          | Admin / Instructor                                    | Create session                                                                  |
| `PATCH`  | `/v1/sessions/:id`                      | Admin / Instructor                                    | Update session (owner only; admin bypass)                                       |
| `DELETE` | `/v1/sessions/:id`                      | Admin / Instructor                                    | Delete session (owner only; admin bypass)                                       |
| `GET`    | `/v1/sessions/instructor/:instructorId` | Protected                                             | Sessions by instructor. Same draft-exclusion + field redaction as `GET /v1/sessions` |
| `GET`    | `/v1/sessions/track/:trackId`           | Protected                                             | Sessions in a track. Same draft-exclusion + field redaction as `GET /v1/sessions` |
| `GET`    | `/v1/sessions/student/:studentId`       | Self / Admin                                          | Sessions a student is enrolled in. Unpublished sessions are hidden; `students`/`progress` replaced by `isEnrolled`/`studentCount` |
| `POST`   | `/v1/sessions/:id/enroll-me`            | Protected                                             | Self-enroll in session (track-only/private access rules enforced; rate limited) |
| `DELETE` | `/v1/sessions/:id/leave-me`             | Protected                                             | Leave session (rate limited)                                                    |
| `PUT`    | `/v1/sessions/:id/progress`             | Protected (enrolled student)                          | Mark the session as watched for the current user (`{ "status": "watched" }`)     |
| `POST`   | `/v1/sessions/:id/students`             | Admin / Instructor                                    | Manually enroll student                                                         |
| `DELETE` | `/v1/sessions/:id/students/:studentId`  | Admin / Instructor                                    | Remove student from session                                                     |
| `POST`   | `/v1/sessions/:id/reviews`              | Protected (enrolled student)                          | Submit a rating + review for a session (one per student). Response's `user` is populated (`_id`, `name`, `photo`) |
| `GET`    | `/v1/sessions/:id/reviews`              | Public                                                | List reviews for a session (paginated)                                          |
| `DELETE` | `/v1/sessions/:id/reviews/:reviewId`    | Author / Admin                                        | Delete a session review (review's own author, or admin bypass)                  |
| `POST`   | `/v1/sessions/:id/assignments`          | Admin / owner instructor                              | Create an assignment for this standalone session                                |
| `GET`    | `/v1/sessions/:id/assignments`          | Protected (enrolled student / any instructor / admin) | Assignments for this standalone session, with `mySubmission` attached; staff (admin / the assignment's instructor) also get `submissionCount` + `ungradedCount` |

### Events

| Method   | Endpoint               | Access             | Description                             |
| -------- | ---------------------- | ------------------ | --------------------------------------- |
| `GET`    | `/v1/events`           | Public             | List all events                         |
| `GET`    | `/v1/events/my-events` | Protected          | Events the current user RSVP'd to       |
| `GET`    | `/v1/events/:id`       | Public             | Get event details                       |
| `POST`   | `/v1/events`           | Admin / Instructor | Create event                            |
| `PATCH`  | `/v1/events/:id`       | Admin / Instructor | Update event (owner only; admin bypass) |
| `DELETE` | `/v1/events/:id`       | Admin / Instructor | Delete event (owner only; admin bypass) |
| `POST`   | `/v1/events/:id/rsvp`  | Protected          | RSVP to event (rate limited)            |
| `DELETE` | `/v1/events/:id/rsvp`  | Protected          | Cancel RSVP (rate limited)              |

### Announcements

| Method   | Endpoint                | Access             | Description                                      |
| -------- | ----------------------- | ------------------ | ------------------------------------------------ |
| `GET`    | `/v1/announcements`     | Public             | List all announcements, pinned first then newest |
| `GET`    | `/v1/announcements/:id` | Public             | Get single announcement                          |
| `POST`   | `/v1/announcements`     | Admin / Instructor | Create announcement                              |
| `PATCH`  | `/v1/announcements/:id` | Admin / Instructor | Update announcement (owner only; admin bypass)   |
| `DELETE` | `/v1/announcements/:id` | Admin / Instructor | Delete announcement (owner only; admin bypass)   |

### Contact

| Method  | Endpoint          | Access | Description                                                                            |
| ------- | ----------------- | ------ | -------------------------------------------------------------------------------------- |
| `POST`  | `/v1/contact`     | Public | Submit the contact us form (stores submission + notifies admin by email; rate limited) |
| `GET`   | `/v1/contact`     | Admin  | List all contact submissions (filter, sort, paginate)                                  |
| `GET`   | `/v1/contact/:id` | Admin  | Get a single contact submission                                                        |
| `PATCH` | `/v1/contact/:id` | Admin  | Update a submission's status (`new` / `read` / `archived`)                             |

### Weekly Tasks

Creation and listing live under `/v1/courses/:id/weekly-tasks` and `/v1/tracks/:id/weekly-tasks` (see above). These are the standalone, top-level actions keyed by the task's own ID.

Every weekly task now also carries `createdBy`, same rule as Assignments above: set once to the caller on creation, pure historical attribution, not client-settable, never used for authorization (`instructor` still is), may be absent on records predating this field.

| Method   | Endpoint                                          | Access                       | Description                                                                                               |
| -------- | ------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| `DELETE` | `/v1/weekly-tasks/:taskId`                        | Admin / owner instructor     | Delete a weekly task bucket                                                                               |
| `PATCH`  | `/v1/weekly-tasks/:taskId`                        | Admin / owner instructor     | Update week/title/items (items with an existing `_id` are edited in place, preserving completion history) |
| `POST`   | `/v1/weekly-tasks/:taskId/items/:itemId/complete` | Protected (enrolled student) | Mark an item as completed (idempotent)                                                                    |
| `DELETE` | `/v1/weekly-tasks/:taskId/items/:itemId/complete` | Protected (enrolled student) | Unmark an item as completed (idempotent)                                                                  |

### Assignments

> **Additive change (Stage 5, #3.2):** `GET /v1/tracks/:id/assignments`, `GET /v1/courses/:id/assignments` and `GET /v1/sessions/:id/assignments` now add `submissionCount` (students who have submitted) and `ungradedCount` (of those, how many have no grade yet — a grade of `0` counts as graded) to each assignment **for staff of that assignment only** (an admin, or the assignment's own `instructor`). Students, and instructors who don't manage the assignment, never receive these two keys. They are counts only — the raw `submissions` array is still never sent on a list endpoint. No existing field changed.
>
> **Submissions are links, not uploads (Stage 5, #3.1 / Decisions Q1):** `POST /v1/assignments/:id/submissions` takes JSON `{ "file": "<https link>" }`. `multipart/form-data` uploads are **not supported** and get a 400 that says so. The link must be HTTPS and on a trusted host — the 400 message now lists every allowed host, and the same list is served at `GET /v1/config/trusted-hosts`. Real uploads may be added later as an optional enhancement; links stay as the free fallback.

Creation lives under `/v1/courses/:id/assignments` and `/v1/sessions/:id/assignments` (see above — an assignment belongs to exactly one course or standalone session, never a track directly). These are the standalone, top-level actions keyed by the assignment's own ID.

Every assignment now also carries `createdBy` — set once, to the caller, on creation. It's pure historical attribution: not accepted from the request body (rejected outright, 400, if you try), and never used to decide who can manage the assignment — that's still `instructor`. May be absent on records created before this field existed and not yet backfilled (`scripts/backfillCreatedBy.js`).

| Method   | Endpoint                                           | Access                       | Description                                                             |
| -------- | -------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------- |
| `GET`    | `/v1/assignments/:id`                              | Admin / owner instructor     | Single assignment with its submissions. Each submission's `file` is stripped in favor of a `hasFile` boolean — use the file endpoint below to actually open it |
| `PATCH`  | `/v1/assignments/:id`                              | Admin / owner instructor     | Update an assignment's title, description, deadline, and/or attachments |
| `DELETE` | `/v1/assignments/:id`                              | Admin / owner instructor     | Delete an assignment (and its submissions with it)                      |
| `POST`   | `/v1/assignments/:id/submissions`                  | Protected (enrolled student) | Submit or resubmit your work as a **link**: JSON `{ "file": "<https link>" }` (file uploads / multipart are **not** supported; allowed hosts: `GET /v1/config/trusted-hosts`). Resubmitting clears any existing grade and feedback |
| `GET`    | `/v1/assignments/:id/submissions/:studentId/file`  | Admin / owner instructor     | Redirects (302) to the student's submitted file — the only path that ever exposes the raw URL |
| `PATCH`  | `/v1/assignments/:id/submissions/:studentId/grade` | Admin / owner instructor     | Grade a student's submission (0–100), with optional `feedback` (up to 2000 characters) |

### Activity Logs

Audit trail of user actions. There is deliberately **no `POST` endpoint** — entries are written server-side only, as a side effect of other actions (signup, login, enrollment, profile updates, admin bulk actions), never accepted directly from a client. Everything below requires authentication; only `/me` is available to a non-admin.

| Method   | Endpoint                            | Access    | Description                                                                                             |
| -------- | ----------------------------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| `GET`    | `/v1/activity-logs/me`              | Protected | The caller's own activity timeline, newest first                                                        |
| `GET`    | `/v1/activity-logs`                 | Admin     | List all activity logs (filter/sort/paginate; e.g. `?action=login`, `?createdAt[gte]=2025-01-01`)       |
| `GET`    | `/v1/activity-logs/summary`         | Admin     | Aggregated stats: total count, breakdown by action, top 5 most active users (`?from`, `?to`, `?action`) |
| `GET`    | `/v1/activity-logs/user/:userId`    | Admin     | A specific user's activity timeline                                                                     |
| `GET`    | `/v1/activity-logs/:id`             | Admin     | Get a single activity log entry                                                                         |
| `DELETE` | `/v1/activity-logs/:id`             | Admin     | Delete a single activity log entry (rare — audit trails are normally append-only)                       |
| `DELETE` | `/v1/activity-logs?olderThanDays=N` | Admin     | Bulk-delete logs older than N days (retention cleanup; `N` must be ≥ 30)                                |

### Dashboard Stats

Admin-only platform analytics. `live` is computed on the fly and never persisted; everything else reads from or writes to stored, point-in-time snapshots (one per `period` + `date`, upserted rather than duplicated on re-generation).

> **Scheduled snapshots (Stage 6, #5.2):** the scheduled job stores the period that just _finished_ (yesterday / last Monday–Sunday week / last calendar month), dated by that period's start. A row dated today therefore only appears after today has ended; use `/live` for the day in progress. `POST /snapshot` with no `date` still snapshots the period containing now, as before.

| Method   | Endpoint                              | Access | Description                                                                                      |
| -------- | ------------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| `GET`    | `/v1/dashboard-stats/live`            | Admin  | Current stats, computed on demand (not persisted); `newUsers` covers the last 24 hours           |
| `POST`   | `/v1/dashboard-stats/snapshot`        | Admin  | Generate/refresh a snapshot on demand (body: `{ period, date? }`) — upserts in place             |
| `GET`    | `/v1/dashboard-stats/latest`          | Admin  | Most recently generated stored snapshot for a period (`?period=daily`)                           |
| `GET`    | `/v1/dashboard-stats/trends`          | Admin  | Last N snapshots for a period, oldest first — ready for a trend chart (`?period=daily&limit=30`) |
| `GET`    | `/v1/dashboard-stats`                 | Admin  | List stored snapshots (filter/sort/paginate; e.g. `?period=weekly`)                              |
| `GET`    | `/v1/dashboard-stats/:id`             | Admin  | Get a single snapshot                                                                            |
| `DELETE` | `/v1/dashboard-stats/:id`             | Admin  | Delete a single snapshot                                                                         |
| `DELETE` | `/v1/dashboard-stats?olderThanDays=N` | Admin  | Bulk-delete snapshots older than N days (retention cleanup; `N` must be ≥ 30)                    |

> `avgCompletionRate` in a snapshot = average, across all assignments, of (submissions ÷ that assignment's course/session roster size) as a percentage. Roster size is always the _current_ roster (MongoDB doesn't retain historical rosters), so this is most accurate for the latest snapshot and only approximate for older ones.

> `mostActiveTrack` is `{ _id, title }` (or `null`) everywhere it appears — including `/live`, which previously returned a bare ObjectId while every stored-snapshot endpoint already populated it.

### Config

| Method | Endpoint                    | Access | Description                                                                                     |
| ------ | ---------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| `GET`  | `/v1/config/trusted-hosts`  | Public | The exact hostname allowlist every session/resource/attachment/submission URL is validated against (`src/utils/trustedHosts.js`) — includes YouTube, Google Drive, GitHub, Cloudinary, Imgur, Dropbox, Discord CDN, etc. Use this to warn about an untrusted host client-side before submitting. |

### Feed & Health

| Method | Endpoint     | Access | Description                               |
| ------ | ------------ | ------ | ----------------------------------------- |
| `GET`  | `/v1/feed`   | Public | Dashboard feed (pinned + upcoming events) |
| `GET`  | `/health`    | Public | Server & database health check            |
| `GET`  | `/v1/health` | Public | Health check (Swagger consistency)        |

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

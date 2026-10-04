/**
 * @swagger
 * tags:
 *   - name: Courses
 *     description: Course management within tracks and student enrollment
 */

/**
 * @swagger
 * /courses:
 *   post:
 *     operationId: createCourse
 *     summary: Create a new course
 *     description: Create a new course within a track (admin and instructors only). Instructor is auto-assigned from auth token; an admin may set `instructor` (an active user with role instructor or admin, else 400) to create the course on that instructor's behalf. For anyone else the field is ignored. `track` may be set by an admin, or by an instructor who currently leads or co-instructs that track.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CourseCreate'
 *           example:
 *             title: "Advanced React Patterns"
 *             description: "Master advanced React patterns including HOCs, render props, and custom hooks"
 *             track: "507f1f77bcf86cd799439021"
 *             level: "intermediate"
 *             coverImage: "react-patterns-cover.jpg"
 *             published: true
 *             prerequisites: ["507f1f77bcf86cd799439042"]
 *             duration: 12
 *             syllabus:
 *               - title: "Week 1: Higher-Order Components"
 *                 description: "Understanding HOC patterns and composition"
 *     responses:
 *       201:
 *         description: Course created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: Course title already exists
 *
 *   get:
 *     security: []
 *     operationId: getAllCourses
 *     summary: Get all courses
 *     description: |
 *       Retrieve all courses with filtering and pagination.
 *       **Filter examples:**
 *       `?level=intermediate`, `?track=507f...`, `?duration[gte]=10`.
 *     tags: [Courses]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *       - name: level
 *         in: query
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *       - name: published
 *         in: query
 *         schema:
 *           type: boolean
 *       - name: track
 *         in: query
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
 *       - name: sort
 *         in: query
 *         schema:
 *           type: string
 *           example: "-createdAt"
 *       - name: search
 *         in: query
 *         schema: { type: string }
 *         description: Full-text search across title and description
 *         example: react
 *     responses:
 *       200:
 *         description: List of courses retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CoursesResponse'
 */

/**
 * @swagger
 * /courses/{id}:
 *   get:
 *     security: []
 *     operationId: getCourseById
 *     summary: Get a specific course by ID
 *     description: |
 *       Retrieve detailed information about a course.
 *       Returns 404 if the course is unpublished and the caller is neither
 *       the instructor nor an admin.
 *     tags: [Courses]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439041"
 *     responses:
 *       200:
 *         description: Course details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     operationId: updateCourseById
 *     summary: Update a course
 *     description: Update course information (admin and instructors only). Only an admin can change `instructor` (an active instructor or admin, else 400; reassignment takes effect immediately; non-admins' `instructor` is ignored). Allowed for the course's current instructor, a lead/co-instructor of its track, or an admin. Changing `track` also requires being lead/co-instructor of the track involved.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439041"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CourseUpdate'
 *           example:
 *             title: "Updated React Course"
 *             description: "Completely revised curriculum"
 *             level: "advanced"
 *             published: false
 *     responses:
 *       200:
 *         description: Course updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     operationId: deleteCourseById
 *     summary: Delete a course
 *     description: Permanently delete a course (admin and instructors only). Instructors can only delete courses they currently manage (they are its instructor, or lead/co-instructor of its track).
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439041"
 *     responses:
 *       204:
 *         description: Course deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /courses/{courseId}/sessions/{sessionId}:
 *   patch:
 *     operationId: addSessionToCourse
 *     summary: Add a session to a course
 *     description: Associate a session with a course (admin and instructors only). Session can be standalone or from any track.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439041"
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439031"
 *     responses:
 *       200:
 *         description: Session added to course successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseResponse'
 *       400:
 *         description: Session already in course or belongs to different track
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Course or session not found
 *
 *   delete:
 *     operationId: removeSessionFromCourse
 *     summary: Remove a session from a course
 *     description: Remove session association from a course (admin and instructors only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439041"
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439031"
 *     responses:
 *       200:
 *         description: Session removed from course successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseResponse'
 *       400:
 *         description: Session not found in course
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Course or session not found
 */

/**
 * @swagger
 * /courses/{id}/students:
 *   post:
 *     operationId: addStudentToCourse
 *     summary: Enroll a student in a course
 *     description: Enroll a student in a course (admin and instructors only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439041"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *             properties:
 *               studentId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Student enrolled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseResponse'
 *       400:
 *         description: Student already enrolled
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Course not found
 */

/**
 * @swagger
 * /courses/{id}/students/{studentId}:
 *   delete:
 *     operationId: removeStudentFromCourse
 *     summary: Remove a student from a course
 *     description: Unenroll a student from a course (admin and instructors only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439041"
 *       - name: studentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Student removed from course successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseResponse'
 *       400:
 *         description: Student is not enrolled in this course
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Course or student not found
 */

/**
 * @swagger
 * /courses/instructor/{instructorId}:
 *   get:
 *     security: []
 *     operationId: getCoursesByInstructor
 *     summary: Get courses by instructor
 *     description: Retrieve all courses taught by a specific instructor. Published only for the public; staff who manage a draft (and admins) also get it. Non-staff get `studentCount`/`isEnrolled` instead of `students`. An optional bearer token is honoured.
 *     tags: [Courses]
 *     parameters:
 *       - name: instructorId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of courses retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CoursesResponse'
 *       404:
 *         description: Instructor not found
 */

/**
 * @swagger
 * /courses/track/{trackId}:
 *   get:
 *     security: []
 *     operationId: getCoursesByTrack
 *     summary: Get courses by track
 *     description: Retrieve all courses within a specific track. Published only for the public; staff who manage a draft (and admins) also get it. Non-staff get `studentCount`/`isEnrolled` instead of `students`. An optional bearer token is honoured.
 *     tags: [Courses]
 *     parameters:
 *       - name: trackId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of courses retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CoursesResponse'
 *       404:
 *         description: Track not found
 */

/**
 * @swagger
 * /courses/student/{studentId}:
 *   get:
 *     operationId: getCoursesByStudent
 *     summary: Get courses by student enrollment
 *     description: Returns courses a student is enrolled in. Admin can view any student; students can only view themselves. A course that was unpublished after enrolling is hidden unless the caller manages it or is an admin; non-staff get `isEnrolled` instead of `students`.
 *     tags: [Courses]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: studentId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of courses
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CoursesResponse'
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */

/**
 * @swagger
 * /courses/{id}/enroll-me:
 *   post:
 *     operationId: enrollMeInCourse
 *     summary: Self-enroll in a course
 *     description: |
 *       Enroll the current user in a course.
 *       Prerequisites and access rules (track-only/private) are enforced.
 *     tags: [Courses]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Enrolled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseResponse'
 *       400: { description: Already enrolled or prerequisites not met }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { description: Track-only course without track membership }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 * /courses/{id}/leave-me:
 *   delete:
 *     operationId: leaveMeFromCourse
 *     summary: Leave a course
 *     tags: [Courses]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Left successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseResponse'
 *       400: { description: Not enrolled }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

/**
 * @swagger
 * /courses/{id}/weekly-tasks:
 *   post:
 *     operationId: createWeeklyTask
 *     summary: Create a weekly task bucket for a course
 *     description: Admin, the course's current instructor, or a lead/co-instructor of its track. One bucket per week number per course. The task's `instructor` is set to the course's current instructor; `createdBy` is the caller.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, example: "507f1f77bcf86cd799439041" }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [week, title, items]
 *             properties:
 *               week: { type: integer, example: 1 }
 *               title: { type: string, example: "Week 1: Networking Basics" }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [title]
 *                   properties:
 *                     title: { type: string, example: "Read Chapter 1" }
 *                     type:
 *                       type: string
 *                       enum: [reading, quiz, video, assignment, other]
 *                       example: reading
 *     responses:
 *       201:
 *         description: Weekly task created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     task:
 *                       $ref: '#/components/schemas/WeeklyTask'
 *       400:
 *         description: Week already exists for this course / validation error
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 *   get:
 *     operationId: getCourseWeeklyTasks
 *     summary: Get all weekly tasks for a course
 *     description: >
 *       Each item includes a `done` flag computed for the requesting user.
 *       Accessible to admins, any instructor, or a student enrolled in the course.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, example: "507f1f77bcf86cd799439041" }
 *     responses:
 *       200:
 *         description: List of weekly tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 results: { type: integer, example: 4 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     tasks:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/WeeklyTask'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Only enrolled students can view this course's weekly tasks
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /courses/{id}/assignments:
 *   post:
 *     operationId: createCourseAssignment
 *     summary: Create an assignment for a course
 *     description: Admin, the course's current instructor, or a lead/co-instructor of its track. The assignment's `instructor` is set to the course's current instructor; `createdBy` is the caller.
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439041"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignmentCreate'
 *     responses:
 *       201:
 *         description: Assignment created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     assignment:
 *                       $ref: '#/components/schemas/Assignment'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /courses/{id}/assignments:
 *   get:
 *     operationId: getCourseAssignments
 *     summary: Get all assignments for a course
 *     description: >
 *       Each assignment includes `mySubmission` — the requesting user's own
 *       submission, or null if they haven't submitted. Accessible to admins,
 *       any instructor, or a student enrolled in the course. Everyone who can
 *       manage the assignment (an admin, the parent's current instructor, or
 *       a lead/co-instructor of its track) also gets `submissionCount` and
 *       `ungradedCount` on each assignment (counts only - never other
 *       students' files or grades).
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439041"
 *     responses:
 *       200:
 *         description: List of assignments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 results: { type: integer, example: 2 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     assignments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Assignment'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Only enrolled students can view this course's assignments
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /courses/{id}/reviews:
 *   post:
 *     operationId: createCourseReview
 *     summary: Submit a review for a course
 *     description: Only students currently enrolled in the course may review it (one review per student per course).
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439041"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating, content]
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               content:
 *                 type: string
 *                 example: "Really solid course, learned a lot."
 *     responses:
 *       201:
 *         description: Review created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     review:
 *                       $ref: '#/components/schemas/Review'
 *       400:
 *         description: Already reviewed / validation error
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Only enrolled students can review
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 *   get:
 *     security: []
 *     operationId: getCourseReviews
 *     summary: Get reviews for a course
 *     description: Public endpoint. Supports the standard pagination query params.
 *     tags: [Reviews]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439041"
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: List of reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 results: { type: integer, example: 5 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     reviews:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Review'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /courses/{id}/reviews/{reviewId}:
 *   delete:
 *     operationId: deleteCourseReview
 *     summary: Delete a course review
 *     description: The review's own author, or an admin, may delete it.
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, example: "507f1f77bcf86cd799439041" }
 *       - name: reviewId
 *         in: path
 *         required: true
 *         schema: { type: string, example: "6713b5ac12ef4567890a8888" }
 *     responses:
 *       204: { description: Deleted successfully }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

const express = require('express');
const AppError = require('../../utils/AppError');
const reviewRouter = require('./review.route');
const resourceAssignmentRouter = require('./resourceAssignment.route');
const weeklyTaskRouter = require('./weeklyTask.route');
const courseController = require('../../controllers/course.controller');
const {
  protect,
  restrictTo,
  requireManage,
  optionalAuth,
} = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const {
  createCourseSchema,
  getCourseSchema,
  updateCourseSchema,
  deleteCourseSchema,
  manageSessionSchema,
  addStudentSchema,
  studentIdSchema,
} = require('../../validations/course.validation');
const { authLimiter } = require('../../middlewares/rateLimit.middleware');

const router = express.Router();

// ===================================================================
// 📚 MAIN COURSE ROUTES
// ===================================================================

router
  .route('/')
  .post(
    protect,
    restrictTo('admin', 'instructor'),
    validate(createCourseSchema),
    courseController.createCourse,
  )
  .get(optionalAuth, courseController.getAllCourses);

// ===================================================================
// 🔍 FILTERING ROUTES
// ===================================================================

router.get(
  '/instructor/:instructorId',
  optionalAuth,
  courseController.getCoursesByInstructor,
);

router.get('/track/:trackId', optionalAuth, courseController.getCoursesByTrack);

router.get(
  '/student/:studentId',
  protect,
  (req, res, next) => {
    if (req.user.role !== 'admin' && req.params.studentId !== req.user.id) {
      return next(new AppError('You can only view your own enrollments', 403));
    }
    next();
  },
  courseController.getCoursesByStudent,
);

router.post('/:id/enroll-me', authLimiter, protect, courseController.enrollMe);

router.delete('/:id/leave-me', authLimiter, protect, courseController.leaveMe);

router
  .route('/:id')
  .get(
    optionalAuth,
    validate(getCourseSchema, 'params'),
    courseController.getCourse,
  )
  .patch(
    protect,
    restrictTo('admin', 'instructor'),
    validate(getCourseSchema, 'params'),
    requireManage({ resource: 'course' }),
    validate(updateCourseSchema),
    courseController.updateCourse,
  )
  .delete(
    protect,
    restrictTo('admin', 'instructor'),
    validate(deleteCourseSchema, 'params'),
    requireManage({ resource: 'course' }),
    courseController.deleteCourse,
  );

// ===================================================================
// 🔗 SESSION MANAGEMENT ROUTES
// ===================================================================

router
  .route('/:courseId/sessions/:sessionId')
  .patch(
    protect,
    restrictTo('admin', 'instructor'),
    validate(manageSessionSchema, 'params'),
    requireManage({ resource: 'course', paramName: 'courseId' }),
    courseController.addSessionToCourse,
  )
  .delete(
    protect,
    restrictTo('admin', 'instructor'),
    validate(manageSessionSchema, 'params'),
    requireManage({ resource: 'course', paramName: 'courseId' }),
    courseController.removeSessionFromCourse,
  );

// ===================================================================
// 👥 STUDENT ENROLLMENT ROUTES
// ===================================================================

router
  .route('/:id/students')
  .post(
    protect,
    restrictTo('admin', 'instructor'),
    validate(getCourseSchema, 'params'),
    requireManage({ resource: 'course' }),
    validate(addStudentSchema),
    courseController.addStudent,
  );

router
  .route('/:id/students/:studentId')
  .delete(
    protect,
    restrictTo('admin', 'instructor'),
    validate(getCourseSchema, 'params'),
    validate(studentIdSchema, 'params'),
    requireManage({ resource: 'course' }),
    courseController.removeStudent,
  );

router.use('/:id/reviews', reviewRouter('course'));
router.use('/:id/assignments', resourceAssignmentRouter('course'));
router.use('/:id/weekly-tasks', weeklyTaskRouter);

module.exports = router;

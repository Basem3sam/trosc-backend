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
 *     description: Create a new course within a track (admin and instructors only). Instructor is auto-assigned from auth token.
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
 *     operationId: getAllCourses
 *     summary: Get all courses
 *     description: Retrieve all courses with filtering and pagination
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
 *     operationId: getCourseById
 *     summary: Get a specific course by ID
 *     description: Retrieve detailed information about a course
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
 *     description: Update course information (admin and instructors only). Cannot change instructor.
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
 *     description: Permanently delete a course (admin only)
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
 *     operationId: getCoursesByInstructor
 *     summary: Get courses by instructor
 *     description: Retrieve all courses taught by a specific instructor
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
 *     operationId: getCoursesByTrack
 *     summary: Get courses by track
 *     description: Retrieve all courses within a specific track
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

const express = require('express');
const courseController = require('../controllers/course.controller');
const {
  protect,
  restrictTo,
  checkOwnership,
} = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createCourseSchema,
  getCourseSchema,
  updateCourseSchema,
  deleteCourseSchema,
  manageSessionSchema,
  addStudentSchema,
  studentIdSchema,
} = require('../validations/course.validation');

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
  .get(courseController.getAllCourses);

// ===================================================================
// 🔍 FILTERING ROUTES
// ===================================================================

router.get(
  '/instructor/:instructorId',
  courseController.getCoursesByInstructor,
);

router.get('/track/:trackId', courseController.getCoursesByTrack);

router.get('/student/:studentId', courseController.getCoursesByStudent);

router
  .route('/:id')
  .get(validate(getCourseSchema, 'params'), courseController.getCourse)
  .patch(
    protect,
    restrictTo('admin', 'instructor'),
    checkOwnership({
      model: 'Course',
      ownerField: 'instructor',
      paramName: 'id',
    }),
    validate(getCourseSchema, 'params'),
    validate(updateCourseSchema),
    courseController.updateCourse,
  )
  .delete(
    protect,
    restrictTo('admin', 'instructor'),
    checkOwnership({
      model: 'Course',
      ownerField: 'instructor',
      paramName: 'id',
    }),
    validate(deleteCourseSchema, 'params'),
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
    checkOwnership({
      model: 'Course',
      ownerField: 'instructor',
      paramName: 'courseId',
    }),
    validate(manageSessionSchema, 'params'),
    courseController.addSessionToCourse,
  )
  .delete(
    protect,
    restrictTo('admin', 'instructor'),
    checkOwnership({
      model: 'Course',
      ownerField: 'instructor',
      paramName: 'courseId',
    }),
    validate(manageSessionSchema, 'params'),
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
    validate(addStudentSchema),
    courseController.addStudent,
  );

router.route('/:id/students/:studentId').delete(
  protect,
  restrictTo('admin', 'instructor'),
  checkOwnership({
    model: 'Course',
    ownerField: 'instructor',
    paramName: 'id',
  }),
  validate(getCourseSchema, 'params'),
  validate(studentIdSchema, 'params'),
  courseController.removeStudent,
);

module.exports = router;

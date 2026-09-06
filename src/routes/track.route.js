/**
 * @swagger
 * tags:
 *   - name: Tracks
 *     description: Learning track management and session organization
 */

/**
 * @swagger
 * /tracks:
 *   post:
 *     operationId: createTrack
 *     summary: Create a new learning track
 *     description: |
 *       Create a new learning track (admin and instructors only).
 *       Instructor is auto-assigned from the auth token.
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TrackCreate'
 *           example:
 *             title: "Advanced JavaScript Mastery"
 *             description: "Deep dive into modern JavaScript concepts and patterns"
 *             level: "intermediate"
 *             coverImage: "js-advanced-cover.jpg"
 *             published: true
 *     responses:
 *       201:
 *         description: Track created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: Track title already exists
 *
 *   get:
 *     security: []
 *     operationId: getAllTracks
 *     summary: Get all tracks
 *     description: |
 *       Retrieve all tracks (public endpoint).
 *       Supports filtering, sorting, and pagination.
 *       **Filter examples:**
 *       `?level=beginner`, `?published=true`, `?createdAt[gte]=2024-01-01`.
 *     tags: [Tracks]
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
 *           enum: [beginner, intermediate, advanced, all]
 *       - name: published
 *         in: query
 *         schema:
 *           type: boolean
 *       - name: sort
 *         in: query
 *         schema:
 *           type: string
 *           example: "-createdAt"
 *       - name: search
 *         in: query
 *         schema: { type: string }
 *         description: Full-text search across title and description
 *         example: javascript
 *     responses:
 *       200:
 *         description: List of tracks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TracksResponse'
 */

/**
 * @swagger
 * /tracks/{id}:
 *   get:
 *     security: []
 *     operationId: getTrackById
 *     summary: Get a specific track by ID
 *     description: |
 *       Retrieve detailed information about a track.
 *       Returns 404 if the track is unpublished and the caller is neither
 *       the instructor nor an admin.
 *     tags: [Tracks]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Track ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
 *     responses:
 *       200:
 *         description: Track details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     operationId: updateTrackById
 *     summary: Update a track
 *     description: Update track information (admin and instructors only)
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TrackUpdate'
 *           example:
 *             title: "Updated JavaScript Track"
 *             description: "Completely revised curriculum with new content"
 *             level: "advanced"
 *             published: false
 *     responses:
 *       200:
 *         description: Track updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackResponse'
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
 *     operationId: deleteTrackById
 *     summary: Delete a track
 *     description: Permanently delete a track (admin only)
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
 *     responses:
 *       204:
 *         description: Track deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /tracks/{trackId}/sessions/{sessionId}:
 *   patch:
 *     operationId: addSessionToTrack
 *     summary: Add a session to a track
 *     description: Associate a session with a track (admin and instructors only)
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: trackId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439031"
 *     responses:
 *       200:
 *         description: Session added to track successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackResponse'
 *       400:
 *         description: Session already exists in track or invalid operation
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Track or session not found
 *
 *   delete:
 *     operationId: removeSessionFromTrack
 *     summary: Remove a session from a track
 *     description: Remove session association from a track (admin and instructors only)
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: trackId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439031"
 *     responses:
 *       200:
 *         description: Session removed from track successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackResponse'
 *       400:
 *         description: Session not found in track
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Track or session not found
 */

/**
 * @swagger
 * /tracks/{id}/students:
 *   post:
 *     operationId: addStudentToTrack
 *     summary: Enroll a student in a track
 *     description: Enroll a student in a track (admin and instructors only)
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
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
 *         description: Student enrolled in track successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackResponse'
 *       400:
 *         description: Student already enrolled in this track
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Track not found
 */

/**
 * @swagger
 * /tracks/{id}/students/{studentId}:
 *   delete:
 *     operationId: removeStudentFromTrack
 *     summary: Remove a student from a track
 *     description: Unenroll a student from a track (admin and instructors only)
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
 *       - name: studentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Student removed from track successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackResponse'
 *       400:
 *         description: Student is not enrolled in this track
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Track or student not found
 */

/**
 * @swagger
 * /tracks/popular:
 *   get:
 *     security: []
 *     operationId: getPopularTracks
 *     summary: Get most popular tracks
 *     description: Retrieve tracks sorted by student enrollment count (public endpoint)
 *     tags: [Tracks]
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *           example: 5
 *     responses:
 *       200:
 *         description: List of popular tracks retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 results:
 *                   type: integer
 *                   example: 5
 *                 data:
 *                   type: object
 *                   properties:
 *                     tracks:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Track'
 */

/**
 * @swagger
 * /tracks/{id}/analytics:
 *   get:
 *     operationId: getTrackAnalytics
 *     summary: Get track analytics
 *     description: Retrieve statistics and analytics for a specific track (admin and instructors only)
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
 *     responses:
 *       200:
 *         description: Track analytics retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     analytics:
 *                       $ref: '#/components/schemas/TrackAnalytics'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /tracks/{id}/enroll-me:
 *   post:
 *     operationId: enrollMeInTrack
 *     summary: Self-enroll in a track
 *     description: Allow a student to enroll themselves in a published track
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
 *     responses:
 *       200:
 *         description: Enrolled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       400:
 *         description: Already enrolled or track not published
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /tracks/student/{studentId}:
 *   get:
 *     operationId: getTracksByStudent
 *     summary: Get tracks by student enrollment
 *     description: Returns tracks a student is enrolled in. Admin can view any student; students can only view themselves.
 *     tags: [Tracks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: studentId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of tracks }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */

/**
 * @swagger
 * /tracks/{trackId}/courses/{courseId}:
 *   patch:
 *     operationId: addCourseToTrack
 *     summary: Add a course to a track
 *     description: Associate a course with a track (admin and instructors only)
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: trackId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439041"
 *     responses:
 *       200:
 *         description: Course added to track successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackResponse'
 *       400:
 *         description: Course already exists in track
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Track or course not found
 *
 *   delete:
 *     operationId: removeCourseFromTrack
 *     summary: Remove a course from a track
 *     description: Remove course association from a track (admin and instructors only)
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: trackId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
 *       - name: courseId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439041"
 *     responses:
 *       200:
 *         description: Course removed from track successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackResponse'
 *       400:
 *         description: Course not found in track or track would be empty
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Track or course not found
 */

/**
 * @swagger
 * /tracks/{id}/leave-me:
 *   post:
 *     operationId: requestLeaveTrack
 *     summary: Request to leave a track
 *     description: Submits a leave request pending instructor approval
 *     tags: [Tracks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *         example: "507f1f77bcf86cd799439021"
 *     responses:
 *       200:
 *         description: Leave request submitted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       400:
 *         description: Not enrolled or already pending
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /tracks/{id}/pending:
 *   get:
 *     operationId: getPendingStudents
 *     summary: Get pending enrollment requests
 *     description: Retrieve students awaiting approval for a track
 *     tags: [Tracks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *         example: "507f1f77bcf86cd799439021"
 *     responses:
 *       200:
 *         description: List of pending students
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PendingListResponse'
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 * /tracks/{id}/students/{studentId}/approve:
 *   post:
 *     operationId: approveStudent
 *     summary: Approve a student's enrollment request
 *     tags: [Tracks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: studentId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Student approved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrackResponse'
 *       400: { description: Student not pending }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 * /tracks/{id}/students/{studentId}/reject:
 *   post:
 *     operationId: rejectStudent
 *     summary: Reject a student's enrollment request
 *     tags: [Tracks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: studentId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Request rejected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       400: { description: Student not pending }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 * /tracks/{id}/leaves:
 *   get:
 *     operationId: getPendingLeaves
 *     summary: Get pending leave requests
 *     tags: [Tracks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of pending leaves
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PendingListResponse'
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 * /tracks/{id}/leaves/{studentId}/approve:
 *   post:
 *     operationId: approveLeaveTrack
 *     summary: Approve a leave request
 *     tags: [Tracks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: studentId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Leave approved, student removed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       400: { description: No pending leave found }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 * /tracks/{id}/leaves/{studentId}/reject:
 *   post:
 *     operationId: rejectLeaveTrack
 *     summary: Reject a leave request
 *     tags: [Tracks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: studentId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Leave request rejected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       400: { description: No pending leave found }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

/**
 * @swagger
 * /tracks/{id}/weekly-tasks:
 *   get:
 *     operationId: getTrackWeeklyTasks
 *     summary: Get all weekly tasks across every course in a track
 *     description: >
 *       Only courses carry weekly tasks — standalone sessions mounted directly
 *       on the track are not included. Each item includes a `done` flag computed
 *       for the requesting user. Accessible to admins, any instructor, or a
 *       student enrolled in the track.
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, example: "507f1f77bcf86cd799439021" }
 *     responses:
 *       200:
 *         description: List of weekly tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 results: { type: integer, example: 6 }
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
 *         description: Only enrolled students can view this track's weekly tasks
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /tracks/{id}/assignments:
 *   get:
 *     operationId: getTrackAssignments
 *     summary: Get all assignments across every course in a track
 *     description: >
 *       Returns every assignment belonging to any course in the track, plus any
 *       assignment on a standalone session mounted directly on the track, sorted
 *       by deadline. Each assignment includes `mySubmission` — the requesting
 *       user's own submission, or null if they haven't submitted. Accessible to
 *       admins, any instructor, or a student enrolled in the track.
 *     tags: [Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
 *     responses:
 *       200:
 *         description: List of assignments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 results: { type: integer, example: 3 }
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
 *         description: Only enrolled students can view this track's assignments
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /tracks/{id}/reviews:
 *   post:
 *     operationId: createTrackReview
 *     summary: Submit a review for a track
 *     description: Only students currently enrolled in the track may review it (one review per student per track).
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
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
 *                 example: 4
 *               content:
 *                 type: string
 *                 example: "Great track!"
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
 *     operationId: getTrackReviews
 *     summary: Get reviews for a track
 *     description: Public endpoint. Supports the standard pagination query params.
 *     tags: [Reviews]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439021"
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

const express = require('express');
const AppError = require('../utils/AppError');
const reviewRouter = require('./review.route');
const assignmentRouter = require('./assignment.route');
const trackWeeklyTaskRouter = require('./trackWeeklyTask.route');
const trackController = require('../controllers/track.controller');
const {
  protect,
  restrictTo,
  checkOwnership,
} = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createTrackSchema,
  getTrackSchema,
  updateTrackSchema,
  deleteTrackSchema,
  manageSessionSchema,
  manageCourseSchema,
  addStudentSchema,
  studentIdSchema,
} = require('../validations/track.validation');
const { authLimiter } = require('../middlewares/rateLimit.middleware');
const selfApproval = require('../middlewares/selfApproval');

const router = express.Router();

// --- POPULAR TRACKS (must be before /:id) ---

router.get('/popular', trackController.getPopularTracks);

// --- Standard CRUD for Tracks ---

router
  .route('/')
  .post(
    protect,
    restrictTo('admin', 'instructor'),
    validate(createTrackSchema),
    trackController.createTrack,
  )
  .get(trackController.getAllTracks);

router.get(
  '/student/:studentId',
  protect,
  (req, res, next) => {
    if (req.user.role !== 'admin' && req.params.studentId !== req.user.id) {
      return next(new AppError('You can only view your own enrollments', 403));
    }
    next();
  },
  trackController.getTracksByStudent,
);

// --- ENROLLMENT MANAGEMENT ---

router.get(
  '/:id/pending',
  protect,
  restrictTo('admin', 'instructor'),
  validate(getTrackSchema, 'params'),
  checkOwnership({
    model: 'Track',
    ownerField: 'instructor',
    paramName: 'id',
  }),
  trackController.getPendingStudents,
);

router.post(
  '/:id/students/:studentId/approve',
  protect,
  restrictTo('admin', 'instructor'),
  validate(getTrackSchema, 'params'),
  validate(studentIdSchema, 'params'),
  checkOwnership({
    model: 'Track',
    ownerField: 'instructor',
    paramName: 'id',
  }),
  selfApproval,
  trackController.approveStudent,
);

router.post(
  '/:id/students/:studentId/reject',
  protect,
  restrictTo('admin', 'instructor'),
  validate(getTrackSchema, 'params'),
  validate(studentIdSchema, 'params'),
  checkOwnership({
    model: 'Track',
    ownerField: 'instructor',
    paramName: 'id',
  }),
  trackController.rejectStudent,
);

// Existing enroll-me route stays, but now creates a pending request
router
  .route('/:id/enroll-me')
  .post(
    authLimiter,
    protect,
    validate(getTrackSchema, 'params'),
    trackController.enrollMe,
  );

// --- TRACK ANALYTICS (must be before /:id) ---

router.get(
  '/:id/analytics',
  protect,
  restrictTo('admin', 'instructor'),
  validate(getTrackSchema, 'params'),
  trackController.getTrackAnalytics,
);

router
  .route('/:id')
  .get(validate(getTrackSchema, 'params'), trackController.getTrack)
  .patch(
    protect,
    restrictTo('admin', 'instructor'),
    validate(getTrackSchema, 'params'),
    checkOwnership({
      model: 'Track',
      ownerField: 'instructor',
      paramName: 'id',
    }),
    validate(updateTrackSchema),
    trackController.updateTrack,
  )
  .delete(
    protect,
    restrictTo('admin'),
    validate(deleteTrackSchema, 'params'),
    checkOwnership({
      model: 'Track',
      ownerField: 'instructor',
      paramName: 'id',
    }),
    trackController.deleteTrack,
  );

// --- Course - Session Management for a Track ---

router
  .route('/:trackId/courses/:courseId')
  .patch(
    protect,
    restrictTo('admin', 'instructor'),
    validate(manageCourseSchema, 'params'), // Reuse or create manageCourseSchema
    checkOwnership({
      model: 'Track',
      ownerField: 'instructor',
      paramName: 'trackId',
    }),
    trackController.addCourseToTrack,
  )
  .delete(
    protect,
    restrictTo('admin', 'instructor'),
    validate(manageCourseSchema, 'params'),
    checkOwnership({
      model: 'Track',
      ownerField: 'instructor',
      paramName: 'trackId',
    }),
    trackController.removeCourseFromTrack,
  );

router
  .route('/:trackId/sessions/:sessionId')
  .patch(
    protect,
    restrictTo('admin', 'instructor'),
    validate(manageSessionSchema, 'params'),
    checkOwnership({
      model: 'Track',
      ownerField: 'instructor',
      paramName: 'trackId',
    }),
    trackController.addSessionToTrack,
  )
  .delete(
    protect,
    restrictTo('admin', 'instructor'),
    validate(manageSessionSchema, 'params'),
    checkOwnership({
      model: 'Track',
      ownerField: 'instructor',
      paramName: 'trackId',
    }),
    trackController.removeSessionFromTrack,
  );

// --- STUDENT ENROLLMENT FOR TRACKS ---

router.route('/:id/students').post(
  protect,
  restrictTo('admin', 'instructor'),
  validate(getTrackSchema, 'params'),
  checkOwnership({
    model: 'Track',
    ownerField: 'instructor',
    paramName: 'id',
  }),
  validate(addStudentSchema),
  trackController.addStudent,
);

router.route('/:id/students/:studentId').delete(
  protect,
  restrictTo('admin', 'instructor'),
  validate(getTrackSchema, 'params'),
  validate(studentIdSchema, 'params'),
  checkOwnership({
    model: 'Track',
    ownerField: 'instructor',
    paramName: 'id',
  }),
  trackController.removeStudent,
);

// --- LEAVE REQUESTS ---
router.get(
  '/:id/leaves',
  protect,
  restrictTo('admin', 'instructor'),
  validate(getTrackSchema, 'params'),
  trackController.getPendingLeaves,
);

router.post(
  '/:id/leave-me',
  authLimiter,
  protect,
  validate(getTrackSchema, 'params'),
  trackController.requestLeaveTrack,
);

router.post(
  '/:id/leaves/:studentId/approve',
  protect,
  restrictTo('admin', 'instructor'),
  validate(getTrackSchema, 'params'),
  validate(studentIdSchema, 'params'),
  selfApproval,
  trackController.approveLeaveTrack,
);

router.post(
  '/:id/leaves/:studentId/reject',
  protect,
  restrictTo('admin', 'instructor'),
  validate(getTrackSchema, 'params'),
  validate(studentIdSchema, 'params'),
  trackController.rejectLeaveTrack,
);

// 
router.use('/:id/reviews', reviewRouter('track'));
router.use('/:id/assignments', assignmentRouter);
router.use('/:id/weekly-tasks', trackWeeklyTaskRouter);

module.exports = router;

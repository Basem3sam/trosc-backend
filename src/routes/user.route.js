/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication and user registration
 *   - name: Users
 *     description: User management and profile operations
 */

/**
 * @swagger
 * /users/signup:
 *   post:
 *     operationId: signup
 *     summary: Register a new user account
 *     description: Creates a new user account with student role by default
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCreate'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Email already registered
 */

/**
 * @swagger
 * /users/login:
 *   post:
 *     operationId: login
 *     summary: Authenticate user and return JWT token
 *     description: Verifies user credentials and returns JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthLogin'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       401:
 *         description: Invalid credentials
 */

/**
 * @swagger
 * /users/logout:
 *   post:
 *     operationId: logout
 *     summary: Log out current user
 *     description: Clears authentication token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message:
 *                   type: string
 *                   example: Logged out successfully!
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /users/forgotPassword:
 *   post:
 *     operationId: forgotPassword
 *     summary: Send password reset token to user's email
 *     description: Generates and sends password reset token via email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: basem@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message:
 *                   type: string
 *                   example: If an account exists, a reset link has been sent. Please check your email.
 *       404:
 *         description: No user found with provided email
 */

/**
 * @swagger
 * /users/resetPassword/{token}:
 *   patch:
 *     operationId: resetPassword
 *     summary: Reset password using token from email
 *     description: Resets user password using valid reset token
 *     tags: [Auth]
 *     parameters:
 *       - name: token
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordReset'
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       400:
 *         description: Invalid or expired token
 */

/**
 * @swagger
 * /users/updateMyPassword:
 *   patch:
 *     operationId: updateMyPassword
 *     summary: Update current user's password
 *     description: Change password for authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordUpdate'
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /users/me/enrollments:
 *   get:
 *     operationId: getMyEnrollments
 *     summary: Get my track and course enrollments
 *     description: Returns all tracks and courses the current user is enrolled in
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Enrollments retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MyEnrollmentsResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /users/me:
 *   get:
 *     operationId: getMyProfile
 *     summary: Get current user's profile
 *     description: Returns profile of authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
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
 *                     user:
 *                       $ref: '#/components/schemas/UserBase'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /users/updateMe:
 *   patch:
 *     operationId: updateMyProfile
 *     summary: Update current user's profile information
 *     description: Update user profile (name, email, photo, bio)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Basem Updated
 *               email:
 *                 type: string
 *                 format: email
 *                 example: basem.updated@example.com
 *               photo:
 *                 type: string
 *                 example: new-avatar.jpg
 *               bio:
 *                 type: string
 *                 example: Senior Backend Engineer
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/UserBase'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /users/deleteMe:
 *   delete:
 *     operationId: deleteMyAccount
 *     summary: Deactivate current user account (soft delete)
 *     description: Soft deletes user account by setting active=false
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Account deactivated
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /users:
 *   get:
 *     operationId: getAllUsers
 *     summary: Get all users (admin only)
 *     description: Retrieves list of all active users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsersResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *   post:
 *     operationId: createUser
 *     summary: Create a new user (admin only)
 *     description: Admin endpoint to create users with specific roles
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserAdminCreate'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserBase'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     operationId: getUserById
 *     summary: Get user by ID (admin only)
 *     description: Retrieve specific user details by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User found
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
 *                     user:
 *                       $ref: '#/components/schemas/UserBase'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   patch:
 *     operationId: updateUserById
 *     summary: Update user by ID (admin only)
 *     description: Update user information including role
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserAdminUpdate'
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserBase'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *   delete:
 *     operationId: deleteUserById
 *     summary: Delete user by ID (admin only)
 *     description: Permanently delete user from database
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: User deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /users/bulk:
 *   post:
 *     operationId: bulkUserAction
 *     summary: Bulk user actions (admin only)
 *     description: Activate, deactivate, or delete multiple users at once
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *               - action
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: "507f1f77bcf86cd799439011"
 *                 example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 *               action:
 *                 type: string
 *                 enum: [activate, deactivate, delete]
 *                 example: "activate"
 *     responses:
 *       200:
 *         description: Bulk action completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: "Bulk activate completed successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const userController = require('../controllers/user.controller');
const validate = require('../middlewares/validate.middleware');

const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  updateMeSchema,
  userIdSchema,
  adminCreateUserSchema,
  adminUpdateUserSchema,
  bulkUserActionSchema,
} = require('../validations/user.validation');
const { authLimiter } = require('../middlewares/rateLimit.middleware');

const router = express.Router();

// ===================================================================
// 🔓 PUBLIC AUTH ROUTES - No authentication required
// ===================================================================

/**
 * @route   POST /users/signup
 * @desc    Register a new user account
 * @access  Public
 */
router.post('/signup', validate(signupSchema), authController.signup);

/**
 * @route   POST /users/login
 * @desc    Authenticate user and return JWT token
 * @access  Public
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @route   POST /users/forgotPassword
 * @desc    Send password reset token to user's email
 * @access  Public
 */
router.post(
  '/forgotPassword',
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

/**
 * @route   PATCH /users/resetPassword/:token
 * @desc    Reset password using token from email
 * @access  Public
 */
router.patch(
  '/resetPassword/:token',
  validate(resetPasswordSchema),
  authController.resetPassword,
);

// ===================================================================
// 🔐 PROTECTED USER ROUTES - Authentication required
// ===================================================================

// Apply authentication middleware to all routes below
router.use(authMiddleware.protect);

/**
 * @route   POST /users/logout
 * @desc    Log out current user (clear JWT cookie)
 * @access  Private
 */
router.post('/logout', authController.logout);

/**
 * @route   PATCH /users/updateMyPassword
 * @desc    Update current user's password
 * @access  Private
 */
router.patch(
  '/updateMyPassword',
  validate(updatePasswordSchema),
  authController.updatePassword,
);

/**
 * @route   GET /users/me
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/me', userController.getMe);

/**
 * @route   PATCH /users/updateMe
 * @desc    Update current user's profile information
 * @access  Private
 */
router.patch('/updateMe', validate(updateMeSchema), userController.updateMe);

/**
 * @route   DELETE /users/deleteMe
 * @desc    Deactivate current user account (soft delete)
 * @access  Private
 */
router.delete('/deleteMe', userController.deleteMe);

/**
 * @route   GET /me/enrollments
 * @desc    Get current user's enrollments
 * @access  Private
 */
router.get('/me/enrollments', userController.getMyEnrollments);

// ===================================================================
// 👑 ADMIN ONLY ROUTES - Admin role required
// ===================================================================

// Apply admin restriction to all routes below
router.use(authMiddleware.restrictTo('admin'));

/**
 * @route   POST /users/bulk
 * @desc    Bulk user actions (activate, deactivate, delete)
 * @access  Private/Admin
 * @body    { userIds: [string], action: string }
 */
router.post(
  '/bulk',
  validate(bulkUserActionSchema),
  userController.bulkUserAction,
);

/**
 * @route   GET /users
 * @desc    Get all users (admin only)
 * @access  Private/Admin
 * @returns {Array} List of all users
 */
router
  .route('/')
  .get(userController.getAllUsers)
  /**
   * @route   POST /users
   * @desc    Create a new user (admin only)
   * @access  Private/Admin
   * @body    {Object} User data including role assignment
   */
  .post(validate(adminCreateUserSchema), userController.createUser);

/**
 * @route   /users/:id
 * @desc    User management by ID (admin only)
 * @access  Private/Admin
 */
router
  .route('/:id')
  /**
   * @route   GET /users/:id
   * @desc    Get user by ID
   * @access  Private/Admin
   * @param   {string} id - User MongoDB ObjectId
   */
  .get(validate(userIdSchema, 'params'), userController.getUser)

  /**
   * @route   PATCH /users/:id
   * @desc    Update user by ID
   * @access  Private/Admin
   * @param   {string} id - User MongoDB ObjectId
   * @body    {Object} User data to update
   */
  .patch(
    validate(userIdSchema, 'params'),
    validate(adminUpdateUserSchema),
    userController.updateUser,
  )

  /**
   * @route   DELETE /users/:id
   * @desc    Permanently delete user by ID
   * @access  Private/Admin
   * @param   {string} id - User MongoDB ObjectId
   */
  .delete(validate(userIdSchema, 'params'), userController.deleteUser);

module.exports = router;

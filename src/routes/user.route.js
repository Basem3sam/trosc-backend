/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication and password management
 *   - name: Users
 *     description: User profile and admin management
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     UserBase:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: Basem Esam
 *         email:
 *           type: string
 *           format: email
 *           example: basem@example.com
 *         photo:
 *           type: string
 *           example: default.jpg
 *         role:
 *           type: string
 *           enum: [student, admin, instructor]
 *           example: student
 *         enrolledTracks:
 *           type: array
 *           items:
 *             type: string
 *           example: ["66f5d42e2d4a3a7b8c5e9f21"]
 *         active:
 *           type: boolean
 *           example: true
 *
 *     UserCreate:
 *       allOf:
 *         - $ref: '#/components/schemas/UserBase'
 *         - type: object
 *           required:
 *             - name
 *             - email
 *             - password
 *             - passwordConfirm
 *           properties:
 *             password:
 *               type: string
 *               format: password
 *               example: StrongP@ssw0rd
 *             passwordConfirm:
 *               type: string
 *               format: password
 *               example: StrongP@ssw0rd
 *
 *     UserAdminCreate:
 *       allOf:
 *         - $ref: '#/components/schemas/UserCreate'
 *         - type: object
 *           properties:
 *             role:
 *               type: string
 *               enum: [student, admin, instructor]
 *               example: instructor
 *             enrollment:
 *               type: string
 *               example: 2025-ENG-CS
 *
 *     AuthLogin:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: basem@example.com
 *         password:
 *           type: string
 *           format: password
 *           example: StrongP@ssw0rd
 *
 *     TokenResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: success
 *         token:
 *           type: string
 *           description: JWT access token
 *
 *     StandardError:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: fail
 *         message:
 *           type: string
 *           example: Error description here
 *
 *   responses:
 *     Unauthorized:
 *       description: Authentication required / invalid token
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StandardError'
 *     NotFound:
 *       description: Resource not found
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StandardError'
 *     ValidationError:
 *       description: Validation failed
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StandardError'
 */

/**
 * @swagger
 * /users/signup:
 *   post:
 *     summary: Register a new user (public)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       description: New user data (passwordConfirm must match password)
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
 */

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Log in an existing user (public)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthLogin'
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token (also set in cookie if implemented)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /users/logout:
 *   get:
 *     summary: Log out the current user (clears cookie/token)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 */

/**
 * @swagger
 * /users/forgotPassword:
 *   post:
 *     summary: Send password reset link to user email (public)
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
 *         description: Password reset email sent (if email exists)
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

/**
 * @swagger
 * /users/resetPassword/{token}:
 *   patch:
 *     summary: Reset user password using the token from email (public)
 *     tags: [Auth]
 *     parameters:
 *       - name: token
 *         in: path
 *         required: true
 *         description: Password reset token (plain token)
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - passwordConfirm
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *                 example: NewP@ssw0rd
 *               passwordConfirm:
 *                 type: string
 *                 format: password
 *                 example: NewP@ssw0rd
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /users/updateMyPassword:
 *   patch:
 *     summary: Update the current user's password (logged-in users)
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
 *               - passwordCurrent
 *               - password
 *               - passwordConfirm
 *             properties:
 *               passwordCurrent:
 *                 type: string
 *                 format: password
 *               password:
 *                 type: string
 *                 format: password
 *               passwordConfirm:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get the currently logged-in user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile returned
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
 *     summary: Update current user's info (name, email, photo)
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
 *                 example: avatar.jpg
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /users/deleteMe:
 *   delete:
 *     summary: Deactivate current user account (soft delete)
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
 *     summary: Get all users (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users returned
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   post:
 *     summary: Create a user as admin (admin only) — allows role & enrollment
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
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Forbidden (not admin)
 */

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a specific user by ID (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: User ObjectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User found
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   patch:
 *     summary: Update a specific user by ID (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: User ObjectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserAdminCreate'
 *     responses:
 *       200:
 *         description: User updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   delete:
 *     summary: Delete a specific user by ID (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: User ObjectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: User deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
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
} = require('../validations/user.validation');

const router = express.Router();

// ───────────── AUTH ROUTES ─────────────
router.post('/signup', validate(signupSchema), authController.signup);
router.post('/login', validate(loginSchema), authController.login);
router.get('/logout', authController.logout);

router.post(
  '/forgotPassword',
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
router.patch(
  '/resetPassword/:token',
  validate(resetPasswordSchema),
  authController.resetPassword,
);

// ───────────── PROTECTED USER ROUTES ─────────────
router.use(authMiddleware.protect); // all routes below are protected

router.patch(
  '/updateMyPassword',
  validate(updatePasswordSchema),
  authController.updatePassword,
);

router.get('/me', userController.getMe, userController.getUser);
router.patch('/updateMe', validate(updateMeSchema), userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);

// ───────────── ADMIN ROUTES ─────────────
router.use(authMiddleware.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;

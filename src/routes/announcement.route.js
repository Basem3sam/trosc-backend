/**
 * @swagger
 * tags:
 *   - name: Announcements
 *     description: Club announcements and news
 *
 * /announcements:
 *   get:
 *     operationId: getAllAnnouncements
 *     summary: Get all announcements
 *     description: Retrieve all announcements with filtering
 *     tags: [Announcements]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: List of announcements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 results: { type: integer }
 *                 total: { type: integer }
 *                 data:
 *                   type: object
 *                   properties:
 *                     announcements:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Announcement'
 *
 *   post:
 *     operationId: createAnnouncement
 *     summary: Create announcement
 *     description: Admin/instructor only
 *     tags: [Announcements]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Announcement'
 *     responses:
 *       201: { description: Created }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *
 * /announcements/{id}:
 *   get:
 *     operationId: getAnnouncement
 *     summary: Get single announcement
 *     tags: [Announcements]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Announcement found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Announcement'
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 *   patch:
 *     operationId: updateAnnouncement
 *     summary: Update announcement
 *     tags: [Announcements]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Announcement'
 *     responses:
 *       200: { description: Updated }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 *   delete:
 *     operationId: deleteAnnouncement
 *     summary: Delete announcement
 *     tags: [Announcements]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

const express = require('express');
const announcementController = require('../controllers/announcement.controller');
const {
  protect,
  restrictTo,
  checkOwnership,
} = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  announcementIdSchema,
} = require('../validations/announcement.validation');

const router = express.Router();

// ===================================================================
// PUBLIC ROUTES
// ===================================================================

router.get('/', announcementController.getAllAnnouncements);
router.get(
  '/:id',
  validate(announcementIdSchema, 'params'),
  announcementController.getAnnouncement,
);

// ===================================================================
// PROTECTED ROUTES
// ===================================================================

router.use(protect);

router.post(
  '/',
  restrictTo('admin', 'instructor'),
  validate(createAnnouncementSchema),
  announcementController.createAnnouncement,
);

router.patch(
  '/:id',
  restrictTo('admin', 'instructor'),
  checkOwnership({
    model: 'Announcement',
    ownerField: 'createdBy',
    paramName: 'id',
  }),
  validate(announcementIdSchema, 'params'),
  validate(updateAnnouncementSchema),
  announcementController.updateAnnouncement,
);

router.delete(
  '/:id',
  restrictTo('admin', 'instructor'),
  checkOwnership({
    model: 'Announcement',
    ownerField: 'createdBy',
    paramName: 'id',
  }),
  validate(announcementIdSchema, 'params'),
  announcementController.deleteAnnouncement,
);

module.exports = router;

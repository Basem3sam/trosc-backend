/**
 * @swagger
 * tags:
 *   - name: Events
 *     description: Club events, workshops, and RSVP management
 *
 * /events:
 *   get:
 *     operationId: getAllEvents
 *     summary: Get all events
 *     description: Retrieve all events with filtering, sorting, and pagination
 *     tags: [Events]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 10 }
 *       - name: locationType
 *         in: query
 *         schema: { type: string, enum: [online, offline] }
 *       - name: sort
 *         in: query
 *         schema: { type: string, example: "-date" }
 *     responses:
 *       200:
 *         description: List of events retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 results: { type: integer }
 *                 total: { type: integer }
 *                 pagination: { type: object }
 *                 data:
 *                   type: object
 *                   properties:
 *                     events:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Event'
 *
 *   post:
 *     operationId: createEvent
 *     summary: Create a new event
 *     description: Create an event (admin and instructors only)
 *     tags: [Events]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Event'
 *           example:
 *             title: "Backend Bootcamp"
 *             description: "3-day Node.js workshop"
 *             date: "2025-11-10T10:00:00.000Z"
 *             locationType: "online"
 *             locationLink: "https://zoom.us/meeting/xyz"
 *     responses:
 *       201: { description: Created }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */

/**
 * @swagger
 * /events/my-events:
 *   get:
 *     operationId: getMyEvents
 *     summary: Get my RSVP'd events
 *     description: Retrieve all events the current user has RSVP'd to
 *     tags: [Events]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: List of user's events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 results: { type: integer }
 *                 total: { type: integer }
 *                 pagination: { type: object }
 *                 data:
 *                   type: object
 *                   properties:
 *                     events:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Event'
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */

/**
 * @swagger
 * /events/{id}:
 *   get:
 *     operationId: getEvent
 *     summary: Get single event
 *     tags: [Events]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Event found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     event:
 *                       $ref: '#/components/schemas/Event'
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 *   patch:
 *     operationId: updateEvent
 *     summary: Update event
 *     tags: [Events]
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
 *             $ref: '#/components/schemas/Event'
 *     responses:
 *       200: { description: Updated }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 *   delete:
 *     operationId: deleteEvent
 *     summary: Delete event
 *     tags: [Events]
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

/**
 * @swagger
 * /events/{id}/rsvp:
 *   post:
 *     operationId: rsvpEvent
 *     summary: RSVP to an event
 *     description: Register attendance for an event
 *     tags: [Events]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: RSVP confirmed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: RSVP confirmed }
 *                 data:
 *                   type: object
 *                   properties:
 *                     event:
 *                       $ref: '#/components/schemas/Event'
 *       400: { description: Already RSVP'd }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

/**
 * @swagger
 * /events/{id}/rsvp:
 *   delete:
 *     operationId: cancelRsvp
 *     summary: Cancel RSVP
 *     description: Remove attendance registration from an event
 *     tags: [Events]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: RSVP cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: RSVP cancelled }
 *                 data:
 *                   type: object
 *                   properties:
 *                     event:
 *                       $ref: '#/components/schemas/Event'
 *       400: { description: Not attending this event }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

const express = require('express');
const eventController = require('../controllers/event.controller');
const { protect, restrictTo, checkOwnership } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createEventSchema,
  updateEventSchema,
  eventIdSchema,
} = require('../validations/event.validation');

const router = express.Router();

// ===================================================================
// PUBLIC ROUTES
// ===================================================================

router.get('/', eventController.getAllEvents);

// MUST be before /:id so it is not swallowed by the param route
router.get('/my-events', protect, eventController.getMyEvents);

router.get('/:id', validate(eventIdSchema, 'params'), eventController.getEvent);

// ===================================================================
// PROTECTED ROUTES
// ===================================================================

router.use(protect);

router.post(
  '/',
  restrictTo('admin', 'instructor'),
  validate(createEventSchema),
  eventController.createEvent,
);

router.patch(
  '/:id',
  restrictTo('admin', 'instructor'),
  checkOwnership({
    model: 'Event',
    ownerField: 'createdBy',
    paramName: 'id',
  }),
  validate(eventIdSchema, 'params'),
  validate(updateEventSchema),
  eventController.updateEvent,
);

router.delete(
  '/:id',
  restrictTo('admin', 'instructor'),
  checkOwnership({
    model: 'Event',
    ownerField: 'createdBy',
    paramName: 'id',
  }),
  validate(eventIdSchema, 'params'),
  eventController.deleteEvent,
);

router.post(
  '/:id/rsvp',
  validate(eventIdSchema, 'params'),
  eventController.rsvpEvent,
);

router.delete(
  '/:id/rsvp',
  validate(eventIdSchema, 'params'),
  eventController.cancelRsvp,
);

module.exports = router;

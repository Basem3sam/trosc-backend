/**
 * @swagger
 * tags:
 *   - name: Contact
 *     description: Public contact form submission
 */

/**
 * @swagger
 * /contact:
 *   post:
 *     security: []
 *     operationId: submitContactForm
 *     summary: Submit the contact us form
 *     description: Public endpoint — stores the submission and notifies the admin by email.
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Contact'
 *           example:
 *             username: "Basem Esam"
 *             track: "Backend Development"
 *             email: "basem@example.com"
 *             phone: "+201234567890"
 *             message: "I'd like to know more about the upcoming cohort."
 *     responses:
 *       200:
 *         description: Message received
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: "Your message has been received. We'll be in touch soon!" }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

const express = require('express');
const contactController = require('../controllers/contact.controller');
const validate = require('../middlewares/validate.middleware');
const { createContactSchema } = require('../validations/contact.validation');
const { authLimiter } = require('../middlewares/rateLimit.middleware');

const router = express.Router();

router.post(
  '/',
  authLimiter, // reuse the existing strict limiter — public unauthenticated endpoint, prevent spam
  validate(createContactSchema),
  contactController.submitContactForm,
);

module.exports = router;

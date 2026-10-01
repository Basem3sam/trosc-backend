/**
 * @swagger
 * tags:
 *   - name: Config
 *     description: Public, read-only configuration values the frontend needs (e.g. the trusted-host allowlist)
 *
 * /config/trusted-hosts:
 *   get:
 *     security: []
 *     tags: [Config]
 *     operationId: getTrustedHosts
 *     summary: List the hostnames accepted for session/resource/attachment/submission URLs
 *     description: >
 *       Returns the exact same allowlist every URL validator in the app checks
 *       against (src/utils/trustedHosts.js) — YouTube, Google Drive, GitHub,
 *       Cloudinary, Imgur, Dropbox, Discord CDN, etc. — so a form can warn
 *       about an untrusted host before submitting instead of only finding
 *       out from a 400. Public, no authentication required.
 *     responses:
 *       200:
 *         description: The trusted-host allowlist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 results: { type: integer, example: 14 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     trustedHosts:
 *                       type: array
 *                       items: { type: string }
 *                       example: ["youtube.com", "drive.google.com", "github.com"]
 */

const express = require('express');
const configController = require('../../controllers/config.controller');

const router = express.Router();

router.get('/trusted-hosts', configController.getTrustedHosts);

module.exports = router;

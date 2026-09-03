import express from 'express';

const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { acceptInvitationSchema } = require('../schemas/organizationSchemas');
const { acceptInvitation } = require('../controllers/invitationController');

// POST /api/invitations/accept - authenticated, but deliberately NOT
// org-scoped (requireOrgMembership) since the caller isn't a member yet;
// acceptInvitation itself checks the token against the caller's own email.
router.post('/accept', authenticate, validate(acceptInvitationSchema), acceptInvitation);

module.exports = router;

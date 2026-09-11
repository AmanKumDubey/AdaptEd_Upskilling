import express from 'express';

const router = express.Router();

const { getPublicWallet } = require('../controllers/walletShareController');

// GET /api/public/wallet/:token - deliberately NOT behind `authenticate`.
// This is the one genuinely public, unauthenticated read in the API - the
// token is a 24-byte random string (see walletShareController.js), and the
// response never includes email or the real userId, only first name and
// the skills/stats a learner chose to share.
router.get('/:token', getPublicWallet);

module.exports = router;

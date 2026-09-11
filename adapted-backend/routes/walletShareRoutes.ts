import express from 'express';

const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { getMyShareLink } = require('../controllers/walletShareController');

router.use(authenticate);

// GET /api/me/wallet-share
router.get('/', getMyShareLink);

module.exports = router;

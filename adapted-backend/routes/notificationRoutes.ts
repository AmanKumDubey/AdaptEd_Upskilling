import express from 'express';

const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { notificationIdParamSchema } = require('../schemas/notificationSchemas');
const {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} = require('../controllers/notificationController');

router.use(authenticate);

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:notificationId/read', validate(notificationIdParamSchema, 'params'), markRead);
router.put('/read-all', markAllRead);

module.exports = router;

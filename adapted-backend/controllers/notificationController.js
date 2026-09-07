const { eq, and, isNull, desc, sql } = require('drizzle-orm');
const { db } = require('../db/client');
const { notifications } = require('../db/schema');
const { touch } = require('../db/helpers');
const { sendSuccess, sendError, asyncHandler } = require('../utilities/helpers/helper');
const { HTTP_STATUS } = require('../utilities/constants');

// GET /api/me/notifications - most recent first, capped since this is a
// dropdown list, not a paged inbox (no feature yet asks for older history).
const listNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  sendSuccess(res, 'Notifications retrieved successfully', rows);
});

// GET /api/me/notifications/unread-count - cheap enough to poll for a bell badge
const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const [row] = await db
    .select({ count: sql`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

  sendSuccess(res, 'Unread count retrieved successfully', { count: row?.count || 0 });
});

// PUT /api/me/notifications/:notificationId/read
const markRead = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { notificationId } = req.params;

  const [existing] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .limit(1);

  if (!existing) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Notification not found');
  }

  const [updated] = await db
    .update(notifications)
    .set(touch({ readAt: new Date() }))
    .where(eq(notifications.id, notificationId))
    .returning();

  sendSuccess(res, 'Notification marked as read', updated);
});

// PUT /api/me/notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  await db
    .update(notifications)
    .set(touch({ readAt: new Date() }))
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

  sendSuccess(res, 'All notifications marked as read');
});

module.exports = {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
};

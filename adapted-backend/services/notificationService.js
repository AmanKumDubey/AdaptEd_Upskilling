const { db } = require('../db/client');
const { notifications } = require('../db/schema');
const { newId, withTimestamps } = require('../db/helpers');

// Small shared writer so every trigger site (currently just
// invitationController.js's acceptInvitation) creates rows the same way.
async function createNotification({ userId, type, title, message, data = {} }) {
  const [row] = await db.insert(notifications).values(withTimestamps({
    id: newId(),
    userId,
    type,
    title,
    message,
    data,
    readAt: null,
  })).returning();
  return row;
}

module.exports = { createNotification };

import { z } from 'zod';

const notificationIdParamSchema = z.object({
  notificationId: z.string().uuid('Invalid notification id'),
});

module.exports = { notificationIdParamSchema };

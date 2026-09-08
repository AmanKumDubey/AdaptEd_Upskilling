import { z } from 'zod';

const { FILE_UPLOAD } = require('../utilities/constants');

// Phase B23: previously only checked fileName/contentType were non-empty
// strings - no allowlist, no size limit, at any layer (frontend's `accept`
// attribute is a UI hint only). This is the first real enforcement, checked
// before a presigned URL is even minted.
const presignCertificateSchema = z.object({
  fileName: z.string({ message: 'fileName is required' }).trim().min(1, 'fileName is required').max(255),
  contentType: z.enum(FILE_UPLOAD.ALLOWED_TYPES, {
    message: 'Only PDF, JPEG, PNG, GIF, or WEBP files are supported',
  }),
  sizeBytes: z.coerce.number({ message: 'sizeBytes is required' }).int().positive()
    .max(FILE_UPLOAD.MAX_SIZE, `File is too large (max ${FILE_UPLOAD.MAX_SIZE / (1024 * 1024)}MB)`),
});

const listCertificatesQuerySchema = z.object({
  courseId: z.string().uuid('Invalid course id').optional(),
});

module.exports = { presignCertificateSchema, listCertificatesQuerySchema };

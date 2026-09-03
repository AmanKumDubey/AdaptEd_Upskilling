import { z } from 'zod';

const presignCertificateSchema = z.object({
  fileName: z.string({ message: 'fileName is required' }).trim().min(1, 'fileName is required'),
  contentType: z.string({ message: 'contentType is required' }).trim().min(1, 'contentType is required'),
});

const listCertificatesQuerySchema = z.object({
  courseId: z.string().uuid('Invalid course id').optional(),
});

module.exports = { presignCertificateSchema, listCertificatesQuerySchema };

import express from 'express';

const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { presignCertificateSchema, listCertificatesQuerySchema } = require('../schemas/certificateSchemas');
const { courseIdParamSchema } = require('../schemas/courseSchemas');

const { presignCertificateUpload, listCertificates } = require('../controllers/certificateController');

// All routes below require authentication
router.use(authenticate);

// POST /api/me/courses/:courseId/certificates/presign
router.post(
  '/courses/:courseId/certificates/presign',
  validate(courseIdParamSchema, 'params'),
  validate(presignCertificateSchema),
  presignCertificateUpload,
);

// GET /api/me/certificates?courseId=...
router.get('/certificates', validate(listCertificatesQuerySchema, 'query'), listCertificates);

module.exports = router;

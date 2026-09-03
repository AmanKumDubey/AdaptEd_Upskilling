const crypto = require('crypto');
const { eq, and, desc } = require('drizzle-orm');
const { db } = require('../db/client');
const { courses, certificates } = require('../db/schema');

const {
    sendSuccess,
    sendError,
    asyncHandler
} = require('../utilities/helpers/helper');

const { HTTP_STATUS } = require('../utilities/constants');
const { presignPutObject, presignGetObject } = require('../services/s3Service');

// Helper Functions

// Remove directory components and unsafe characters from a filename
// This prevents keys like "../../secret" and keeps keys URL safe
const sanitizeFileName = (fileName) => {
    const raw = String(fileName || '').trim();
    if (!raw) return 'document';

    // Strip path segments for both Unix "/" and Windows "\"
    const base = raw.split('/').pop().split('\\').pop();

    // Replace any character not in this safe set with "_"
    return base.replace(/[^a-zA-Z0-9._-]/g, '_');
};

// Build a unique, user-scoped S3 key
// Example: certificates/<userId>/<courseId>/<timestamp>-<random>-<fileName>
const buildCertificateKey = ({ userId, courseId, fileName }) => {
    const prefix = process.env.AWS_S3_CERTIFICATES_PREFIX || 'certificates/';
    const safeName = sanitizeFileName(fileName);
    const rand = crypto.randomBytes(10).toString('hex'); // 20 hex characters
    return `${prefix}${userId}/${courseId}/${Date.now()}-${rand}-${safeName}`;
};

// Main Functions

// POST /api/me/courses/:courseId/certificates/presign
// Body: { fileName: string, contentType: string }
//
// Returns a presigned URL for uploading a certificate document to S3
const presignCertificateUpload = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const courseId = req.params.courseId;

    // Phase B2: fileName/contentType presence + type already enforced by presignCertificateSchema.
    const { fileName, contentType } = req.body || {};

    // Ensure course exists
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!course) {
        return sendError(res, HTTP_STATUS.NOT_FOUND, 'Course not found');
    }

    // Create a key scoped to this user + course
    const key = buildCertificateKey({ userId, courseId, fileName });

    // Presign an upload URL (client will PUT file to this URL)
    const { uploadUrl, bucket, expiresInSeconds } = await presignPutObject({
        key,
        contentType,
        expiresInSeconds: 300
    });

    return sendSuccess(res, 'Upload URL created', {
        uploadUrl,
        key,
        bucket,
        expiresInSeconds
    });
});

// GET /api/me/certificates
// Query: courseId (optional)
//
// Returns certificates for the user (optionally for a course),
// including a presigned download URL for each
const listCertificates = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { courseId = null } = req.query || {};

    const conditions = [eq(certificates.userId, userId)];
    if (courseId) conditions.push(eq(certificates.courseId, courseId));

    // Namespaced select (rather than SELECT *) so Certificate and Course columns
    // that share a name ("id", "createdAt", ...) don't collide.
    const rows = await db
      .select({ certificate: certificates, course: courses })
      .from(certificates)
      .innerJoin(courses, eq(certificates.courseId, courses.id))
      .where(and(...conditions))
      .orderBy(desc(certificates.uploadedAt));

    // Add downloadUrl per certificate (short-lived signed URL)
    const payload = await Promise.all(rows.map(async ({ certificate, course }) => {
        const { downloadUrl } = await presignGetObject({
            key: certificate.s3Key,
            expiresInSeconds: 300
        });

        return {
            ...certificate,
            course,
            downloadUrl
        };
    }));

    return sendSuccess(res, 'Certificates retrieved', payload);
});

module.exports = {
    presignCertificateUpload,
    listCertificates
};

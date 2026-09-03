const { eq, and, desc } = require('drizzle-orm');
const { db } = require('../db/client');
const { userCourses, courses, certificates } = require('../db/schema');
const { newId, withTimestamps, touch } = require('../db/helpers');

const {
    sendSuccess,
    sendError,
    asyncHandler
} = require('../utilities/helpers/helper');
const { searchUserCourses } = require('../services/userCourseSearchService');
const { HTTP_STATUS } = require('../utilities/constants');

// Helper: turn a joined row into the same flat shape the API has always
// returned (course nested under a "course" key).
//
// Drizzle keys a default (non-namespaced) select+join result by each table's
// SQL name ("UserCourses"/"Courses" per db/schema.ts), not the JS import name
// ("userCourses"/"courses") - confirmed against a live query, not assumed.
const serializeJoinedRow = (row) => {
    const uc = row.UserCourses;
    return {
        id: uc.id,
        userId: uc.userId,
        courseId: uc.courseId,
        status: uc.status,
        isWishlist: uc.isWishlist,
        lastAccessedAt: uc.lastAccessedAt,
        createdAt: uc.createdAt,
        updatedAt: uc.updatedAt,
        course: row.Courses || null,
    };
};

// A UserCourse row with no join partner (e.g. after an insert/update via .returning())
const serializeUserCourse = (uc, course = null) => ({
    id: uc.id,
    userId: uc.userId,
    courseId: uc.courseId,
    status: uc.status,
    isWishlist: uc.isWishlist,
    lastAccessedAt: uc.lastAccessedAt,
    createdAt: uc.createdAt,
    updatedAt: uc.updatedAt,
    course,
});

// GET /api/me/courses/dashboard
// Returns:
// - continueLearning: all courses where status is IN_PROGRESS
// - wishlist: all courses where isWishlist = true
// - completed: all courses where status is COMPLETED
const getDashboard = asyncHandler(async (req, res) => {
    const userId = req.user.userId; //set by authenticate middleware after JWT verification

    const [continueLearningRows, wishlistRows, completedRows] = await Promise.all([
        db.select().from(userCourses).innerJoin(courses, eq(userCourses.courseId, courses.id))
          .where(and(eq(userCourses.userId, userId), eq(userCourses.status, 'in_progress')))
          .orderBy(desc(userCourses.updatedAt)),
        db.select().from(userCourses).innerJoin(courses, eq(userCourses.courseId, courses.id))
          .where(and(eq(userCourses.userId, userId), eq(userCourses.isWishlist, true)))
          .orderBy(desc(userCourses.updatedAt)),
        db.select().from(userCourses).innerJoin(courses, eq(userCourses.courseId, courses.id))
          .where(and(eq(userCourses.userId, userId), eq(userCourses.status, 'completed')))
          .orderBy(desc(userCourses.updatedAt)),
    ]);

    return sendSuccess(res, 'User course dashboard', {
        continueLearning: continueLearningRows.map(serializeJoinedRow),
        wishlist: wishlistRows.map(serializeJoinedRow),
        completed: completedRows.map(serializeJoinedRow),
        counts: {
            continueLearning: continueLearningRows.length,
            wishlist: wishlistRows.length,
            completed: completedRows.length
        }
    });
});

// GET /api/me/courses/search
// Query params:
// - q: string(required)
// - fields: comma-separated list of Course fields to search in (default: title)
//      -- allowed: title, level, certificationType, skills, instructors
// - match: one of (all, prefix, contains, fuzzy) (defaults: all)
// - sort: one of (relevance, recent) (default: relevance)
// - platform, level, certificationType: optional strict filters
// - pageInProgress, pageCompleted, pageWishlist: pagination per section (default: 1)
// - pageSize: page size per section (default: 10)
const searchCourses = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const {
        q,
        fields,
        match,
        sort,
        platform,
        level,
        certificationType,
        pageInProgress,
        pageCompleted,
        pageWishlist,
        pageSize
    } = req.query;

    if (!q || !String(q).trim()) {
        return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Missing required query parameter: q');
    }

    const result = await searchUserCourses({
        userId,
        q,
        fields: fields ? String(fields).split(',') : ['title'],
        match: match || 'all',
        sort: sort || 'relevance',
        pageSize: pageSize || 10,
        pages: {
            inProgress: pageInProgress || 1,
            completed: pageCompleted || 1,
            wishlist: pageWishlist || 1
        },
        filters: {
            platform,
            level,
            certificationType
        }
    });

    return sendSuccess(res, 'User course search', {
        inProgress: {
            data: result.inProgress.data.map(row => serializeUserCourse(row, row.course || null)),
            meta: result.inProgress.meta
        },
        completed: {
            data: result.completed.data.map(row => serializeUserCourse(row, row.course || null)),
            meta: result.completed.meta
        },
        wishlist: {
            data: result.wishlist.data.map(row => serializeUserCourse(row, row.course || null)),
            meta: result.wishlist.meta
        }
    });
});

// POST /api/me/courses/:courseId/wishlist
// Body: { isWishlist: boolean }
// Marks/unmarks the course as wishlisted for the current user
const toggleWishlist = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const courseId = req.params.courseId;
    const { isWishlist } = req.body || {};

    // Quick existence check: we don't want to create links for non-existent courses
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!course) {
        return sendError(res, HTTP_STATUS.NOT_FOUND, 'Course not found');
    }

    const [existing] = await db.select().from(userCourses)
      .where(and(eq(userCourses.userId, userId), eq(userCourses.courseId, courseId)))
      .limit(1);

    let userCourse;
    if (!existing) {
        [userCourse] = await db.insert(userCourses).values(withTimestamps({
            id: newId(),
            userId,
            courseId,
            status: 'not_enrolled',
            isWishlist: Boolean(isWishlist),
            lastAccessedAt: new Date(),
        })).returning();
    } else if (existing.status === 'not_enrolled') {
        [userCourse] = await db.update(userCourses).set(touch({
            isWishlist: Boolean(isWishlist),
            lastAccessedAt: new Date(),
        })).where(eq(userCourses.id, existing.id)).returning();
    } else {
        return sendError(res, HTTP_STATUS.FORBIDDEN, 'Cannot wishlist courses that are in progress, pending verification, or completed');
    }

    return sendSuccess(res, 'Wishlist updated', serializeUserCourse(userCourse, course));
});

// POST /api/me/courses/:courseId/enroll
// Marks a course as "pending_verification" for the current user
// For now, this is a simple, explicit action triggered by a frontend button like 'Enroll'
// The returned payload also contains a redirectUrl which is where the user should be redirected to
// upon enrolling.
// NOTE: we mark status as "pending_verification" as we do not know whether the user purchased the course
const enrollCourse = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const courseId = req.params.courseId;

    // Ensure the course exists
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!course) {
        return sendError(res, HTTP_STATUS.NOT_FOUND, 'Course not found');
    }

    const [existing] = await db.select().from(userCourses)
      .where(and(eq(userCourses.userId, userId), eq(userCourses.courseId, courseId)))
      .limit(1);

    let userCourse;
    if (!existing) {
        [userCourse] = await db.insert(userCourses).values(withTimestamps({
            id: newId(),
            userId,
            courseId,
            status: 'pending_verification',
            isWishlist: false,
            lastAccessedAt: new Date(),
        })).returning();
    } else {
        [userCourse] = await db.update(userCourses).set(touch({
            status: 'pending_verification',
            isWishlist: false,
            lastAccessedAt: new Date(),
        })).where(eq(userCourses.id, existing.id)).returning();
    }

    return sendSuccess(res, 'Course marked as pending_verification', serializeUserCourse(userCourse, course));
});

// POST /api/me/courses/:courseId/verify
// Marks a course as "in_progress" from "pending_verification" for the current user, which drives
// "Continue Learning"
// For now, this is a simple, explicit action triggered by a frontend button like 'Verify Purchase'
const verifyCourseEnrollment = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const courseId = req.params.courseId;

    // Ensure the course exists
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!course) {
        return sendError(res, HTTP_STATUS.NOT_FOUND, 'Course not found');
    }

    const [existing] = await db.select().from(userCourses)
      .where(and(eq(userCourses.userId, userId), eq(userCourses.courseId, courseId)))
      .limit(1);

    let userCourse;
    if (!existing) {
        [userCourse] = await db.insert(userCourses).values(withTimestamps({
            id: newId(),
            userId,
            courseId,
            status: 'in_progress',
            isWishlist: false,
            lastAccessedAt: new Date(),
        })).returning();
    } else {
        const nextStatus = existing.status === 'pending_verification' ? 'in_progress' : existing.status;
        [userCourse] = await db.update(userCourses).set(touch({
            status: nextStatus,
            isWishlist: false,
            lastAccessedAt: new Date(),
        })).where(eq(userCourses.id, existing.id)).returning();
    }

    return sendSuccess(res, 'Course marked as in_progress', serializeUserCourse(userCourse, course));
});

// POST /api/me/courses/:courseId/complete
const completeCourse = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const courseId = req.params.courseId;

    // Data frontend sends AFTER successful S3 upload
    const {
        certificateKey,   // required (string): where the file lives in S3 (object key)
        fileName = null,  // optional: original file name shown in UI
        contentType = null, // optional: e.g., "application/pdf"
        sizeBytes = null  // optional: number (file size)
    } = req.body || {};

    // Phase B2: certificateKey presence/type already enforced by completeCourseSchema.
    // Not "verification of authenticity" - this is just access control:
    // make sure the uploaded key is inside this user's folder prefix.
    const prefix = process.env.AWS_S3_CERTIFICATES_PREFIX || 'certificates/';
    const expectedKeyPrefix = `${prefix}${userId}/`;
    if (!certificateKey.startsWith(expectedKeyPrefix)) {
        return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid certificateKey');
    }

    // Ensure the course exists
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!course) {
        return sendError(res, HTTP_STATUS.NOT_FOUND, 'Course not found');
    }

    // Transaction: both DB writes succeed together or fail together
    const updatedUserCourse = await db.transaction(async (tx) => {
        const [existing] = await tx.select().from(userCourses)
          .where(and(eq(userCourses.userId, userId), eq(userCourses.courseId, courseId)))
          .limit(1);

        let userCourse;
        if (!existing) {
            [userCourse] = await tx.insert(userCourses).values(withTimestamps({
                id: newId(),
                userId,
                courseId,
                status: 'completed',
                isWishlist: false,
                lastAccessedAt: new Date(),
            })).returning();
        } else {
            [userCourse] = await tx.update(userCourses).set(touch({
                status: 'completed',
                isWishlist: false,
                lastAccessedAt: new Date(),
            })).where(eq(userCourses.id, existing.id)).returning();
        }

        // Parse sizeBytes once so we don't repeat parseInt
        const parsedSizeBytes = sizeBytes !== null ? parseInt(sizeBytes, 10) : null;

        const [existingCert] = await tx.select().from(certificates)
          .where(eq(certificates.userCourseId, userCourse.id))
          .limit(1);

        // Store the certificate metadata in DB (no validity checks)
        if (existingCert) {
            // Replace the existing certificate reference with the newly uploaded S3 object
            await tx.update(certificates).set(touch({
                s3Key: certificateKey,
                fileName,
                contentType,
                sizeBytes: parsedSizeBytes,
                uploadedAt: new Date(),
            })).where(eq(certificates.id, existingCert.id));
        } else {
            // No certificate exists yet -> create the first one
            await tx.insert(certificates).values(withTimestamps({
                id: newId(),
                userId,
                courseId,
                userCourseId: userCourse.id,
                s3Key: certificateKey,
                fileName,
                contentType,
                sizeBytes: parsedSizeBytes,
                uploadedAt: new Date(),
            }));
        }

        return userCourse;
    });

    return sendSuccess(res, 'Course marked as completed', serializeUserCourse(updatedUserCourse, course));

});

module.exports = {
    getDashboard,
    searchCourses,
    toggleWishlist,
    enrollCourse,
    verifyCourseEnrollment,
    completeCourse
};

const { eq, and } = require('drizzle-orm');
const { db } = require('../db/client');
const { courses } = require('../db/schema');
const { newId, withTimestamps, touch } = require('../db/helpers');
const pLimit = require('p-limit');

// Bulk upsert of Course records
// - Input: plain JS objects from scraper (no `_reviews`)
// - Deduplicates by (externalId, platform)
// - Runs with limited concurrency for consistency and fewer round trips
const upsertCourses = async (coursesInput = []) => {
    if (!Array.isArray(coursesInput)) coursesInput = [coursesInput];

    const upsertLimit = pLimit(6); // tune 3 - 10 depending on DB

    const results = coursesInput.map(course =>
        upsertLimit(async () => {
            const [existing] = await db
              .select()
              .from(courses)
              .where(and(eq(courses.externalId, course.externalId), eq(courses.platform, course.platform)))
              .limit(1);

            if (!existing) {
                const [row] = await db.insert(courses).values(withTimestamps({
                    id: newId(),
                    externalId: course.externalId,
                    platform: course.platform,
                    title: course.title,
                    deepLink: course.deepLink,
                    imageUrl: course.imageUrl ?? null,
                    rating: course.rating ?? null,
                    durationHours: course.durationHours ?? null,
                    level: course.level ?? null,
                    instructors: course.instructors ?? [],
                    certificationType: course.certificationType ?? null,
                    skills: course.skills ?? [],
                    learningOutcomes: course.learningOutcomes ?? [],
                    shareable: course.shareable ?? null,
                    enrolledCount: course.enrolledCount ?? null,
                    assessmentCount: course.assessmentCount ?? null,
                    metadata: course.metadata ?? {},
                })).returning();
                return row;
            }

            const [row] = await db.update(courses).set(touch({
                title: course.title ?? existing.title,
                deepLink: course.deepLink ?? existing.deepLink,
                imageUrl: course.imageUrl ?? existing.imageUrl,
                rating: typeof course.rating !== 'undefined' ? course.rating : existing.rating,
                durationHours: course.durationHours ?? existing.durationHours,
                level: course.level ?? existing.level,
                learningOutcomes: course.learningOutcomes ?? existing.learningOutcomes,
                skills: course.skills ?? existing.skills,
                shareable: typeof course.shareable !== 'undefined' ? course.shareable : existing.shareable,
                enrolledCount: typeof course.enrolledCount !== 'undefined' ? course.enrolledCount : existing.enrolledCount,
                assessmentCount: typeof course.assessmentCount !== 'undefined' ? course.assessmentCount : existing.assessmentCount,
                instructors: course.instructors ?? existing.instructors,
                certificationType: course.certificationType ?? existing.certificationType,
                metadata: course.metadata ?? existing.metadata,
            })).where(eq(courses.id, existing.id)).returning();
            return row;
        })
    );

    return Promise.all(results);
};

module.exports = { upsertCourses };

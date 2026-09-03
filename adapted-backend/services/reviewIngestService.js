const crypto = require('crypto');
const { eq, and, sql } = require('drizzle-orm');
const { db } = require('../db/client');
const { reviews } = require('../db/schema');
const { newId, withTimestamps, touch } = require('../db/helpers');
const pLimit = require('p-limit');

const makeChecksum = (review) => {
    const basis = [
        review.authorName || '',
        review.body || '',
        review.reviewCreatedAt ? new Date(review.reviewCreatedAt).toISOString() : ''
    ].join('|');
    return crypto.createHash('sha1').update(basis).digest('hex');
};


 // Upsert reviews for a single course.
 // We de-duplicate by a checksum in metadata so the same review
 // is not inserted multiple times across scrapes
const upsertReviews = async (courseId, platform, reviewsInput = []) => {
    const out = [];
    const upsertLimit = pLimit(6); // tune based on DB

    await Promise.all(reviewsInput.map(review =>
        upsertLimit(async () => {
            const checksum = makeChecksum(review);
            const metadata = { ...(review.metadata || {}), checksum };

            const [existing] = review.externalReviewId
              ? await db.select().from(reviews)
                  .where(and(eq(reviews.externalReviewId, review.externalReviewId), eq(reviews.platform, platform)))
                  .limit(1)
              // Fallback dedup: exact-match the merged metadata JSONB blob (mirrors the
              // prior Sequelize `where: { metadata: {...} }` object-equality lookup).
              : await db.select().from(reviews)
                  .where(and(
                    eq(reviews.courseId, courseId),
                    eq(reviews.platform, platform),
                    sql`${reviews.metadata} = ${JSON.stringify(metadata)}::jsonb`,
                  ))
                  .limit(1);

            if (!existing) {
                const [row] = await db.insert(reviews).values(withTimestamps({
                    id: newId(),
                    courseId,
                    platform,
                    externalReviewId: review.externalReviewId || null,
                    rating: review.rating ?? null,
                    body: review.body ?? null,
                    authorName: review.authorName ?? null,
                    helpfulCount: review.helpfulCount ?? null,
                    reviewCreatedAt: review.reviewCreatedAt ? new Date(review.reviewCreatedAt) : null,
                    metadata,
                })).returning();
                out.push(row);
                return;
            }

            const [row] = await db.update(reviews).set(touch({
                rating: review.rating ?? existing.rating,
                body: typeof review.body !== 'undefined' ? review.body : existing.body,
                authorName: typeof review.authorName !== 'undefined' ? review.authorName : existing.authorName,
                helpfulCount: typeof review.helpfulCount !== 'undefined' ? review.helpfulCount : existing.helpfulCount,
                reviewCreatedAt: review.reviewCreatedAt ? new Date(review.reviewCreatedAt) : existing.reviewCreatedAt,
            })).where(eq(reviews.id, existing.id)).returning();
            out.push(row);
        })
    ));
    return out;
};

module.exports = { upsertReviews };

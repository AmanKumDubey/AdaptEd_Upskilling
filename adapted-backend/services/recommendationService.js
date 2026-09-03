const { eq, and, or, inArray, sql } = require('drizzle-orm');
const { db } = require('../db/client');
const { newId, withTimestamps, touch } = require('../db/helpers');
// Aliased: this file already uses local variable names "courses"/"userCourses".
const {
  users,
  courses: coursesTable,
  userCourses: userCoursesTable,
  userRecommendations: userRecommendationsTable,
} = require('../db/schema');

const { shortlistWithAi } = require('./ai/recommendationShortlistService');

// Tunable variables
// - Candidate pool: 300 courses from SQL
// - Shortlist size: fixed at 12 courses, shortlisted by AI
// - TTL: 14 days/2 weeks by default, courses refresh after TTL expires
const DEFAULT_TTL_DAYS = Number(process.env.RECS_TTL_DAYS || 14);
const CANDIDATE_LIMIT = Number(process.env.RECS_CANDIDATE_LIMIT || 200);
const SHORTLIST_SIZE = Number(process.env.RECS_SHORTLIST_SIZE || 12);

const toLower = (v) => String(v || '').toLowerCase().trim();

// buildRecommendationTerms(user)
//
// Convert onboarding fields into search terms
// We keep this simple and robust:
//  - Use goals + interests directly (great for trigram & LIKE search)
//  - Include experienceLevel as a soft hint
const buildRecommendationTerms = (user) => {
    const goals = Array.isArray(user?.goals) ? user.goals : [];
    const interests = Array.isArray(user?.interests) ? user.interests : [];

    const raw = [
        ...goals,
        ...interests,
        user?.experienceLevel ? `level ${user.experienceLevel}` : null
    ].filter(Boolean);

    // Deduplicate and cap term count so SQL stays efficient
    return Array.from(new Set(raw.map(toLower).filter(Boolean))).slice(0, 8);
};

// buildRecommendationCandidateSql({ terms, excludeIds, limit })
//
// Parameterized raw SQL query that:
//  - searches across title/skills/instructors/level/certificationType
//  - uses LIKE + word_similarity/similarity (pg_trgm)
//  - orders by a computed relevanceScore
//  - excludes course IDs we must never recommend
const buildRecommendationCandidateSql = ({ terms, excludeIds, limit }) => {
    const exprs = [
        sql`lower(c."title")`,
        sql`lower(COALESCE((c."skills")::text, ''))`,
        sql`lower(COALESCE((c."instructors")::text, ''))`,
        sql`lower(COALESCE(c."level", ''))`,
        sql`lower(COALESCE(c."certificationType", ''))`,
    ];

    // For each term, we build OR conditions across fields.
    // Example:
    //   title LIKE %term% OR word_similarity(title, term) > threshold OR ...
    //
    // Then we combine all terms with OR (we want recall).
    const whereParts = [];
    const scoreParts = [];

    // Fuzzy threshold: shorter terms shouldn't use fuzzy matching
    const getThreshold = (t) => (t.length <= 4 ? null : t.length <= 7 ? 0.18 : 0.2);

    terms.forEach((term) => {
        const containsPattern = `%${term}%`;
        const threshold = getThreshold(term);

        const termFieldOrs = [];
        const termFieldSims = [];

        for (const e of exprs) {
            // Contains match gives great recall
            termFieldOrs.push(sql`${e} LIKE ${containsPattern}`);

            // Fuzzy match helps if user chose phrases not exactly present
            if (threshold != null) {
                termFieldOrs.push(sql`word_similarity(${e}, ${term}) > ${threshold}`);
            }

            // Build similarity score per field (used for relevance ordering)
            termFieldSims.push(sql`GREATEST(
                COALESCE(similarity(${e}, ${term}), 0),
                COALESCE(word_similarity(${e}, ${term}), 0)
            )`);
        }

        // WHERE for this term
        whereParts.push(sql`(${sql.join(termFieldOrs, sql` OR `)})`);

        // Score contribution for this term: “best similarity across fields”
        scoreParts.push(sql`GREATEST(${sql.join(termFieldSims, sql`,`)})`);
    });

    // Optional exclusion clause
    const excludeSql = (excludeIds && excludeIds.length)
        ? sql`AND c."id" NOT IN ${excludeIds}`
        : sql``;

    // Final SQL:
    //  - We compute a relevanceScore (sum of best similarities per term)
    //  - Sort by relevanceScore, then rating/enrollment as tie-breakers
    //
    // Every interpolated ${} value is automatically parameterized by Drizzle's
    // sql tag - protects against injection the same way Sequelize's named
    // `replacements` did.
    return sql`
    WITH scored AS (
      SELECT
        c.*,
        (${scoreParts.length ? sql.join(scoreParts, sql` + `) : sql`0`}) AS "relevanceScore"
      FROM "Courses" c
      WHERE (${whereParts.length ? sql.join(whereParts, sql` OR `) : sql`1=1`})
      ${excludeSql}
    )
    SELECT *
    FROM scored
    ORDER BY
      "relevanceScore" DESC,
      "rating" DESC NULLS LAST,
      "enrolledCount" DESC NULLS LAST,
      "createdAt" DESC
    LIMIT ${limit};
  `;
};

// getExcludedCourseIds(userId, recRow)
//
// Excludes:
//  - wishlist courses
//  - enrolled/in_progress/pending_verification/completed
//  - current & previous recommendation batches
const getExcludedCourseIds = async ({ userId, recRow }) => {
    // 1) Exclude all courses in UserCourse relationships we don't want recommended
    const excludedUserCourses = await db.select({ courseId: userCoursesTable.courseId }).from(userCoursesTable)
      .where(and(
        eq(userCoursesTable.userId, userId),
        or(
          eq(userCoursesTable.isWishlist, true),
          inArray(userCoursesTable.status, ['pending_verification', 'enrolled', 'in_progress', 'completed']),
        ),
      ));

    const exclude = new Set(excludedUserCourses.map(r => r.courseId));

    // 2) Exclude current & previous recommendation course IDs
    const pullIdsFromBatch = (batch) => {
        if (!batch || !Array.isArray(batch.items)) return [];
        return batch.items.map(x => x.courseId).filter(Boolean);
    };

    if (recRow?.current) pullIdsFromBatch(recRow.current).forEach(id => exclude.add(id));
    if (recRow?.previousBatch) pullIdsFromBatch(recRow.previousBatch).forEach(id => exclude.add(id));
    
    return Array.from(exclude);
};

// assignBadges(finalCourses)
//
// Badge Rules:
//  - 1 "AI Best Fit" (highest aiFitScore)
//  - 1 "Popular" (highest enrolledCount among remaining)
//  - 1 "Best Rated" (highest rating among remaining)
//  - 1 "Fast Track" (lowest durationHours among remaining)
const assignBadges = (finalCourses) => {
    const items = finalCourses.map(course => ({
        courseId: course.id,
        aiFitScore: Number(course.aiFitScore || 0),
        badges: []
    }));

    // Helper: choose an index by predicate, skipping already-selected badge winners
    const used =  new Set();

    const pickIndex = (scorer) => {
        let bestIdx = -1;
        let bestVal = null;

        for (let i = 0; i < finalCourses.length; i++) {
            if (used.has(i)) continue;

            const val = scorer(finalCourses[i]);
            if (val == null) continue;

            if (bestVal == null || val > bestVal) {
                bestVal = val;
                bestIdx = i;
            }
        }
        return bestIdx;
    };

    // 1) AI Best Fit
    const aiBestIdx = pickIndex(course => Number(course.aiFitScore || 0));
    if (aiBestIdx >= 0) {
        items[aiBestIdx].badges.push('AI Best Fit');
        used.add(aiBestIdx);
    }

    // 2) Popular (enrolledCount)
    const popularIdx = pickIndex(course => course.enrolledCount != null ? Number(course.enrolledCount) : null);
    if (popularIdx >= 0) {
        items[popularIdx].badges.push('Popular');
        used.add(popularIdx);
    }

    // 3) Best Rated (rating)
    const ratedIdx = pickIndex(c => c.rating != null ? Number(c.rating) : null);
    if (ratedIdx >= 0) {
        items[ratedIdx].badges.push('Best Rated');
        used.add(ratedIdx);
    }

    // 4) Fast Track (lowest durationHours)
    let fastIdx = -1;
    let fastVal = null;
    for (let i = 0; i < finalCourses.length; i++) {
        if (used.has(i)) continue;
        const hrs = finalCourses[i].durationHours != null ? Number(finalCourses[i].durationHours) : null;
        if (hrs == null || hrs <= 0) continue;

        // lowest hours wins
        if (fastVal == null || hrs < fastVal) {
            fastVal = hrs;
            fastIdx = i;
        }
    }
    if (fastIdx >= 0) {
        items[fastIdx].badges.push('Fast Track');
        used.add(fastIdx);
    }

    return items;
};

// readRecommendationForUser({ userId })
//
// Returns:
//  - data: Course objects in the stored order
//  - meta: status + refreshing flag + shouldGenerate (so controller can schedule)
const readRecommendationForUser = async ({ userId }) => {
    const [recRow] = await db.select().from(userRecommendationsTable).where(eq(userRecommendationsTable.userId, userId)).limit(1);

    // If no row, treat as "generating" (worker needs to create it)
    if (!recRow) {
        return {
            data: [],
            meta: {
                status: 'generating',
                refreshing: false,
                expiresAt: null,
                generatedAt: null,
                shouldGenerate: true,   // controller will schedule generation
                pollAfterMs: 25000
            }
        };
    }

    const now = new Date();

    // If current batch exists, load courses in the same order
    const items = Array.isArray(recRow.current?.items) ? recRow.current.items : [];
    const ids = items.map(x => x.courseId).filter(Boolean);

    let matchedCourses = [];
    if (ids.length) {
        const rows = await db.select().from(coursesTable).where(inArray(coursesTable.id, ids));
        const byId = new Map(rows.map(r => [r.id, r]));

        // Preserve the stored ordering
        matchedCourses = ids.map((id, idx) => {
            const courseObj = byId.get(id);
            if (!courseObj) return null;

            return {
                ...courseObj,
                aiFitScore: Number(items[idx]?.aiFitScore || 0),
                badges: Array.isArray(items[idx]?.badges) ? items[idx].badges : []
            };
        }).filter(Boolean);
    }

    const expired = recRow.expiresAt ? (new Date(recRow.expiresAt) <= now) : true;

    // Determine whether worker generation should happen
    const shouldGenerate = recRow.status === 'generating' || expired;

    // If generating but we already have current data, frontend shows it with “updating...”
    const refreshing = (recRow.status === 'generating') && (matchedCourses.length > 0);

    return {
        data: matchedCourses,
        meta: {
            status: recRow.status,
            refreshing,
            expiresAt: recRow.expiresAt || null,
            generatedAt: recRow.generatedAt || null,
            shouldGenerate,
            pollAfterMs: 25000
        }
    };
};

// scheduleRecommendationGeneration({ userId, generationToken, force })
//
// This is how the API "queues" work for the worker
//
//  - If record doesn't exist: create it with status=generating
//  - If record exists:
//      - if force=true -> set generating immediately
//      - else -> only set generating if expired or missing current recs
const scheduleRecommendationGeneration = async ({ userId, generationToken, force }) => {
    const [recRow] = await db.select().from(userRecommendationsTable).where(eq(userRecommendationsTable.userId, userId)).limit(1);
    const now = new Date();

    if (!recRow) {
        await db.insert(userRecommendationsTable).values(withTimestamps({
            id: newId(),
            userId,
            status: 'generating',
            nextRunAt: now,
            attempts: 0,
            lastError: null,
            generationToken
        }));
        return;
    }

    const expired = recRow.expiresAt ? (new Date(recRow.expiresAt) <= now) : true;
    const hasCurrent = Array.isArray(recRow.current?.items) && recRow.current.items.length > 0;

    // If not forcing, only schedule if it truly needs generation
    if (!force && !expired && hasCurrent && recRow.status === 'ready') {
        return;
    }

    // Mark generating so the worker will pick it up
    await db.update(userRecommendationsTable).set(touch({
        status: 'generating',
        nextRunAt: now,
        attempts: 0,
        lastError: null,
        generationToken,
    })).where(eq(userRecommendationsTable.id, recRow.id));
};

// generateRecommendationForUser({ userId })
//
// Worker-only logic:
// 1) build terms for user goals/interests
// 2) get exclusions (wishlist + enrolled/in_progress/completed/pending_verification)
// 3) SQL fetch 200-300 candidates
// 4) AI shortlists EXACTLY 12 (or fewer if not enough)
// 5) assign badges
// 6) save batch + set expiry
const generateRecommendationForUser = async ({ userId }) => {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
        throw new Error('User not found for recommendations');
    }

    const [recRow] = await db.select().from(userRecommendationsTable).where(eq(userRecommendationsTable.userId, userId)).limit(1);

    const terms = buildRecommendationTerms(user);
    const excludeIds = await getExcludedCourseIds({ userId, recRow });

    const candidateSql = buildRecommendationCandidateSql({ terms, excludeIds, limit: CANDIDATE_LIMIT });

    // Raw SQL query (same style as globalCourseSearchService)
    const result = await db.execute(candidateSql);
    const candidates = result.rows || result;

    console.log('[RECO] candidates type:', Array.isArray(candidates), 'len=', candidates?.length);

    // Ask AI to shortlist from the candidates
    const shortlisted = await shortlistWithAi(user, candidates);

    // Attach aiFitScore onto returned course rows
    // shortlistWithAi returns final course rows
    const finalCourses = shortlisted;

    // Assign deterministic badges AFTER AI selection
    const items = assignBadges(finalCourses);

    // TTL window
    const generatedAt = new Date();
    // const expiresAt = new Date(Date.now() + DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000);
    // TEMPORARY TESTING
    const expiresAt = new Date(Date.now() + 60000);

    const batch = {
        generatedAt: generatedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        items
    };

    return { batch, generatedAt, expiresAt };
};

module.exports = {
    readRecommendationForUser,
    scheduleRecommendationGeneration,
    generateRecommendationForUser
};
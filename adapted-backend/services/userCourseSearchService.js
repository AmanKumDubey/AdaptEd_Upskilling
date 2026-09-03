const { eq, and, inArray, sql } = require('drizzle-orm');
const { db } = require('../db/client');
const { courses, userCourses } = require('../db/schema');

// Search across a user's UserCourse rows (joined with Course)
// and return 3 separate categories for the dashboard UX:
// - inProgress (status = 'in_progress')
// - completed (status = 'completed')
// - wishlist (isWishlist = true)
//
// This service is optimized for Postgres using pg_trgm (trigram) search on
// Course.title by default
//
// Phase B3 implementation note: a single SQL join between UserCourses and
// Courses would collide same-named columns (both have "id", "createdAt", ...),
// silently corrupting results. Instead: fetch each category's UserCourse rows
// via Drizzle (small, per-user, indexed), then score/match/filter the
// referenced Courses in one single-table raw query (safe - no join, no
// collision), then join the two result sets in JS and paginate there.
const searchUserCourses = async ({
    userId,
    q,
    fields = ['title'],
    match = 'all',
    sort = 'relevance',
    pageSize = 10,
    pages = { inProgress: 1, completed: 1, wishlist: 1 },
    filters = {}
}) => {
    const query = String(q || '').trim();
    const queryLower = query.toLowerCase();
    const queryLength = queryLower.length;

    // Heuristic thresholds for fuzzy matching:
    // - very short queries are too noisy for fuzzy (disable it)
    // - medium-length queries tolerate typos well with a lower cutoff
    // - longer queries can be stricter
    const fuzzyThreshold =
        queryLength <= 4 ? null :
            queryLength <= 7 ? 0.18 :
                0.2;

    const safePageSize = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 50);

    const toInt = (v, def = 1) => {
        const n = parseInt(v, 10);
        return Number.isFinite(n) && n > 0 ? n : def;
    };

    const normalizedPages = {
        inProgress: toInt(pages.inProgress, 1),
        completed: toInt(pages.completed, 1),
        wishlist: toInt(pages.wishlist, 1)
    };

    const normalizeFields = (rawFields = []) => {
        const allowed = new Set([
            'title',
            'level',
            'certificationType',
            'skills',
            'instructors'
        ]);

        const selected = Array.isArray(rawFields) ? rawFields : String(rawFields).split(',');
        const cleaned = selected
            .map(f => String(f).trim())
            .filter(Boolean)
            .filter(f => allowed.has(f));

        return cleaned.length ? cleaned : ['title'];
    };

    const selectedFields = normalizeFields(fields);

    // Build searchable SQL expressions (lowercased) for each selected field.
    const fieldExprMap = {
        title: sql`lower(title)`,
        level: sql`lower(level)`,
        certificationType: sql`lower("certificationType")`,
        skills: sql`lower(COALESCE((skills)::text, ''))`,
        instructors: sql`lower(COALESCE((instructors)::text, ''))`,
    };

    const exprs = selectedFields.map(f => fieldExprMap[f]).filter(Boolean);

    // 1) Fetch this user's UserCourse rows per category (small, per-user, indexed).
    const [inProgressUcRows, completedUcRows, wishlistUcRows] = await Promise.all([
        db.select().from(userCourses).where(and(eq(userCourses.userId, userId), eq(userCourses.status, 'in_progress'))),
        db.select().from(userCourses).where(and(eq(userCourses.userId, userId), eq(userCourses.status, 'completed'))),
        db.select().from(userCourses).where(and(eq(userCourses.userId, userId), eq(userCourses.isWishlist, true))),
    ]);

    const allCourseIds = Array.from(new Set([
        ...inProgressUcRows.map(r => r.courseId),
        ...completedUcRows.map(r => r.courseId),
        ...wishlistUcRows.map(r => r.courseId),
    ]));

    if (!allCourseIds.length) {
        const empty = { data: [], meta: { page: 1, pageSize: safePageSize, total: 0, totalPages: 0 } };
        return { inProgress: empty, completed: empty, wishlist: empty };
    }

    // 2) Score + filter Courses in one single-table raw query (no join, no column collision).
    const prefixPattern = `${queryLower}%`;
    const containsPattern = `%${queryLower}%`;

    const matchConditions = [];
    if (match === 'prefix' || match === 'all') matchConditions.push(...exprs.map(e => sql`${e} LIKE ${prefixPattern}`));
    if (match === 'contains' || match === 'all') matchConditions.push(...exprs.map(e => sql`${e} LIKE ${containsPattern}`));
    if ((match === 'fuzzy' || match === 'all') && fuzzyThreshold != null) {
        matchConditions.push(...exprs.map(e => sql`word_similarity(${e}, ${queryLower}) > ${fuzzyThreshold}`));
    }
    const matchWhereSql = matchConditions.length
      ? sql.join(matchConditions, sql` OR `)
      : sql`(1=0)`;

    const simParts = exprs.map(e => sql`GREATEST(COALESCE(similarity(${e}, ${queryLower}), 0), COALESCE(word_similarity(${e}, ${queryLower}), 0))`);
    const bestSimSql = simParts.length ? sql`GREATEST(${sql.join(simParts, sql`, `)})` : sql`0`;
    const prefixBonusParts = exprs.map(e => sql`CASE WHEN ${e} LIKE ${prefixPattern} THEN 2 ELSE 0 END`);
    const containsBonusParts = exprs.map(e => sql`CASE WHEN ${e} LIKE ${containsPattern} THEN 1 ELSE 0 END`);
    const relevanceScoreSql = sql`(${bestSimSql} + (${sql.join(prefixBonusParts, sql` + `)}) + (${sql.join(containsBonusParts, sql` + `)}))`;

    const courseFilterConditions = [inArray(courses.id, allCourseIds), sql`(${matchWhereSql})`];
    if (filters.platform) courseFilterConditions.push(eq(courses.platform, filters.platform));
    if (filters.level) courseFilterConditions.push(eq(courses.level, filters.level));
    if (filters.certificationType) courseFilterConditions.push(eq(courses.certificationType, filters.certificationType));

    const matchedCourseRows = await db
      .select({ course: courses, relevanceScore: relevanceScoreSql })
      .from(courses)
      .where(and(...courseFilterConditions));

    const courseById = new Map(matchedCourseRows.map(r => [r.course.id, { course: r.course, relevanceScore: Number(r.relevanceScore) }]));

    // 3) Join in JS, then sort + paginate each category.
    const buildCategory = (ucRows, page) => {
        const joined = ucRows
          .map(uc => {
              const scored = courseById.get(uc.courseId);
              if (!scored) return null;
              return { ...uc, course: scored.course, relevanceScore: scored.relevanceScore };
          })
          .filter(Boolean);

        joined.sort((a, b) => {
            if (sort === 'recent') {
                const byAccess = new Date(b.lastAccessedAt || 0) - new Date(a.lastAccessedAt || 0);
                if (byAccess !== 0) return byAccess;
                if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            }
            if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
            const byAccess = new Date(b.lastAccessedAt || 0) - new Date(a.lastAccessedAt || 0);
            if (byAccess !== 0) return byAccess;
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });

        const total = joined.length;
        const offset = (page - 1) * safePageSize;
        const data = joined.slice(offset, offset + safePageSize);

        return {
            data,
            meta: {
                page,
                pageSize: safePageSize,
                total,
                totalPages: Math.ceil(total / safePageSize)
            }
        };
    };

    return {
        inProgress: buildCategory(inProgressUcRows, normalizedPages.inProgress),
        completed: buildCategory(completedUcRows, normalizedPages.completed),
        wishlist: buildCategory(wishlistUcRows, normalizedPages.wishlist),
    };
};

module.exports = { searchUserCourses };

const { eq, sql } = require('drizzle-orm');
const { db } = require('../db/client');
const { users, courses } = require('../db/schema');
const { aiRerankAndTag, getHeuristicTags } = require('./ai/aiCourseRankingService');

// Helpers to parse query inputs safely
const toInt = (v, def = 1) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : def;
};

const toFloat = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
};

const parseCsv = (v) => {
    if (!v) return null;
    if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean);
    return String(v).split(',').map(s => s.trim()).filter(Boolean);
};

// Normalize fields list:
// - allow only known searchable fields (to prevent SQL injection through field names)
// - provide a default set for global search recall
const normalizeFields = (rawFields) => {
    const allowed = new Set([
        'title',
        'level',
        'certificationType',
        'skills',
        'instructors'
    ]);

    const selected = Array.isArray(rawFields) ? rawFields : String(rawFields || '').split(',');

    const cleaned = selected
        .map(f => String(f).trim())
        .filter(Boolean)
        .filter(f => allowed.has(f));

    // Default is wider recall: title + skills + instructors
    return cleaned.length ? cleaned : ['title', 'skills', 'instructors'];
};

// Build a Drizzle SQL expression for each field (all against the "c" alias)
const buildFieldExprs = (fields) => {
    const map = {
        title: sql`lower(c."title")`,
        level: sql`lower(c."level")`,
        certificationType: sql`lower(c."certificationType")`,
        skills: sql`lower(COALESCE((c."skills")::text, ''))`,
        instructors: sql`lower(COALESCE((c."instructors")::text, ''))`,
    };

    return fields.map(f => map[f]).filter(Boolean);
};

// Build match WHERE SQL + relevance score SQL
//
// Match modes:
// - prefix: title LIKE 'foo%'
// - contains: title LIKE '%foo%'
// - fuzzy: word_similarity(title, 'foo') > threshold
// - all: OR combination of prefix + contains + fuzzy
//
// The relevance score:
// - best similarity across fields
// - plus bonuses if prefix/contains hit (so exact-ish hits rank higher)
const buildSearchSql = ({ exprs, queryLower, match }) => {
    const qLen = queryLower.length;

    // Keep consistent with local search thresholds
    // Short queries don't use fuzzy matching
    const fuzzyThreshold = qLen <= 4 ? null : qLen <= 7 ? 0.18 : 0.2;
    const qPrefix = `${queryLower}%`;
    const qContains = `%${queryLower}%`;

    // Build each match strategy per field
    const prefix = exprs.map(e => sql`${e} LIKE ${qPrefix}`);
    const contains = exprs.map(e => sql`${e} LIKE ${qContains}`);
    const fuzzy = (fuzzyThreshold != null)
        ? exprs.map(e => sql`word_similarity(${e}, ${queryLower}) > ${fuzzyThreshold}`)
        : [];

    // Decide match behavior
    const whereSql = (() => {
        if (match === 'prefix') return sql`(${sql.join(prefix, sql` OR `)})`;
        if (match === 'contains') return sql`(${sql.join(contains, sql` OR `)})`;
        if (match === 'fuzzy') return fuzzy.length ? sql`(${sql.join(fuzzy, sql` OR `)})` : sql`(1=0)`;

        // Default: "all" = prefix OR contains OR fuzzy
        return sql`(${sql.join([...prefix, ...contains, ...fuzzy], sql` OR `)})`;
    })();

    // Similarity scoring: take the best similarity across any field
    const simParts = exprs.map(e => sql`GREATEST(
        COALESCE(similarity(${e}, ${queryLower}), 0),
        COALESCE(word_similarity(${e}, ${queryLower}), 0)
    )`);
    const bestSim = simParts.length ? sql`GREATEST(${sql.join(simParts, sql`,`)})` : sql`0`;

    // Bonus points for prefix matches (strong signal)
    const prefixBonus = exprs.map(e => sql`CASE WHEN ${e} LIKE ${qPrefix} THEN 2 ELSE 0 END`);
    const containsBonus = exprs.map(e => sql`CASE WHEN ${e} LIKE ${qContains} THEN 1 ELSE 0 END`);

    // Final relevance score used for ordering
    const relevanceScoreSql = sql`(${bestSim} + (${sql.join(prefixBonus, sql` + `)}) + (${sql.join(containsBonus, sql` + `)}))`;

    return { whereSql, relevanceScoreSql };
};

// Build SQL filters. Filters are independent and can combine
//
// Current supported filters:
// - platform
// - level
// - certificationType
// - minRating/maxRating
const buildFiltersSql = ({ filters }) => {
    const clauses = [];

    // platform can be a CSV list: "Coursera, Udemy"
    const platforms = parseCsv(filters.platform);
    if (platforms && platforms.length) {
        clauses.push(sql`c."platform" IN ${platforms}`);
    }

    // level can be CSV
    const levels = parseCsv(filters.level);
    if (levels && levels.length) {
        clauses.push(sql`c."level" IN ${levels}`);
    }

    // certificationType can be CSV
    const certs = parseCsv(filters.certificationType);
    if (certs && certs.length) {
        clauses.push(sql`c."certificationType" IN ${certs}`);
    }

    // rating range filters
    const minRating = toFloat(filters.minRating);
    const maxRating = toFloat(filters.maxRating);

    if (minRating != null) {
        clauses.push(sql`c."rating" >= ${minRating}`);
    }
    if (maxRating != null) {
        clauses.push(sql`c."rating" <= ${maxRating}`);
    }

    return clauses.length ? sql`AND ${sql.join(clauses, sql` AND `)}` : sql``;
};

// Sorting Rules
//
// We always have relevanceScore available because this endpoint requires q
// You can expose these in frontend as dropdown options
const buildOrderSql = ({ sort }) => {
    if (sort === 'rating') {
        return sql`"rating" DESC NULLS LAST, "relevanceScore" DESC, "createdAt" DESC`;
    }
    if (sort === 'new' || sort === 'recent') {
        return sql`"createdAt" DESC, "relevanceScore" DESC`;
    }
    if (sort === 'trending') {
        return sql`"enrolledCount" DESC NULLS LAST, "relevanceScore" DESC, "rating" DESC NULLS LAST`;
    }

    // default
    return sql`"relevanceScore" DESC, "rating" DESC NULLS LAST, "createdAt" DESC`;
};

// searchGlobalCourses(...)
//
// This is the main service used by the controller. It:
// 1) searches Course table across fields using pg_trgm
// 2) applies filters
// 3) applies sort + pagination
// 4) adds aiTags + aiFitScore (AI best-effort)
//
// Performance Strategy:
// - the DB query is fast due to indexes
// - AI rerank is applied only on page 1 and only to top N candidates
// - heuristic tags ALWAYS returned, even if AI fails
const searchGlobalCourses = async({
    userId,
    q,
    fields,
    match = 'all',
    sort = 'relevance',
    page = 1,
    pageSize = 20,
    filters = {},
    ai = true
}) => {
    const query = String(q || '').trim();

    // If no query, return empty
    // (Ticket says keyword search; so we treat q as required)
    if (!query) {
        return {
            data: [],
            meta: { page: 1, pageSize: 0, total: 0, totalPages: 0, ai: { applied: false } }
        };
    }

    const queryLower = query.toLowerCase();

    // Clamp paging to protect DB and API
    const safePageSize = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 50);
    const safePage = toInt(page, 1);
    const offset = (safePage - 1) * safePageSize;

    // Determine fields and build search SQL parts
    const selectedFields = normalizeFields(fields);
    const exprs = buildFieldExprs(selectedFields);

    const { whereSql, relevanceScoreSql } = buildSearchSql({
        exprs,
        queryLower,
        match
    });

    const filtersSql = buildFiltersSql({ filters });

    // AI application strategy:
    // - Only apply AI rerank on page 1 to keep API <= 500ms typical
    // - For page 2+, we still provide heuristic tags (so UI is consistent)
    const shouldApplyAi = Boolean(ai) && safePage === 1 && Boolean(userId);

    // Prefetch strategy:
    // - If we will AI-rerank, fetch more than one page (e.g., 3x page size)
    // - Then AI reranks within that pool and we return the best pageSize items
    //
    // This gives the “AI filtered best results for the user” promise on page 1
    // without needing to AI-rerank huge amounts of data
    const prefetch = shouldApplyAi ? Math.min(60, safePageSize * 3) : safePageSize;

    const orderSql = buildOrderSql({ sort });

    // SQL query:
    // - Use a CTE to calculate relevanceScore
    // - COUNT(*) OVER() gives total rows without a second COUNT query
    //
    // Every interpolated ${} value below is automatically parameterized by
    // Drizzle's sql tag - protects against injection the same way Sequelize's
    // named `replacements` did.
    const query_ = sql`
        WITH filtered AS (
            SELECT
                c.*,
                ${relevanceScoreSql} AS "relevanceScore"
            FROM "Courses" c
            WHERE ${whereSql}
            ${filtersSql}
        )
        SELECT
            *,
            COUNT(*) OVER() AS "__total"
        FROM filtered
        ORDER BY ${orderSql}
        LIMIT ${prefetch}
        OFFSET ${offset}
    `;

    // Execute query
    const result = await db.execute(query_);
    const rows = result.rows || result;

    // Extract total from window function result
    const total = rows.length ? Number(rows[0].__total || 0) : 0;
    const totalPages = total ? Math.ceil(total / safePageSize) : 0;

    // Remove helper total field from returned objects
    const candidates = rows.map(r => {
        const { __total, ...rest } = r;
        return rest;
    });

    // Metadata about AI usage (for debugging + analytics)
    let aiMeta = { applied: false };

    if (shouldApplyAi) {
        // Load user for personalization if available
        const user = userId
          ? await db.select().from(users).where(eq(users.id, userId)).limit(1).then(rows => rows[0] || null).catch(() => null)
          : null;

        const aiTimeoutMs = Number(process.env.AI_TIMEOUT_MS || 1000)

        // AI rerank small top candidate pool
        const { byId, aiApplied, aiError, fromCache } = await aiRerankAndTag({
            user,
            query,
            courses: candidates,
            maxCandidates: Math.min(15, candidates.length),
            timeoutMs: aiTimeoutMs
        });

        aiMeta = {
            applied: Boolean(aiApplied),
            fromCache: Boolean(fromCache),
            error: aiError || null
        };

        // Attach AI fields onto each course result
        for (const c of candidates) {
            const v = byId[c.id];
            c.aiFitScore = v?.fitScore ?? 0;
            c.aiTags = v?.tags ?? [];
        }

        // If AI applied successfully, allow it to affect ordering
        // (primary: aiFitScore; secondary: relevanceScore)
        if (aiApplied && (sort === 'relevance' || sort === 'ai')) {
            candidates.sort((a, b) => {
                const fa = Number(a.aiFitScore) || 0;
                const fb = Number(b.aiFitScore) || 0;
                if (fb !== fa) return fb - fa;

                const ra = Number(a.relevanceScore) || 0;
                const rb = Number(b.relevanceScore) || 0;
                return rb - ra;
            });
        }
    } else {
        // AI skipped: still provide heuristic tags so UI satisfies acceptance criteria
        for (const c of candidates) {
            c.aiFitScore = 0;
            c.aiTags = getHeuristicTags({ user: null, course: c });
        }

        aiMeta = {
            applied: false,
            skipped: safePage !== 1 ? 'AI rerank is only applied on page 1 by default' : null
        };
    }

    // Return only one page worth of results
    const pageRows = candidates.slice(0, safePageSize);

    return {
        data: pageRows,
        meta: {
            page: safePage,
            pageSize: safePageSize,
            total,
            totalPages,
            ai: aiMeta
        }
    };
};

module.exports = { searchGlobalCourses };

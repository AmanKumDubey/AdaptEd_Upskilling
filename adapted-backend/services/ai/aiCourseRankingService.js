const { sendChat } = require('./adaptedChatClient');

// Allowed tags for UI (from ticket)
// Budget Friendly is currently removed as we don't hve price metrics right now
const ALLOWED_TAGS = [
    'Top Rated',
    'Best Fit',
    'Trending',
    'Beginner Friendly',
    'Fast Track'
];

// In-memory cache
//
// Why this exists:
//  -   AI calls can be slow relative to the fast requirement for search
//  -   Many searches repeat (same query, same candidate courses)
//  -   Cache makes "typical" responses fast
//
// Tradeoffs:
//  -   In-memory cahce resets on server restart
//  -   But it's simple and still provides huge value
const CACHE = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE_MAX = 250; // cap memory

const now = () => Date.now();

// Light cache pruning
const pruneCache = () => {
    if (CACHE.size <= CACHE_MAX) return;

    const keys = CACHE.keys();
    for (let i = 0; i < Math.floor(CACHE_MAX / 5); i++) {
        const key = keys.next().value;
        if (!key) break;
        CACHE.delete(key);
    }
};

// Clamp a number into [0,1]
// We use this for fitScore
const clamp01 = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
};

// safeJsonParse(text)
// The AI chat API endpoint might return JSON, plain text, streamed text
// In these cases, the content might still contain a JSON object
// So we find first '{' and last '}' and attempt to parse
// If fails, return null
const safeJsonParse = (text) => {
    if (!text) return null;

    const str = String(text);
    const start = str.indexOf('{');
    const end = str.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;

    try {
        return JSON.parse(str.slice(start, end + 1));
    } catch (_) {
        return null;
    }
};

const normalizeStr = (v) => String(v || '').toLowerCase();

// getHeuristicTags({ user, course })
// We require AI tags returned for each course but AI calls may fail, rate limit, or timeout
// So we ALWAYS provide tags via deterministic rules
//
// These tags are 'good enough' baseline labels:
// - Top Rated: high Rating
// - Trending: high enrolled count
// - Beginner Friendly: course level indicates beginner
// - Fast Track: short duration
// - Best Fit: (heuristic) user goals/interests match course text
const getHeuristicTags = ({ user, course }) => {
    const tags = [];

    // Top Rated: high star rating
    const rating = course.rating != null ? Number(course.rating) : null;
    if (rating != null && rating >= 4.7) tags.push('Top Rated');

    // Trending: large enrollment
    const enrolled = course.enrolledCount != null ? Number(course.enrolledCount) : null;
    if (enrolled != null && enrolled >= 100000) tags.push('Trending');

    // Beginner Friendly: course.level contains "beginner"
    const level = normalizeStr(course.level);
    if (level.includes('beginner')) tags.push('Beginner Friendly');

    // Fast Track: short duration
    const hours = course.durationHours != null ? Number(course.durationHours) : null;
    if (hours != null && hours <= 10 && hours > 0) tags.push('Fast Track');

    // Best Fit: heuristic match (user goals/interests)
    const userTerms = [
        ...(Array.isArray(user?.goals) ? user.goals : []),
        ...(Array.isArray(user?.interests) ? user.interests : [])
    ]
        .map(normalizeStr)
        .filter(Boolean)
    
    // Build searchable blob of course content
    const courseBlob = [
        course.title,
        JSON.stringify(course.skills || []),
        JSON.stringify(course.instructors || [])
    ].map(normalizeStr).join(' ');

    // If any user term appears in course text, consider it a better fit
    const termHit = userTerms.some(t => t && courseBlob.includes(t));
    if (termHit) tags.unshift('Best Fit');

    // Remove duplicates and limit to 3 tags
    return Array.from(new Set(tags)).slice(0, 3);
};

// aiRerankAndTag(...)
//
// This function assigns an aiFitScore (0...1) and assigns aiTags(0..3) for each course
//
// This function always returns something (baseline tags)
// Keeps gloval search under 500ms typically
// Will use AI only when it fits within the latency budget
const aiRerankAndTag = async ({
    user,
    query,
    courses,
    maxCandidates = 15,
    timeoutMs = Number(process.env.AI_TIMEOUT_MS || 10000)
}) => {
    // We only AI-rank a small candidate set to keep the prompt small and fast
    const slicedCourses = Array.isArray(courses) ? courses.slice(0, maxCandidates) : [];
    if (!slicedCourses.length) return { byId: {}, aiApplied: false };

    // Baseline output so tags always exist
    const baseline = {};
    for (const course of slicedCourses) {
        baseline[course.id] = { fitScore: 0, tags: getHeuristicTags({ user, course: course }) };
    }

    // Cache key includes:
    // - user identity (because personalization changes rankings)
    // - query
    // - candidate IDs (because the AI output depends on candidates)
    const cacheKey = `${user?.id || 'anon'}|${normalizeStr(query)}|${slicedCourses.map(c => c.id).join(',')}`;
    const cached = CACHE.get(cacheKey);

    if (cached && (now() - cached.ts) < CACHE_TTL_MS) {
        // Cache hit: fast return
        return { byId: cached.byId, aiApplied: true, fromCache: true };
    }

    // We send a system instruction that forces strict JSON output
    // This prevents the AI from writing paragraphs
    //
    // The model is expected to return:
    // {
    //  "123": { "fitScore": 0.91, "tags": ["Best Fit", "Trending"] },
    //  "456": { "fitScore": 0.42, "tags": ["Beginner Friendly"] }
    // }
    //
    const system = {
        role: 'system',
        content: [
            'You are a course ranking assistant for an education app.',
            'Return STRICT JSON ONLY. No extra text.',
            'Input: user context, keyword query, candidate courses.',
            'Output:',
            '{ "<courseId>": { "fitScore": number 0..1, "tags": string[] }, ... }',
            `Allowed tags: ${ALLOWED_TAGS.join(', ')}.`,
            'Rules:',
            '- tags length must be 0..3',
            '- tags must be from Allowed tags only',
            '- Use "Best Fit" when the course strongly matches user + query'
        ].join('\n')
    };

    // We keep the user payload compact to reduce response time
    const userMsg = {
        role: 'user',
        content: JSON.stringify({
            query,
            user: {
                goals: user?.goals || [],
                interests: user?.interests || [],
                experienceLevel: user?.experienceLevel || null
            },
            courses: slicedCourses.map(course => ({
                id: course.id,
                title: course.title,
                platform: course.platform,
                rating: course.rating,
                level: course.level,
                certificationType: course.certificationType,
                durationHours: course.durationHours,
                enrolledCount: course.enrolledCount,
                skills: course.skills,
                instructors: course.instructors
            }))
        })
    };

    try {
        // Send to Quantana AI endpoint with a hard timeout (for latency control)
        const response = await sendChat({
            messages: [system, userMsg],
            timeoutMs
        });

        // response can be JSON object or text; support both
        const parsed = (typeof response === 'object' && response)
            ? response
            : safeJsonParse(response);
        
        // If AI output isn't valid JSON, fallback to baseline
        if (!parsed || typeof parsed !== 'object') {
            return { byId: baseline, aiApplied: false };        
        }

        // Merge AI output into baseline
        const byId = { ...baseline };

        for (const [id, v] of Object.entries(parsed)) {
            if (!byId[id]) continue;

            // Validate fitScore and tags
            const fitScore = clamp01(v?.fitScore);
            const tags = Array.isArray(v?.tags)
                ? v.tags
                    .map(t => String(t).trim())
                    .filter(t => ALLOWED_TAGS.includes(t))
                    .slice(0, 3)
                : byId[id].tags;
            
            // Merge with baseline tags so we keep useful heuristics even if AI omits them
            const merged = Array.from(new Set([...(tags || []), ...(byId[id].tags || [])])).slice(0, 3);
            byId[id] = { fitScore, tags: merged };
        }

        // Store in cache
        CACHE.set(cacheKey, { ts: now(), byId });
        pruneCache();

        return { byId, aiApplied: true };
    } catch(error) {
        // AI-failure: fallback to baseline and expose error in meta for debugging
        return { byId: baseline, aiApplied: false, aiError: error?.message };
    }
};

module.exports = {
    aiRerankAndTag,
    getHeuristicTags,
    ALLOWED_TAGS
};
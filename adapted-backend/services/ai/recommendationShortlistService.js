const { sendChat } = require('./adaptedChatClient');
const { parseAiResponse } = require('./aiResponseParser');

// This service is intentionally separate from aiCourseRankingService.js
//
// Why?
//  - Global search uses tiny rerank set (~15 max) because it must be fast
//  - Recommendations can be slower (worker), and we need to score many candidates
//
// Strategy:
// 1) Score candidates in chunks (eg: 25 at a time) so prompts stay small
// 2) Collect fitScores for all candidates
// 3) Pick top N (for now, N = 12) by fitScore
//
// Output:
//  - scoresById: map of courseId -> fitScore (0..1)
//  - courses: the selected course rows (original objects) ordered by score desc

// HELPER FUNCTIONS
const clamp01 = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
};

const logAiRawResponse = (raw, { label = 'RECO_AI', maxChars = 5000 } = {}) => {
  try {
    // Strings: log first N chars
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      console.log(`[${label}] raw (string) len=${trimmed.length}`);
      console.log(`[${label}] raw preview:\n${trimmed.slice(0, maxChars)}`);
      return;
    }

    // Buffers: convert small preview
    if (Buffer.isBuffer(raw)) {
      console.log(`[${label}] raw (buffer) len=${raw.length}`);
      console.log(`[${label}] raw preview:\n${raw.toString('utf8', 0, Math.min(raw.length, maxChars))}`);
      return;
    }

    // Objects: stringify carefully
    if (raw && typeof raw === 'object') {
      // Common wrappers (OpenAI / SDK) — helpful quick hints
      const openAiContent = raw?.choices?.[0]?.message?.content;
      const text = raw?.text;
      const content = raw?.content;

      console.log(`[${label}] raw (object) keys=${Object.keys(raw).slice(0, 25).join(',')}`);

      if (typeof openAiContent === 'string') {
        console.log(`[${label}] raw.choices[0].message.content (string) len=${openAiContent.length}`);
        console.log(`[${label}] content preview:\n${openAiContent.slice(0, maxChars)}`);
        return;
      }

      if (typeof text === 'string') {
        console.log(`[${label}] raw.text (string) len=${text.length}`);
        console.log(`[${label}] text preview:\n${text.slice(0, maxChars)}`);
        return;
      }

      if (typeof content === 'string') {
        console.log(`[${label}] raw.content (string) len=${content.length}`);
        console.log(`[${label}] content preview:\n${content.slice(0, maxChars)}`);
        return;
      }

      // Fall back: pretty-print a truncated JSON string
      const str = JSON.stringify(raw, null, 2);
      console.log(`[${label}] raw json len=${str.length}`);
      console.log(`[${label}] raw json preview:\n${str.slice(0, maxChars)}`);
      return;
    }

    // Everything else
    console.log(`[${label}] raw (${typeof raw}) value=`, raw);
  } catch (e) {
    console.log(`[${label}] failed to log raw response:`, e?.message || e);
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const chunkArray = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
};

const logResponseType = (raw) => {
    const t = raw === null ? 'null' : Array.isArray(raw) ? 'array' : typeof raw;
    console.log(`[RECO_AI] raw response type=${t}`);
    logAiRawResponse(raw, { label: 'RECO_AI', maxChars: Number(process.env.RECO_AI_LOG_MAX_CHARS || 5000) });
};

// const safeJsonParse = (text) => {
//     if (!text) return null;

//     const str = String(text);
//     const start = str.indexOf('{');
//     const end = str.lastIndexOf('}');
//     if (start === -1 || end === -1 || end <= start) return null;

//     try {
//         return JSON.parse(str.slice(start, end + 1));
//     } catch (_) {
//         return null;
//     }
// };

// const normalizeCoursePayload = (course) => ({
//     id: course.id,
//     title: course.title,
//     platform: course.platform,
//     rating: course.rating,
//     level: course.level,
//     certificationType: course.certificationType,
//     durationHours: course.durationHours,
//     enrolledCount: course.enrolledCount,
//     skills: course.skills,
//     instructors: course.instructors
// });

// TUNABLE VARIABLES
// Chunk size: size of chunk being analyzed by the AI at a time, 25
// Timeout: how long the AI can analyze before the code times out
const CHUNK_SIZE = Number(process.env.RECS_AI_CHUNK_SIZE || 25);
const CHUNK_MAX_ATTEMPTS = Number(process.env.RECS_AI_CHUNK_ATTEMPTS || 3);

const SHORTLIST_SIZE = 12;

const AI_TIMEOUT_MS = Number(process.env.RECS_AI_TIMEOUT_MS || 300000);
const AI_MAX_RETRIES = Number(process.env.RECS_AI_MAX_RETRIES || 5);

const AI_RETRY_STATUSES = [429, 500, 502, 503, 504];

// System Prompt (Response Structure Enforcement)
//
// Note on prompt design:
//  - We keep the output contract extremely strict and machine-parseable
//  - We ask for ONLY JSON with a single top-level object containing `scores`
//  - Each score item must include { id, score } and score must be [0,1]
//  - This helps avoid formatting drift
const SYSTEM_PROMPT = `You are an assistant that scores online courses for a specific user's onboarding profile.

You will be given:
- a JSON object describing the user (goals, interests, experienceLevel)
- a JSON array of courses (each has an id and a small set of metadata)

Your task:
- For EVERY course, output a fit score between 0 and 1 (inclusive).
- Higher score means better match to the user's profile.

CRITICAL OUTPUT RULES (must follow exactly):
- Output ONLY valid JSON.
- Do NOT wrap in markdown fences.
- Do NOT include explanations or extra keys.
- The JSON MUST be exactly:
  {"scores":[{"id":"<courseId>","score":0.0}]}
- Provide EXACTLY ONE score item for EVERY course id provided.
`;

// normalizeUserProfileForAi(user)
//
//  - Keeps only the fields the scorer needs
const normalizeUserProfileForAi = (user) => ({
    goals: Array.isArray(user?.goals) ? user.goals : [],
    interests: Array.isArray(user?.interests) ? user.interests : [],
    experienceLevel: user?.experienceLevel || null,
});

// normalizeCoursePayload(course)
//
//  - Aggressively trims fields to reduce payload size
//  - Trims arrays (for now instructors, but can be extended to trim skills) to keep token usage
//    down
//  - Sends instructor names only (NOT bios)
const normalizeCoursePayload = (course) => ({
    id: course.id,
    title: course.title,
    platform: course.platform,
    rating: course.rating ?? null,
    level: course.level || null,
    certificationType: course.certificationType || null,
    durationHours: course.durationHours ?? null,
    enrolledCount: course.enrolledCount ?? null,
    skills: course.skills || [],
    // below is trimmed version of skills if changes are required
    // skills: Array.isArray(course.skills) ? course.skills.slice(0, 12) : [],
    instructors: Array.isArray(course.instructors)
        ? course.instructors
            .slice(0, 4)
            .map((i) => (typeof i === 'string' ? i : i?.name))
            .filter(Boolean)
        : [],
});

// scoreChunkWithAiOnce({ userProfile, courses })
//
//  - Makes a SINGLE attempt to score one chunk via the AI
//  - Throws if:
//      - AI response can't be parsed into the expected structure
//      - Any course id in the chunk is missing from the scores
//
// IMPORTANT:
//  - We intentionally do NOT do "partial acceptance"
//  - Missing IDs mean the chunk is invalid => throw => retry chunk / fail job
const scoreChunkWithAiOnce = async ({ userProfile, courses }) => {
    const compactCourses = courses.map(normalizeCoursePayload);

    const messages = [
        // system template
        { role: 'system', content: SYSTEM_PROMPT },
        // single user message containing the payload (keeps the request stable + parseable)
        {
            role: 'user',
            content: JSON.stringify({
                user: userProfile,
                courses: compactCourses,
            }),
        },
    ];

    const raw = await sendChat(messages, {
        timeoutMs: AI_TIMEOUT_MS,
        maxRetries: AI_MAX_RETRIES,
        retryStatuses: AI_RETRY_STATUSES,
        baseDelayMs: Number(process.env.RECS_AI_BASE_DELAY_MS || 750),
        maxDelayMs: Number(process.env.RECS_AI_MAX_DELAY_MS || 15000),
    });

    logResponseType(raw);

    const parsed = parseAiResponse(raw, { expectTopLevel: 'object' });

    const scoresArr = Array.isArray(parsed?.scores) ? parsed.scores : null;
    if (!scoresArr || scoresArr.length === 0) {
        throw new Error('AI response missing scores array');
    }

    // Build id -> score map and enforce chunk-level completeness
    const expectedIds = new Set(courses.map((c) => c.id));
    const scoresById = new Map();

    for (const score of scoresArr) {
        const id = score?.id;
        if (!id || !expectedIds.has(id)) continue;

        const scoreNum = Number(score?.score);
        if (Number.isNaN(scoreNum)) continue;

        scoresById.set(id, clamp01(scoreNum));
    }

    const missingIds = [...expectedIds].filter((id) => !scoresById.has(id));
    if (missingIds.length) {
        // Fail hard. We do NOT want partial/dirty results
        throw new Error( 
            `AI returned incomplete scores for chunk. Missing=${missingIds.length}/${expectedIds.size}`
        );
    }

    return scoresById;
};

// scoreChunkWithRetries({ userProfile, courses })
//
//  - Retries an entire chunk if either:
//      1) sendChat fails (after its own internal retries), OR
//      2) parsing/quality-bar fails (eg, missing IDs)
const scoreChunkWithRetries = async ({ userProfile, courses }) => {
    let lastErr = null;

    for (let attempt = 1; attempt <= CHUNK_MAX_ATTEMPTS; attempt++) {
        try {
            console.log(
                `[RECO_AI] scoring chunk size=${courses.length} attempt=${attempt}/${CHUNK_MAX_ATTEMPTS}`
            );
            return await scoreChunkWithAiOnce({ userProfile, courses });
        } catch (err) {
            lastErr = err;
            console.warn(`[RECO_AI] chunk attempt failed: ${err?.message || err}`);

            // If we have attempts left, backoff + jitter before retrying
            if (attempt < CHUNK_MAX_ATTEMPTS) {
                const base = Number(process.env.RECS_AI_CHUNK_BASE_DELAY_MS || 800);
                const max = Number(process.env.RECS_AI_CHUNK_MAX_DELAY_MS || 8000);

                // exponential backoff with jitter
                const exp = Math.min(max, base * Math.pow(2, attempt - 1));
                const jitter = Math.floor(Math.random() * 400);
                await sleep(exp + jitter);
                continue;
            }
        }
    }

    // Out of attempts => fail the whole job (worker will retry later)
    throw lastErr || new Error('AI chunk scoring failed');
};

// shortlistWithAi(user, candidates)
//
// candidates:
//  - Already deterministic-filtered by SQL (with pg_trgm), typically <= 200
//
// returns:
//  - Top SHORTLIST_SIZE courses with aiFitScore attached
//
// behaviour:
//  - ALL Chunks must succeed
//  - ALL candidates must be scored
//  - Any failure => throw (so the worker retries the job later)
const shortlistWithAi = async (user, candidates) => {
    const userProfile = normalizeUserProfileForAi(user);
    const chunks = chunkArray(candidates, CHUNK_SIZE);

    // We accumulate scores across all chunks, then enforce global completeness
    const scoresById = new Map();

    for (const coursesChunk of chunks) {
        const chunkScoresById = await scoreChunkWithRetries({
            userProfile,
            courses: coursesChunk,
        });

        for (const [id, score] of chunkScoresById.entries()) {
            scoresById.set(id, score);
        }
    }

    const missing = candidates.filter((c) => !scoresById.has(c.id));
    if (missing.length) {
        throw new Error(
            `AI scoring incomplete across all chunks. Missing=${missing.length}/${candidates.length}`
        );
    }

    // Attach aiFitScore + sort desc
    const scored = candidates.map((c) => ({
        ...c,
        aiFitScore: scoresById.get(c.id) ?? 0,
    }));

    scored.sort((a, b) => (b.aiFitScore || 0) - (a.aiFitScore || 0));

    // Return the top shortlist
    return scored.slice(0, SHORTLIST_SIZE);
};

// scoreChunkWithAi(...)
//
// Returns:
// { "<courseId>": { fitScore: 0..1 }, ...}
// const scoreChunkWithAi = async ({ user, queryTerms, chunkCourses }) => {
//     const system = {
//         role: 'system',
//         content: [
//             'You are a course recommendation scoring assistant for an education app.',
//             'Return STRICT JSON ONLY. No extra text.',
//             'Output format:',
//             '{ "<courseId>": { "fitScore": number 0..1 }, ... }',
//             'Rules:',
//             '- fitScore must be between 0 and 1',
//             '- score higher when a course matches user goals/interests/experience',
//             '- score slightly higher if course has strong rating and high enrollment',
//             '- do NOT include any keys other than courseIds'
//         ].join('\n')
//     };

//     const userMsg = {
//         role: 'user',
//         content: JSON.stringify({
//             queryTerms,
//             user: {
//                 goals: user?.goals || [],
//                 interests: user?.interests || [],
//                 experienceLevel: user?.experienceLevel || null
//             },
//             courses: chunkCourses.map(normalizeCoursePayload)
//         })
//     };

//     console.log(`[RECO_AI] scoring chunk size=${chunkCourses.length}`);

//     const resp = await sendChat({
//         messages: [system, userMsg],
//         timeoutMs: AI_TIMEOUT_MS
//     });

//     console.log(`[RECO_AI] raw response type=${typeof resp}`);

//     const parsed = (typeof resp === 'object' && resp) ? resp : safeJsonParse(resp);
//     if (!parsed || typeof parsed !== 'object') return {};

//     const out = {};
//     for (const [id, v] of Object.entries(parsed)) {
//         const score = clamp01(v?.fitScore);
//         out[id] = { fitScore: score };
//     }

//     return out;
// };

// // shortlistRecommendationsWithAi({ user, queryTerms, courses, shortlistSize })
// //
// // - courses = raw SQL rows (plain objects)
// //
// // - returns top shortlistSize = 12 courses ranked by AI fitScore
// const shortlistRecommendationsWithAi = async ({
//     user,
//     queryTerms,
//     courses,
//     shortlistSize = 12
// }) => {
//     const all = Array.isArray(courses) ? courses : [];
//     if (!all.length) return { scoresById: {}, courses: [] };

//     // 1) Score in chunks
//     const scoresById = {};

//     for (let i = 0; i < all.length; i += CHUNK_SIZE) {
//         const chunk = all.slice(i, i + CHUNK_SIZE);

//         // If AI fails for a chunk, we just treat it as 0 scores (worker can retry later)
//         try {
//             const scored = await scoreChunkWithAi({ user, queryTerms, chunkCourses: chunk });
//             for (const [id, obj] of Object.entries(scored)) {
//                 scoresById[id] = obj.fitScore;
//             }
//         } catch (error) {
//             // Keep going; worker can still produce something based on partial scores
//             // You could also throw here to force a retry, but partial output is often better UX
//             console.warn('AI scoring chunk failed:', error?.message);
//         }
//     }

//     // 2) Sort candidates by AI score desc
//     const withScores = all.map(course => ({
//         ...course,
//         aiFitScore: Number(scoresById[course.id] || 0)
//     }));

//     withScores.sort((a, b) => Number(b.aiFitScore || 0) - Number(a.aiFitScore || 0));

//     // 3) Pick the top shortlistSize = 12 courses after sort
//     const desired = Math.min(Number(shortlistSize) || 12, withScores.length);

//     return {
//         scoresById,
//         courses: withScores.slice(0, desired)
//     };
// };

module.exports = { shortlistWithAi }
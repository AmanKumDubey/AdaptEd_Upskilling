// Phase B3: Sequelize removed. Reuses the same pg Pool that Drizzle queries
// through (db/client.ts) rather than opening a second connection pool.
const { pool } = require('../db/client');

// Ensure Postgres extensions + indexes needed for fast local search
// Safe to run on every boot (CREATE ... IF NOT EXISTS)
const ensureSearchIndexes = async (): Promise<void> => {
  try {
    // Trigram extension powers fast LIKE/ILIKE '%...%' and fuzzy matching
    await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

    // Fast search on Course.title (default search field)
    await pool.query('CREATE INDEX IF NOT EXISTS "courses_title_trgm_idx" ON "Courses" USING gin (lower("title") gin_trgm_ops);');

    // Optional search fields (small text columns)
    await pool.query('CREATE INDEX IF NOT EXISTS "courses_level_trgm_idx" ON "Courses" USING gin (lower("level") gin_trgm_ops);');
    await pool.query('CREATE INDEX IF NOT EXISTS "courses_certificationtype_trgm_idx" ON "Courses" USING gin (lower("certificationType") gin_trgm_ops);');

    // Helpful composite indexes for the three dashboard/search categories
    await pool.query('CREATE INDEX IF NOT EXISTS "usercourses_userid_status_idx" ON "UserCourses" ("userId", "status");');
    await pool.query('CREATE INDEX IF NOT EXISTS "usercourses_userid_iswishlist_idx" ON "UserCourses" ("userId", "isWishlist");');

    // For sort=recent on search results
    await pool.query('CREATE INDEX IF NOT EXISTS "usercourses_userid_lastaccessed_idx" ON "UserCourses" ("userId", "lastAccessedAt" DESC);');

    // JSONB fields cast to text for trigram search (global search will hit these heavily)
    await pool.query('CREATE INDEX IF NOT EXISTS "courses_skills_trgm_idx" ON "Courses" USING gin (lower(COALESCE(("skills")::text, \'\')) gin_trgm_ops);');
    await pool.query('CREATE INDEX IF NOT EXISTS "courses_instructors_trgm_idx" ON "Courses" USING gin (lower(COALESCE(("instructors")::text, \'\')) gin_trgm_ops);');

    // Helpful indexes for common global-search sorting
    await pool.query('CREATE INDEX IF NOT EXISTS "courses_rating_idx" ON "Courses" ("rating" DESC);');
    await pool.query('CREATE INDEX IF NOT EXISTS "courses_createdat_idx" ON "Courses" ("createdAt" DESC);');
    await pool.query('CREATE INDEX IF NOT EXISTS "courses_enrolledcount_idx" ON "Courses" ("enrolledCount" DESC);');

    console.log('Search indexes ensured');
  } catch (error) {
    // Not all environments allow CREATE EXTENSION / CREATE INDEX at runtime
    // We log a warning so the app still boots
    console.warn('WARNING: Failed to ensure search indexes:', (error as Error).message);
  }
};

// Kept for controllers/healthController.js's existing `database.authenticate()`
// interface (and its tests, which inject their own fake of this same shape).
const database = {
  authenticate: async (): Promise<void> => {
    await pool.query('SELECT 1');
  },
};

interface ConnectOptions {
  ensureIndexes?: boolean;
}

const connectDB = async (opts: ConnectOptions = {}): Promise<void> => {
  const { ensureIndexes = true } = opts;

  try {
    await pool.query('SELECT 1+1 AS result');
    console.log('Connected to PostgreSQL successfully');

    // Ensure pg_trgm + indexes after connection when enabled
    // Do not do this in the worker process
    if (ensureIndexes) {
      await ensureSearchIndexes();
    }
  } catch (error) {
    console.error('PostgreSQL connection error:', error);
    // Phase 1 stabilization: let the API/worker bootstrap decide how to stop. Calling
    // process.exit here previously made this module difficult to test and reuse.
    throw error;
  }
};

module.exports = { pool, database, ensureSearchIndexes, connectDB };

const bcrypt = require('bcryptjs');

// Phase B4: better-auth (and its `jose` dependency) is ESM-only - a plain
// `require('better-auth')` throws ERR_REQUIRE_ESM, confirmed directly against
// this project. Dynamic `import()` is available from CommonJS regardless, so
// the auth instance is built once, lazily, behind an async getter rather than
// a top-level require - every other file in this codebase stays untouched.
let authInstance: any = null;
let authPromise: Promise<any> | null = null;

async function buildAuth() {
  const { betterAuth } = await import('better-auth');
  const { drizzleAdapter } = await import('better-auth/adapters/drizzle');
  const { bearer } = await import('better-auth/plugins');
  const { db } = require('../db/client');
  const dbSchema = require('../db/schema');

  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }
  if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
    socialProviders.linkedin = {
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    };
  }

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      // Our tables are named authUser/authSession/... in db/schema.ts (to avoid
      // colliding with our own `users` variable) - remap to the keys better-auth
      // actually looks for.
      schema: {
        ...dbSchema,
        user: dbSchema.authUser,
        session: dbSchema.authSession,
        account: dbSchema.authAccount,
        verification: dbSchema.authVerification,
      },
    }),
    secret: process.env.JWT_SECRET,
    baseURL: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`,
    trustedOrigins: [process.env.FRONTEND_URL || 'http://localhost:3000'],
    advanced: {
      database: {
        // Keeps every id in the same uuid format as the rest of the schema -
        // required for the Phase B4 backfill to reuse existing Users.id values.
        generateId: 'uuid',
      },
    },
    emailAndPassword: {
      enabled: true,
      // Reuses the exact bcrypt hash/compare (cost 12) already used everywhere
      // else in this codebase, so both freshly-backfilled and brand-new
      // credential accounts need zero special-casing to log in.
      password: {
        hash: (password: string) => bcrypt.hash(password, 12),
        verify: ({ hash, password }: { hash: string; password: string }) => bcrypt.compare(password, hash),
      },
    },
    socialProviders,
    plugins: [bearer()],
  });
}

async function getAuth() {
  if (authInstance) return authInstance;
  if (!authPromise) authPromise = buildAuth();
  authInstance = await authPromise;
  return authInstance;
}

module.exports = { getAuth };

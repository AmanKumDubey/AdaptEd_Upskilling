// Phase 1 migration baseline: this frozen list represents the schema that existed when
// controlled migrations replaced automatic Sequelize alterations.
const CORE_TABLES = [
  'Users',
  'OAuthSessions',
  'PasswordResets',
  'Courses',
  'Reviews',
  'UserCourses',
  'Certificates',
  'UserIdentities',
  'UserRecommendations'
];

const INITIAL_SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

CREATE TYPE public."enum_Courses_platform" AS ENUM ('coursera', 'udemy', 'skillshare');
CREATE TYPE public."enum_OAuthSessions_provider" AS ENUM ('google', 'linkedin');
CREATE TYPE public."enum_Reviews_platform" AS ENUM ('coursera', 'udemy', 'skillshare');
CREATE TYPE public."enum_UserCourses_status" AS ENUM ('not_enrolled', 'pending_verification', 'enrolled', 'in_progress', 'completed');
CREATE TYPE public."enum_UserIdentities_provider" AS ENUM ('google', 'linkedin');
CREATE TYPE public."enum_UserRecommendations_status" AS ENUM ('ready', 'generating', 'failed');
CREATE TYPE public."enum_Users_experienceLevel" AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE public."enum_Users_role" AS ENUM ('admin', 'user', 'moderator');
CREATE TYPE public."enum_Users_themePreference" AS ENUM ('light', 'dark');

CREATE TABLE public."Users" (
  id uuid PRIMARY KEY,
  username varchar(30) NOT NULL UNIQUE,
  email varchar(255) NOT NULL UNIQUE,
  "firstName" varchar(255),
  "lastName" varchar(255),
  password varchar(255) NOT NULL,
  goals varchar(255)[] DEFAULT ARRAY[]::varchar[],
  interests varchar(255)[] DEFAULT ARRAY[]::varchar[],
  "experienceLevel" public."enum_Users_experienceLevel",
  "themePreference" public."enum_Users_themePreference" DEFAULT 'light',
  role public."enum_Users_role" DEFAULT 'user',
  avatar varchar(255),
  phone varchar(255),
  gender varchar(255),
  country varchar(2),
  "isActive" boolean DEFAULT true,
  "isEmailVerified" boolean DEFAULT false,
  "lastLogin" timestamptz,
  "refreshToken" text,
  "onboardingCompleted" boolean DEFAULT false,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE TABLE public."OAuthSessions" (
  id uuid PRIMARY KEY,
  provider public."enum_OAuthSessions_provider" NOT NULL,
  state varchar(255) NOT NULL UNIQUE,
  nonce varchar(255) NOT NULL,
  "codeVerifier" varchar(255),
  "redirectUri" varchar(2048),
  "userId" uuid,
  "expiresAt" timestamptz NOT NULL,
  "usedAt" timestamptz,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE TABLE public."PasswordResets" (
  id uuid PRIMARY KEY,
  "userId" uuid NOT NULL,
  "otpHash" varchar(255) NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "usedAt" timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  "requestedIp" varchar(64),
  "requestedUserAgent" varchar(255),
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE TABLE public."Courses" (
  id uuid PRIMARY KEY,
  "externalId" varchar(255) NOT NULL,
  platform public."enum_Courses_platform" NOT NULL,
  title varchar(512) NOT NULL,
  "deepLink" varchar(1024) NOT NULL,
  "imageUrl" varchar(1024),
  rating numeric(3,2),
  "durationHours" integer,
  level varchar(64),
  instructors jsonb DEFAULT '[]'::jsonb,
  "certificationType" varchar(128),
  skills jsonb DEFAULT '[]'::jsonb,
  "learningOutcomes" jsonb DEFAULT '[]'::jsonb,
  shareable boolean,
  "enrolledCount" integer,
  "assessmentCount" integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE TABLE public."Reviews" (
  id uuid PRIMARY KEY,
  "courseId" uuid NOT NULL,
  platform public."enum_Reviews_platform" NOT NULL,
  "externalReviewId" varchar(255),
  rating numeric(3,2),
  body text,
  "authorName" varchar(255),
  "authorProfileUrl" varchar(1024),
  "helpfulCount" integer,
  "reviewCreatedAt" timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE TABLE public."UserCourses" (
  id uuid PRIMARY KEY,
  "userId" uuid NOT NULL REFERENCES public."Users"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  "courseId" uuid NOT NULL REFERENCES public."Courses"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  status public."enum_UserCourses_status" NOT NULL DEFAULT 'not_enrolled',
  "isWishlist" boolean NOT NULL DEFAULT false,
  "lastAccessedAt" timestamptz,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE TABLE public."Certificates" (
  id uuid PRIMARY KEY,
  "userId" uuid NOT NULL REFERENCES public."Users"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  "courseId" uuid NOT NULL REFERENCES public."Courses"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  "userCourseId" uuid NOT NULL UNIQUE REFERENCES public."UserCourses"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  "s3Key" varchar(255) NOT NULL,
  "fileName" varchar(255),
  "contentType" varchar(255),
  "sizeBytes" integer,
  "uploadedAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE TABLE public."UserIdentities" (
  id uuid PRIMARY KEY,
  "userId" uuid NOT NULL REFERENCES public."Users"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  provider public."enum_UserIdentities_provider" NOT NULL,
  "providerUserId" varchar(255) NOT NULL,
  email varchar(255),
  "accessTokenHash" text,
  "refreshTokenHash" text,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE TABLE public."UserRecommendations" (
  id uuid PRIMARY KEY,
  "userId" uuid NOT NULL UNIQUE REFERENCES public."Users"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  status public."enum_UserRecommendations_status" NOT NULL DEFAULT 'generating',
  current jsonb,
  "previousBatch" jsonb,
  "generatedAt" timestamptz,
  "expiresAt" timestamptz,
  "nextRunAt" timestamptz,
  "lockedBy" varchar(255),
  "lockUntil" timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  "lastError" varchar(255),
  "generationToken" varchar(255),
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE UNIQUE INDEX courses_external_id_platform ON public."Courses" ("externalId", platform);
CREATE INDEX courses_platform ON public."Courses" (platform);
CREATE INDEX courses_title ON public."Courses" (title);
CREATE INDEX o_auth_sessions_provider ON public."OAuthSessions" (provider);
CREATE INDEX o_auth_sessions_expires_at ON public."OAuthSessions" ("expiresAt");
CREATE INDEX password_resets_user_id_expires_at ON public."PasswordResets" ("userId", "expiresAt");
CREATE INDEX password_resets_expires_at ON public."PasswordResets" ("expiresAt");
CREATE INDEX reviews_course_id ON public."Reviews" ("courseId");
CREATE INDEX reviews_platform ON public."Reviews" (platform);
CREATE INDEX reviews_external_review_id_platform ON public."Reviews" ("externalReviewId", platform);
CREATE UNIQUE INDEX user_courses_user_id_course_id ON public."UserCourses" ("userId", "courseId");
CREATE INDEX user_courses_user_id ON public."UserCourses" ("userId");
CREATE INDEX user_courses_course_id ON public."UserCourses" ("courseId");
CREATE INDEX user_courses_status ON public."UserCourses" (status);
CREATE INDEX user_courses_is_wishlist ON public."UserCourses" ("isWishlist");
CREATE INDEX certificates_user_id ON public."Certificates" ("userId");
CREATE INDEX certificates_course_id ON public."Certificates" ("courseId");
CREATE INDEX certificates_uploaded_at ON public."Certificates" ("uploadedAt");
CREATE UNIQUE INDEX user_identities_provider_provider_user_id ON public."UserIdentities" (provider, "providerUserId");
CREATE INDEX user_identities_user_id ON public."UserIdentities" ("userId");
CREATE INDEX user_identities_email ON public."UserIdentities" (email);
CREATE INDEX user_recommendations_status ON public."UserRecommendations" (status);
CREATE INDEX user_recommendations_next_run_at ON public."UserRecommendations" ("nextRunAt");
CREATE INDEX user_recommendations_lock_until ON public."UserRecommendations" ("lockUntil");
`;

// Phase B3: runner now passes a plain `pg` client (already inside a transaction)
// instead of Sequelize's { sequelize, queryInterface, transaction }.
const up = async ({ client }) => {
  const { rows } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  );
  const existingTables = new Set(rows.map(row => row.tablename));
  const presentCoreTables = CORE_TABLES.filter(table => existingTables.has(table));

  if (presentCoreTables.length === CORE_TABLES.length) {
    // Phase 1 migration baseline: an existing complete installation is recorded without
    // recreating tables or touching its data.
    return;
  }

  if (presentCoreTables.length > 0) {
    // Phase 1 safety: never guess how to repair a partial production schema.
    throw new Error(
      `Cannot apply initial migration to a partial schema. Existing core tables: ${presentCoreTables.join(', ')}`
    );
  }

  await client.query(INITIAL_SCHEMA_SQL);
};

const down = async ({ client }) => {
  await client.query(`
    DROP TABLE IF EXISTS public."Certificates" CASCADE;
    DROP TABLE IF EXISTS public."UserRecommendations" CASCADE;
    DROP TABLE IF EXISTS public."UserIdentities" CASCADE;
    DROP TABLE IF EXISTS public."UserCourses" CASCADE;
    DROP TABLE IF EXISTS public."Reviews" CASCADE;
    DROP TABLE IF EXISTS public."Courses" CASCADE;
    DROP TABLE IF EXISTS public."PasswordResets" CASCADE;
    DROP TABLE IF EXISTS public."OAuthSessions" CASCADE;
    DROP TABLE IF EXISTS public."Users" CASCADE;
    DROP TYPE IF EXISTS public."enum_UserRecommendations_status";
    DROP TYPE IF EXISTS public."enum_UserIdentities_provider";
    DROP TYPE IF EXISTS public."enum_UserCourses_status";
    DROP TYPE IF EXISTS public."enum_Reviews_platform";
    DROP TYPE IF EXISTS public."enum_OAuthSessions_provider";
    DROP TYPE IF EXISTS public."enum_Courses_platform";
    DROP TYPE IF EXISTS public."enum_Users_themePreference";
    DROP TYPE IF EXISTS public."enum_Users_role";
    DROP TYPE IF EXISTS public."enum_Users_experienceLevel";
  `);
};

module.exports = { CORE_TABLES, INITIAL_SCHEMA_SQL, up, down };

import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';

// Phase B3: mirrors migrations/202608180001-initial-schema.js column-for-column.
// These pgEnum() calls reference Postgres enum types that already exist in the
// database - they are NOT recreated here, only typed for query use.
//
// Important: "id", "createdAt", and "updatedAt" have NO server-side default on
// any table (confirmed against the live DB's information_schema) - Sequelize
// generated these in JS before every insert, never via DEFAULT. Drizzle must do
// the same; see db/helpers.ts's newId()/withTimestamps()/touch().
const userExperienceLevelEnum = pgEnum('enum_Users_experienceLevel', ['beginner', 'intermediate', 'advanced']);
const userThemePreferenceEnum = pgEnum('enum_Users_themePreference', ['light', 'dark']);
const userRoleEnum = pgEnum('enum_Users_role', ['admin', 'user', 'moderator']);
const coursePlatformEnum = pgEnum('enum_Courses_platform', ['coursera', 'udemy', 'skillshare']);
const reviewPlatformEnum = pgEnum('enum_Reviews_platform', ['coursera', 'udemy', 'skillshare']);
const userCourseStatusEnum = pgEnum('enum_UserCourses_status', [
  'not_enrolled', 'pending_verification', 'enrolled', 'in_progress', 'completed',
]);
const userRecommendationStatusEnum = pgEnum('enum_UserRecommendations_status', ['ready', 'generating', 'failed']);
// Phase B5: org-scoped role, layered on top of (not replacing) userRoleEnum above.
const orgMemberRoleEnum = pgEnum('enum_OrgMembers_role', ['owner', 'admin', 'hr', 'member']);

const users = pgTable('Users', {
  id: uuid('id').primaryKey(),
  username: varchar('username', { length: 30 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('firstName', { length: 255 }),
  lastName: varchar('lastName', { length: 255 }),
  password: varchar('password', { length: 255 }).notNull(),
  goals: varchar('goals', { length: 255 }).array().default([]),
  interests: varchar('interests', { length: 255 }).array().default([]),
  experienceLevel: userExperienceLevelEnum('experienceLevel'),
  themePreference: userThemePreferenceEnum('themePreference').default('light'),
  role: userRoleEnum('role').default('user'),
  avatar: varchar('avatar', { length: 255 }),
  phone: varchar('phone', { length: 255 }),
  gender: varchar('gender', { length: 255 }),
  country: varchar('country', { length: 2 }),
  isActive: boolean('isActive').default(true),
  isEmailVerified: boolean('isEmailVerified').default(false),
  lastLogin: timestamp('lastLogin', { withTimezone: true }),
  refreshToken: text('refreshToken'),
  onboardingCompleted: boolean('onboardingCompleted').default(false),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull(),
});

// Phase B7 (social login): OAuthSessions/UserIdentities backed the old
// hand-rolled Google/LinkedIn flow, replaced by better-auth's own built-in
// social sign-in (auth/config.ts's socialProviders + server.ts's catch-all
// mount) - better-auth manages its own state/PKCE and identity linking via
// its account table, so these have no reader left. The live DB tables
// themselves are left in place (not dropped) pending a deliberate decision,
// same as B3's orphaned ScrapeRuns table.

const passwordResets = pgTable('PasswordResets', {
  id: uuid('id').primaryKey(),
  userId: uuid('userId').notNull(),
  otpHash: varchar('otpHash', { length: 255 }).notNull(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  usedAt: timestamp('usedAt', { withTimezone: true }),
  attempts: integer('attempts').notNull().default(0),
  requestedIp: varchar('requestedIp', { length: 64 }),
  requestedUserAgent: varchar('requestedUserAgent', { length: 255 }),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull(),
});

const courses = pgTable('Courses', {
  id: uuid('id').primaryKey(),
  externalId: varchar('externalId', { length: 255 }).notNull(),
  platform: coursePlatformEnum('platform').notNull(),
  title: varchar('title', { length: 512 }).notNull(),
  deepLink: varchar('deepLink', { length: 1024 }).notNull(),
  imageUrl: varchar('imageUrl', { length: 1024 }),
  rating: numeric('rating', { precision: 3, scale: 2 }),
  durationHours: integer('durationHours'),
  level: varchar('level', { length: 64 }),
  instructors: jsonb('instructors').default([]),
  certificationType: varchar('certificationType', { length: 128 }),
  skills: jsonb('skills').default([]),
  learningOutcomes: jsonb('learningOutcomes').default([]),
  shareable: boolean('shareable'),
  enrolledCount: integer('enrolledCount'),
  assessmentCount: integer('assessmentCount'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull(),
});

const reviews = pgTable('Reviews', {
  id: uuid('id').primaryKey(),
  courseId: uuid('courseId').notNull(),
  platform: reviewPlatformEnum('platform').notNull(),
  externalReviewId: varchar('externalReviewId', { length: 255 }),
  rating: numeric('rating', { precision: 3, scale: 2 }),
  body: text('body'),
  authorName: varchar('authorName', { length: 255 }),
  authorProfileUrl: varchar('authorProfileUrl', { length: 1024 }),
  helpfulCount: integer('helpfulCount'),
  reviewCreatedAt: timestamp('reviewCreatedAt', { withTimezone: true }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull(),
});

const userCourses = pgTable('UserCourses', {
  id: uuid('id').primaryKey(),
  userId: uuid('userId').notNull(),
  courseId: uuid('courseId').notNull(),
  status: userCourseStatusEnum('status').notNull().default('not_enrolled'),
  isWishlist: boolean('isWishlist').notNull().default(false),
  lastAccessedAt: timestamp('lastAccessedAt', { withTimezone: true }),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull(),
});

const certificates = pgTable('Certificates', {
  id: uuid('id').primaryKey(),
  userId: uuid('userId').notNull(),
  courseId: uuid('courseId').notNull(),
  userCourseId: uuid('userCourseId').notNull().unique(),
  s3Key: varchar('s3Key', { length: 255 }).notNull(),
  fileName: varchar('fileName', { length: 255 }),
  contentType: varchar('contentType', { length: 255 }),
  sizeBytes: integer('sizeBytes'),
  uploadedAt: timestamp('uploadedAt', { withTimezone: true }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull(),
});

const userRecommendations = pgTable('UserRecommendations', {
  id: uuid('id').primaryKey(),
  userId: uuid('userId').notNull().unique(),
  status: userRecommendationStatusEnum('status').notNull().default('generating'),
  current: jsonb('current'),
  previousBatch: jsonb('previousBatch'),
  generatedAt: timestamp('generatedAt', { withTimezone: true }),
  expiresAt: timestamp('expiresAt', { withTimezone: true }),
  nextRunAt: timestamp('nextRunAt', { withTimezone: true }),
  lockedBy: varchar('lockedBy', { length: 255 }),
  lockUntil: timestamp('lockUntil', { withTimezone: true }),
  attempts: integer('attempts').notNull().default(0),
  lastError: varchar('lastError', { length: 255 }),
  generationToken: varchar('generationToken', { length: 255 }),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull(),
});

// Phase B4: better-auth's own tables. Field shapes pulled directly from
// better-auth@1.7.2's own `getAuthTables()` (the CLI generator itself was broken
// in this environment - an unrelated internal ESM bug - so this was verified by
// calling the library function directly rather than guessed from docs).
// better-auth generates its own "id" for every table; the app is configured
// (advanced.database.generateId) to always produce a real UUID, so these ids
// share the same format - and, for migrated accounts, the same literal value -
// as our own Users.id.
const authUser = pgTable('user', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull(),
});

const authSession = pgTable('session', {
  id: uuid('id').primaryKey(),
  userId: uuid('userId').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull(),
});

// One row per linked auth method per user: providerId 'credential' for
// email/password (password hash lives in the `password` column here, NOT on
// the user table), 'google'/'linkedin' for social sign-in.
const authAccount = pgTable('account', {
  id: uuid('id').primaryKey(),
  userId: uuid('userId').notNull(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  issuer: text('issuer').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull(),
});

const authVerification = pgTable('verification', {
  id: uuid('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull(),
});

// Phase B5: greenfield tenancy tables - no migration source, nothing to mirror.
const organizations = pgTable('Organizations', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull(),
});

const departments = pgTable('Departments', {
  id: uuid('id').primaryKey(),
  orgId: uuid('orgId').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull(),
});

const orgMembers = pgTable('OrgMembers', {
  id: uuid('id').primaryKey(),
  orgId: uuid('orgId').notNull(),
  userId: uuid('userId').notNull(),
  departmentId: uuid('departmentId'),
  role: orgMemberRoleEnum('role').notNull().default('member'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull(),
});

const invitations = pgTable('Invitations', {
  id: uuid('id').primaryKey(),
  orgId: uuid('orgId').notNull(),
  departmentId: uuid('departmentId'),
  email: varchar('email', { length: 255 }).notNull(),
  role: orgMemberRoleEnum('role').notNull().default('member'),
  token: varchar('token', { length: 255 }).notNull().unique(),
  invitedBy: uuid('invitedBy').notNull(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('acceptedAt', { withTimezone: true }),
  revokedAt: timestamp('revokedAt', { withTimezone: true }),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull(),
});

module.exports = {
  users,
  passwordResets,
  courses,
  reviews,
  userCourses,
  certificates,
  userRecommendations,
  authUser,
  authSession,
  authAccount,
  authVerification,
  organizations,
  departments,
  orgMembers,
  invitations,
};

// Phase B17: greenfield - persists the onboarding wizard's answers
// server-side per user. `data` is stored as-is (frontend-owned shape, same
// trust boundary as LearningPaths.stages) rather than a column per field, so
// adding/renaming a wizard question never needs a schema migration.
const SQL = `
CREATE TABLE "OnboardingProfiles" (
  "id" uuid PRIMARY KEY,
  "userId" uuid NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "data" jsonb NOT NULL,
  "onboardingCompleted" boolean NOT NULL DEFAULT false,
  "completedAt" timestamptz,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  CONSTRAINT "OnboardingProfiles_userId_unique" UNIQUE("userId")
);

CREATE INDEX onboarding_profiles_user_id_idx ON "OnboardingProfiles" ("userId");
`;

const up = async ({ client }) => {
  const { rows } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'OnboardingProfiles'`
  );

  if (rows.length > 0) {
    throw new Error('Cannot apply onboarding-profiles migration: OnboardingProfiles already exists');
  }

  await client.query(SQL);
};

const down = async ({ client }) => {
  await client.query(`
    DROP TABLE IF EXISTS "OnboardingProfiles" CASCADE;
  `);
};

module.exports = { up, down };

// Phase B9: Learning Path was, until now, 100% client-side/localStorage
// (generated from the frontend's local onboarding profile + assessment
// result). This persists the generated roadmap + progress server-side, one
// row per user (a new generation replaces the old one - the same "regenerate
// destroys progress" behavior the frontend already had). The frozen `stages`
// jsonb blob (modules, order, priority, difficulty, prerequisites - the
// output of generateLearningPath) is computed once at generate time; module
// *status* (completed/current/available/locked) stays a pure client-side
// derivation over that blob + completedModuleIds/currentModuleId, unchanged
// from before - see pathwise-app-v5's learningPathEngine.js.
const SQL = `
CREATE TABLE "LearningPaths" (
  "id" uuid PRIMARY KEY,
  "userId" uuid NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "personaId" "enum_AssessmentQuestions_personaId" NOT NULL,
  "targetRole" varchar(255) NOT NULL,
  "currentLevel" varchar(50) NOT NULL,
  "targetLevel" varchar(50) NOT NULL,
  "assessmentScore" integer NOT NULL,
  "hoursPerWeek" integer NOT NULL,
  "learningFormats" jsonb NOT NULL DEFAULT '[]',
  "learningPace" varchar(100),
  "priorityGaps" jsonb NOT NULL DEFAULT '[]',
  "estimatedWeeks" integer NOT NULL,
  "totalHours" integer NOT NULL,
  "stages" jsonb NOT NULL,
  "completedModuleIds" jsonb NOT NULL DEFAULT '[]',
  "currentModuleId" varchar(100),
  "sourceFingerprint" varchar(1000),
  "generatedAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  CONSTRAINT "LearningPaths_userId_unique" UNIQUE("userId")
);

CREATE INDEX learning_paths_user_idx ON "LearningPaths" ("userId");
`;

const up = async ({ client }) => {
  const { rows } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'LearningPaths'`
  );

  if (rows.length > 0) {
    throw new Error('Cannot apply learning-paths migration: LearningPaths already exists');
  }

  await client.query(SQL);
};

const down = async ({ client }) => {
  await client.query(`
    DROP TABLE IF EXISTS "LearningPaths" CASCADE;
  `);
};

module.exports = { up, down };

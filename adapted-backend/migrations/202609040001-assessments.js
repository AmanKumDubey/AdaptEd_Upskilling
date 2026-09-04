// Phase B8: real backend for what has, until now, been a 100%-client-side
// feature (assessment questions, sessions, and results all lived only in
// this browser's localStorage - see pathwise-app-v5/src/features/assessment).
// Greenfield tables - nothing existing is touched.
const SQL = `
CREATE TYPE "enum_AssessmentQuestions_personaId" AS ENUM ('tech', 'data', 'nontech', 'manager');
CREATE TYPE "enum_AssessmentSessions_status" AS ENUM ('in_progress', 'completed', 'abandoned');
CREATE TYPE "enum_AssessmentResults_level" AS ENUM ('Beginner', 'Developing', 'Intermediate', 'Advanced');

CREATE TABLE "AssessmentQuestions" (
  "id" uuid PRIMARY KEY,
  "personaId" "enum_AssessmentQuestions_personaId" NOT NULL,
  "domain" varchar(120) NOT NULL,
  "bloom" varchar(40),
  "questionText" text NOT NULL,
  "options" jsonb NOT NULL,
  "correctIndex" integer NOT NULL,
  "difficulty" integer NOT NULL DEFAULT 0,
  "explanation" text,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE TABLE "AssessmentSessions" (
  "id" uuid PRIMARY KEY,
  "userId" uuid NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "personaId" "enum_AssessmentQuestions_personaId" NOT NULL,
  "questionIds" jsonb NOT NULL,
  "answers" jsonb NOT NULL DEFAULT '{}',
  "currentQuestion" integer NOT NULL DEFAULT 0,
  "status" "enum_AssessmentSessions_status" NOT NULL DEFAULT 'in_progress',
  "startedAt" timestamptz NOT NULL,
  "completedAt" timestamptz,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE TABLE "AssessmentResults" (
  "id" uuid PRIMARY KEY,
  "sessionId" uuid NOT NULL REFERENCES "AssessmentSessions"("id") ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "personaId" "enum_AssessmentQuestions_personaId" NOT NULL,
  "score" integer NOT NULL,
  "correctCount" integer NOT NULL,
  "total" integer NOT NULL,
  "level" "enum_AssessmentResults_level" NOT NULL,
  "domainScores" jsonb NOT NULL,
  "strengths" jsonb NOT NULL DEFAULT '[]',
  "gaps" jsonb NOT NULL DEFAULT '[]',
  "recommendedRoles" jsonb NOT NULL DEFAULT '[]',
  "completedAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  CONSTRAINT "AssessmentResults_sessionId_unique" UNIQUE("sessionId")
);

CREATE INDEX assessment_questions_persona_idx ON "AssessmentQuestions" ("personaId");
CREATE INDEX assessment_sessions_user_idx ON "AssessmentSessions" ("userId");
CREATE INDEX assessment_results_user_idx ON "AssessmentResults" ("userId");
`;

const up = async ({ client }) => {
  const { rows } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('AssessmentQuestions', 'AssessmentSessions', 'AssessmentResults')`
  );

  if (rows.length > 0) {
    throw new Error(
      `Cannot apply assessments migration: some tables already exist (${rows.map(r => r.tablename).join(', ')})`
    );
  }

  await client.query(SQL);
};

const down = async ({ client }) => {
  await client.query(`
    DROP TABLE IF EXISTS "AssessmentResults" CASCADE;
    DROP TABLE IF EXISTS "AssessmentSessions" CASCADE;
    DROP TABLE IF EXISTS "AssessmentQuestions" CASCADE;
    DROP TYPE IF EXISTS "enum_AssessmentResults_level";
    DROP TYPE IF EXISTS "enum_AssessmentSessions_status";
    DROP TYPE IF EXISTS "enum_AssessmentQuestions_personaId";
  `);
};

module.exports = { up, down };

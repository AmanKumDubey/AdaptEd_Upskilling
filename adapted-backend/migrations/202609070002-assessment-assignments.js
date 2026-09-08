// Phase B16: greenfield - lets an owner/admin/hr assign a specific
// assessment track to a team member. Reuses the existing
// "enum_AssessmentQuestions_personaId" type (created by the B8 assessments
// migration) rather than recreating it.
const SQL = `
CREATE TABLE "AssessmentAssignments" (
  "id" uuid PRIMARY KEY,
  "orgId" uuid NOT NULL REFERENCES "Organizations"("id") ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "assignedBy" uuid NOT NULL REFERENCES "Users"("id"),
  "personaId" "enum_AssessmentQuestions_personaId" NOT NULL,
  "dueAt" timestamptz,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE INDEX assessment_assignments_org_id_idx ON "AssessmentAssignments" ("orgId");
CREATE INDEX assessment_assignments_user_id_idx ON "AssessmentAssignments" ("userId");
`;

const up = async ({ client }) => {
  const { rows } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'AssessmentAssignments'`
  );

  if (rows.length > 0) {
    throw new Error('Cannot apply assessment-assignments migration: AssessmentAssignments already exists');
  }

  await client.query(SQL);
};

const down = async ({ client }) => {
  await client.query(`
    DROP TABLE IF EXISTS "AssessmentAssignments" CASCADE;
  `);
};

module.exports = { up, down };

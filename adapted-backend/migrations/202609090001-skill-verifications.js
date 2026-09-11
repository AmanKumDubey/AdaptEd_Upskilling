// Phase B29: greenfield - lets an owner/admin/hr mark a specific skill as
// verified for a member of their organization, replacing Skills Wallet's old
// "verified" heuristic (score >= 70 or courseCount >= 2) with a real,
// attributable verification. skillName is a free-text string (skills aren't
// a fixed enum anywhere in this codebase - they come from assessment domain
// labels and course `skills` arrays), so uniqueness is enforced on
// (userId, skillName) rather than a foreign key.
const SQL = `
CREATE TABLE "SkillVerifications" (
  "id" uuid PRIMARY KEY,
  "userId" uuid NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "orgId" uuid NOT NULL REFERENCES "Organizations"("id") ON DELETE CASCADE,
  "skillName" varchar(255) NOT NULL,
  "verifiedBy" uuid NOT NULL REFERENCES "Users"("id"),
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  UNIQUE ("userId", "skillName")
);

CREATE INDEX skill_verifications_user_id_idx ON "SkillVerifications" ("userId");
CREATE INDEX skill_verifications_org_id_idx ON "SkillVerifications" ("orgId");
`;

const up = async ({ client }) => {
  const { rows } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'SkillVerifications'`
  );

  if (rows.length > 0) {
    throw new Error('Cannot apply skill-verifications migration: SkillVerifications already exists');
  }

  await client.query(SQL);
};

const down = async ({ client }) => {
  await client.query(`
    DROP TABLE IF EXISTS "SkillVerifications" CASCADE;
  `);
};

module.exports = { up, down };

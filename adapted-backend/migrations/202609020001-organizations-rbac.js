// Phase B5: greenfield tenancy - no existing table or logic is touched.
// Organizations/Departments/OrgMembers/Invitations are entirely new, layered on
// top of the existing global Users.role enum rather than replacing it.
const SQL = `
CREATE TYPE "enum_OrgMembers_role" AS ENUM ('owner', 'admin', 'hr', 'member');

CREATE TABLE "Organizations" (
  "id" uuid PRIMARY KEY,
  "name" varchar(255) NOT NULL,
  "slug" varchar(100) NOT NULL,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  CONSTRAINT "Organizations_slug_unique" UNIQUE("slug")
);

CREATE TABLE "Departments" (
  "id" uuid PRIMARY KEY,
  "orgId" uuid NOT NULL REFERENCES "Organizations"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE TABLE "OrgMembers" (
  "id" uuid PRIMARY KEY,
  "orgId" uuid NOT NULL REFERENCES "Organizations"("id") ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "departmentId" uuid REFERENCES "Departments"("id") ON DELETE SET NULL,
  "role" "enum_OrgMembers_role" NOT NULL DEFAULT 'member',
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  CONSTRAINT "OrgMembers_org_user_unique" UNIQUE("orgId", "userId")
);

CREATE TABLE "Invitations" (
  "id" uuid PRIMARY KEY,
  "orgId" uuid NOT NULL REFERENCES "Organizations"("id") ON DELETE CASCADE,
  "departmentId" uuid REFERENCES "Departments"("id") ON DELETE SET NULL,
  "email" varchar(255) NOT NULL,
  "role" "enum_OrgMembers_role" NOT NULL DEFAULT 'member',
  "token" varchar(255) NOT NULL,
  "invitedBy" uuid NOT NULL REFERENCES "Users"("id"),
  "expiresAt" timestamptz NOT NULL,
  "acceptedAt" timestamptz,
  "revokedAt" timestamptz,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  CONSTRAINT "Invitations_token_unique" UNIQUE("token")
);

CREATE INDEX departments_org_id_idx ON "Departments" ("orgId");
CREATE INDEX org_members_org_id_idx ON "OrgMembers" ("orgId");
CREATE INDEX org_members_user_id_idx ON "OrgMembers" ("userId");
CREATE INDEX invitations_org_id_idx ON "Invitations" ("orgId");
CREATE INDEX invitations_email_idx ON "Invitations" ("email");
`;

const up = async ({ client }) => {
  const { rows } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('Organizations', 'Departments', 'OrgMembers', 'Invitations')`
  );

  if (rows.length > 0) {
    throw new Error(
      `Cannot apply organizations/RBAC migration: some tables already exist (${rows.map(r => r.tablename).join(', ')})`
    );
  }

  await client.query(SQL);
};

const down = async ({ client }) => {
  await client.query(`
    DROP TABLE IF EXISTS "Invitations" CASCADE;
    DROP TABLE IF EXISTS "OrgMembers" CASCADE;
    DROP TABLE IF EXISTS "Departments" CASCADE;
    DROP TABLE IF EXISTS "Organizations" CASCADE;
    DROP TYPE IF EXISTS "enum_OrgMembers_role";
  `);
};

module.exports = { up, down };

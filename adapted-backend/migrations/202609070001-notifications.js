// Phase B13: greenfield - no existing table or logic is touched. One
// notification type to start (a member joining an org an owner/admin/hr
// manages); more get appended to the enum later, this migration never edits.
const SQL = `
CREATE TYPE "enum_Notifications_type" AS ENUM ('org_member_joined');

CREATE TABLE "Notifications" (
  "id" uuid PRIMARY KEY,
  "userId" uuid NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "type" "enum_Notifications_type" NOT NULL,
  "title" varchar(255) NOT NULL,
  "message" varchar(1024) NOT NULL,
  "data" jsonb NOT NULL DEFAULT '{}',
  "readAt" timestamptz,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE INDEX notifications_user_id_idx ON "Notifications" ("userId");
CREATE INDEX notifications_user_unread_idx ON "Notifications" ("userId") WHERE "readAt" IS NULL;
`;

const up = async ({ client }) => {
  const { rows } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Notifications'`
  );

  if (rows.length > 0) {
    throw new Error('Cannot apply notifications migration: Notifications already exists');
  }

  await client.query(SQL);
};

const down = async ({ client }) => {
  await client.query(`
    DROP TABLE IF EXISTS "Notifications" CASCADE;
    DROP TYPE IF EXISTS "enum_Notifications_type";
  `);
};

module.exports = { up, down };

// Phase B4: adds better-auth's own tables (user, session, account, verification).
// Field shapes verified directly against better-auth@1.7.2's own getAuthTables()
// output (the CLI generator itself has an unrelated internal bug in this
// environment), not guessed from docs. Purely additive - no existing table is
// touched.
const SQL = `
CREATE TABLE "user" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "email" text NOT NULL,
  "emailVerified" boolean DEFAULT false NOT NULL,
  "image" text,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  CONSTRAINT "user_email_unique" UNIQUE("email")
);

CREATE TABLE "session" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "token" text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  CONSTRAINT "session_token_unique" UNIQUE("token")
);

CREATE TABLE "account" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "issuer" text NOT NULL,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE TABLE "verification" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE INDEX session_user_id_idx ON "session" ("userId");
CREATE INDEX account_user_id_idx ON "account" ("userId");
CREATE UNIQUE INDEX account_issuer_account_id_idx ON "account" (issuer, "accountId");
CREATE INDEX verification_identifier_idx ON "verification" (identifier);
`;

const up = async ({ client }) => {
  const { rows } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('user', 'session', 'account', 'verification')`
  );

  if (rows.length > 0) {
    throw new Error(
      `Cannot apply better-auth tables migration: some already exist (${rows.map(r => r.tablename).join(', ')})`
    );
  }

  await client.query(SQL);
};

const down = async ({ client }) => {
  await client.query(`
    DROP TABLE IF EXISTS "account" CASCADE;
    DROP TABLE IF EXISTS "session" CASCADE;
    DROP TABLE IF EXISTS "verification" CASCADE;
    DROP TABLE IF EXISTS "user" CASCADE;
  `);
};

module.exports = { up, down };

// Phase B29: greenfield - backs a real "Share Wallet" link (previously just
// copied a text summary to the clipboard). One row per user, created lazily
// the first time they share; `token` is the opaque id used in the public
// URL (GET /api/public/wallet/:token) so a learner's real userId is never
// exposed in a link they might paste anywhere.
const SQL = `
CREATE TABLE "WalletShares" (
  "id" uuid PRIMARY KEY,
  "userId" uuid NOT NULL UNIQUE REFERENCES "Users"("id") ON DELETE CASCADE,
  "token" varchar(64) NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);
`;

const up = async ({ client }) => {
  const { rows } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'WalletShares'`
  );

  if (rows.length > 0) {
    throw new Error('Cannot apply wallet-shares migration: WalletShares already exists');
  }

  await client.query(SQL);
};

const down = async ({ client }) => {
  await client.query(`
    DROP TABLE IF EXISTS "WalletShares" CASCADE;
  `);
};

module.exports = { up, down };

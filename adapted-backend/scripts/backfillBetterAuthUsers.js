require('dotenv').config({ path: '.env' });

// Phase B4: one-off, idempotent backfill. Every pre-existing row in our own
// Users table gets a matching better-auth `user` + `account` (credential) row,
// reusing the SAME id and the EXISTING bcrypt password hash as-is (verified
// against a live signup: better-auth's credential account shape is
// { accountId: <same as userId>, providerId: 'credential', issuer: 'local:credential',
// password: <bcrypt hash> } - our hash/verify config uses the identical
// bcryptjs cost-12 format already used everywhere else, so no re-hashing or
// forced password reset is needed for a single existing user).
const { eq } = require('drizzle-orm');
const { db, pool } = require('../db/client');
const { users, authUser, authAccount } = require('../db/schema');
const { newId } = require('../db/helpers');

const displayName = ({ firstName, lastName, username }) => {
  const full = `${firstName || ''} ${lastName || ''}`.trim();
  return full || username;
};

const run = async () => {
  const allUsers = await db.select().from(users);
  let created = 0;
  let skipped = 0;

  for (const user of allUsers) {
    const [existingAuthUser] = await db.select().from(authUser).where(eq(authUser.id, user.id)).limit(1);

    if (existingAuthUser) {
      skipped += 1;
      continue;
    }

    await db.insert(authUser).values({
      id: user.id,
      name: displayName(user),
      email: user.email,
      emailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });

    await db.insert(authAccount).values({
      id: newId(),
      userId: user.id,
      accountId: user.id,
      providerId: 'credential',
      issuer: 'local:credential',
      password: user.password,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });

    created += 1;
    console.log(`Backfilled ${user.email}`);
  }

  console.log(`Done. Backfilled ${created}, already present ${skipped}, total ${allUsers.length}.`);
};

run()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

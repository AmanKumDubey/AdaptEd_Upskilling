require('dotenv').config({ path: '.env' });

// Phase 1 stabilization: lightweight ordered migration runner. Applied filenames are
// recorded in SchemaMigrations so every migration runs once and reruns are safe.
//
// Phase B3: runs against a plain `pg` client instead of Sequelize's QueryInterface -
// each migration's up()/down() now receives { client } (already inside a transaction).
const fs = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');
const { getRuntimeConfig, validateEnvironment } = require('../config/environment');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

const runtimeConfig = getRuntimeConfig();
const pool = new Pool({
  host: runtimeConfig.database.host,
  port: runtimeConfig.database.port,
  database: runtimeConfig.database.name,
  user: runtimeConfig.database.user,
  password: String(runtimeConfig.database.password || ''),
});

const ensureMigrationTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "SchemaMigrations" (
      "name" VARCHAR(255) PRIMARY KEY,
      "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

const getAppliedMigrations = async (client) => {
  const { rows } = await client.query('SELECT "name" FROM "SchemaMigrations" ORDER BY "name";');
  return new Set(rows.map(row => row.name));
};

const runMigrations = async () => {
  // Phase 1 stabilization: migrations use the same validated connection settings as
  // the API and run each pending change inside a PostgreSQL transaction.
  validateEnvironment();

  const client = await pool.connect();

  try {
    await ensureMigrationTable(client);

    const applied = await getAppliedMigrations(client);
    const files = (await fs.readdir(MIGRATIONS_DIR))
      .filter(file => file.endsWith('.js'))
      .sort();

    let appliedCount = 0;

    for (const file of files) {
      if (applied.has(file)) continue;

      const migration = require(path.join(MIGRATIONS_DIR, file));
      if (typeof migration.up !== 'function') {
        throw new Error(`Migration ${file} does not export an up function`);
      }

      await client.query('BEGIN');
      try {
        await migration.up({ client });
        await client.query('INSERT INTO "SchemaMigrations" ("name") VALUES ($1);', [file]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }

      console.log(`Applied migration: ${file}`);
      appliedCount += 1;
    }

    console.log(appliedCount ? `Applied ${appliedCount} migration(s)` : 'Database is already up to date');
  } finally {
    client.release();
  }
};

runMigrations()
  .catch(error => {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

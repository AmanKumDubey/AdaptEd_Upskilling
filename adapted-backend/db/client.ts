import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { RuntimeConfig } from '../config/environment';

const schema = require('./schema');
const { getRuntimeConfig } = require('../config/environment');

// Phase B3: a separate pool from Sequelize's while the migration is in progress
// (config/database.ts still owns the Sequelize connection for not-yet-converted
// models). Both point at the same Postgres instance; this pool is consolidated
// once every model has moved off Sequelize.
const runtimeConfig: RuntimeConfig = getRuntimeConfig();

const pool = new Pool({
  host: runtimeConfig.database.host,
  port: runtimeConfig.database.port,
  database: runtimeConfig.database.name,
  user: runtimeConfig.database.user,
  password: String(runtimeConfig.database.password || ''),
  max: 10,
});

const db = drizzle(pool, { schema });

module.exports = { db, pool, schema };

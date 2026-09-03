import { defineConfig } from 'drizzle-kit';

require('dotenv').config({ path: '.env' });

// Phase B3: tooling config for future schema changes (e.g. Phase B5's
// organizations/departments tables). Not used to push/alter the live database
// during this migration - the existing schema was baselined as-is.
module.exports = defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DB_HOST as string,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME as string,
    user: process.env.DB_USER as string,
    password: process.env.DB_PASSWORD as string,
  },
});

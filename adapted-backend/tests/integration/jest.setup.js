// Test files use db/client directly for setup/cleanup (not just via HTTP),
// and db/client reads DB_HOST etc. from process.env - load .env here, the
// same way every other script in this repo does.
require('dotenv').config({ path: '.env' });

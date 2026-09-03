// Fixed, arbitrary port for the integration test server - distinct from the
// dev server's default 5000 so both can run at once.
const TEST_PORT = 5091;
const BASE_URL = `http://localhost:${TEST_PORT}`;

module.exports = { TEST_PORT, BASE_URL };

// Phase B6: better-auth is ESM-only (see auth/config.ts) - its dynamic
// import() works fine under plain Node/tsx (verified live throughout B4/B5),
// but ts-jest's CommonJS transform cannot execute it: requiring the app
// in-process here throws "Cannot use import statement outside a module" the
// moment a request hits an auth route. Sidestep the whole problem by running
// the real server as a real child process - exactly how dev/prod run it -
// and driving the integration tests against it over real HTTP instead.
const { spawn } = require('child_process');
const path = require('path');
const { TEST_PORT, BASE_URL } = require('./testServerConfig');

const waitForHealth = async (timeoutMs = 20000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch (error) {
      // Not up yet - keep polling.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Integration test server did not become healthy within ${timeoutMs}ms`);
};

module.exports = async () => {
  const cwd = path.join(__dirname, '..', '..');

  const child = spawn('npx', ['tsx', 'server.ts'], {
    cwd,
    env: { ...process.env, PORT: String(TEST_PORT), NODE_ENV: 'test' },
    stdio: 'inherit',
    shell: true,
  });

  // Jest only lets globalSetup hand values to globalTeardown via `global`
  // (test files run in separate worker processes and never see this) - this
  // is the documented pattern for exactly that handoff.
  global.__INTEGRATION_SERVER__ = child;

  await waitForHealth();
};

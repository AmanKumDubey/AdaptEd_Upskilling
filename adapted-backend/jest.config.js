/** Phase B migration: lets Jest require both legacy .js modules and new .ts modules. */
// Phase B6: unit tests here are 100% mocked (no DB) so `npm test` runs
// anywhere with no setup. DB-backed integration tests live under
// tests/integration/ and run separately via `npm run test:integration`
// (jest.integration.config.js), against a real reachable Postgres.
module.exports = {
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/integration/'],
};

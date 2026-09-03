// Phase B6: real Postgres, real HTTP, no mocks - requires DB_HOST/DB_NAME/
// DB_USER/DB_PASSWORD to point at a reachable database with migrations
// applied (see scripts/migrate.js). globalSetup spawns the actual server
// under tsx (see globalSetup.js for why - better-auth's ESM-only dynamic
// import doesn't survive ts-jest's CommonJS transform in-process) and tests
// hit it over real HTTP via supertest(BASE_URL).
module.exports = {
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testMatch: ['**/tests/integration/**/*.test.js', '**/tests/integration/**/*.test.ts'],
  testTimeout: 30000,
  globalSetup: '<rootDir>/tests/integration/globalSetup.js',
  globalTeardown: '<rootDir>/tests/integration/globalTeardown.js',
  setupFiles: ['<rootDir>/tests/integration/jest.setup.js'],
};

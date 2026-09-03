const {
  getRuntimeConfig,
  parseCorsOrigins,
  validateEnvironment
} = require('../config/environment');

const validEnv = {
  DB_HOST: '127.0.0.1',
  DB_NAME: 'adapted',
  DB_USER: 'adaptedadmin',
  DB_PASSWORD: 'password',
  DB_PORT: '5433',
  JWT_SECRET: 'a'.repeat(64),
  NODE_ENV: 'development',
  PORT: '5000'
};

describe('environment configuration', () => {
  test('creates a flat, unique CORS origin list', () => {
    expect(parseCorsOrigins('http://localhost:3000, https://app.example.com')).toEqual([
      'http://localhost:3000',
      'https://app.example.com'
    ]);
  });

  test('rejects missing required variables', () => {
    expect(() => validateEnvironment({})).toThrow(/Missing required variables/);
  });

  test('rejects a weak JWT secret', () => {
    expect(() => validateEnvironment({ ...validEnv, JWT_SECRET: 'short' }))
      .toThrow(/at least 32 characters/);
  });

  test('parses ports and database synchronization flags', () => {
    const config = getRuntimeConfig({
      ...validEnv,
      DB_SYNC: 'false',
      DB_SYNC_ALTER: 'true'
    });

    expect(config.port).toBe(5000);
    expect(config.database.port).toBe(5433);
    expect(config.database.sync).toBe(false);
    expect(config.database.syncAlter).toBe(true);
  });
});

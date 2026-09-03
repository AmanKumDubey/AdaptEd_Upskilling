// Phase 1 stabilization:
// Keep parsing and validation in one place so the API, worker, migrations, and tests
// use the same rules instead of interpreting environment variables differently.
const DEFAULT_CORS_ORIGIN = 'http://localhost:3000';
const VALID_NODE_ENVIRONMENTS = new Set(['development', 'test', 'production']);

export type EnvSource = Record<string, string | undefined>;

export interface DatabaseConfig {
  host: string | undefined;
  name: string | undefined;
  user: string | undefined;
  password: string | undefined;
  port: number;
  sync: boolean;
  syncAlter: boolean;
}

export interface RuntimeConfig {
  nodeEnv: string;
  port: number;
  corsOrigins: string[];
  database: DatabaseConfig;
}

const parseBoolean = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const parsePort = (value: string | undefined, fallback: number, variableName: string): number => {
  const parsed = value === undefined || value === '' ? fallback : Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`${variableName} must be an integer between 1 and 65535`);
  }

  return parsed;
};

const parseCorsOrigins = (value: string | undefined): string[] => {
  const configured = String(value || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  return Array.from(new Set([DEFAULT_CORS_ORIGIN, ...configured]));
};

const getRuntimeConfig = (env: EnvSource = process.env): RuntimeConfig => {
  const nodeEnv = env.NODE_ENV || 'development';

  return {
    nodeEnv,
    port: parsePort(env.PORT, 5000, 'PORT'),
    corsOrigins: parseCorsOrigins(env.CORS_ORIGIN),
    database: {
      host: env.DB_HOST,
      name: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      port: parsePort(env.DB_PORT, 5432, 'DB_PORT'),
      // Phase 1 stabilization: schema changes are migration-driven by default.
      // DB_SYNC remains available only as an explicit local-development escape hatch.
      sync: parseBoolean(env.DB_SYNC, false),
      syncAlter: parseBoolean(env.DB_SYNC_ALTER, false),
    },
  };
};

const validateEnvironment = (env: EnvSource = process.env): RuntimeConfig => {
  // Phase 1 stabilization: fail during startup with one actionable error instead of
  // allowing missing credentials or a weak JWT secret to fail later during requests.
  const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
  const errors: string[] = [];
  const missing = required.filter(name => !String(env[name] || '').trim());

  if (missing.length) {
    errors.push(`Missing required variables: ${missing.join(', ')}`);
  }

  if (env.JWT_SECRET && String(env.JWT_SECRET).length < 32) {
    errors.push('JWT_SECRET must contain at least 32 characters');
  }

  if (env.NODE_ENV && !VALID_NODE_ENVIRONMENTS.has(env.NODE_ENV)) {
    errors.push('NODE_ENV must be development, test, or production');
  }

  let config: RuntimeConfig | undefined;
  try {
    config = getRuntimeConfig(env);
  } catch (error) {
    errors.push((error as Error).message);
  }

  if (errors.length) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`);
  }

  return config as RuntimeConfig;
};

module.exports = {
  DEFAULT_CORS_ORIGIN,
  getRuntimeConfig,
  parseBoolean,
  parseCorsOrigins,
  validateEnvironment,
};

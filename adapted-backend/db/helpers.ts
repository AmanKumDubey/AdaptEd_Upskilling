import { randomUUID } from 'crypto';

// Phase B3: the live database has no server-side default for "id", "createdAt",
// or "updatedAt" on any table (Sequelize generated all three in JS before every
// insert). These helpers keep that behavior identical under Drizzle.
const newId = (): string => randomUUID();

const withTimestamps = <T extends object>(values: T) => {
  const now = new Date();
  return { ...values, createdAt: now, updatedAt: now };
};

const touch = <T extends object>(values: T) => ({ ...values, updatedAt: new Date() });

module.exports = { newId, withTimestamps, touch };

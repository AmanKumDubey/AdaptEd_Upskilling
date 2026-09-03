import pino from 'pino';

// Phase B6: structured JSON logs, replacing morgan's plain-text access log -
// every request/error line is now a parseable JSON object (level, time, msg,
// plus request/error context), not a fixed-format string that needs regex to
// query in a log aggregator.
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

module.exports = { logger };

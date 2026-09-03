import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

const { sendError } = require('../utilities/helpers/helper');
const { HTTP_STATUS } = require('../utilities/constants');

// Phase B6: closes a real gap - nothing throttled repeated attempts against
// /login, /register, or the OTP endpoints before this, so a scripted
// brute-force run had no friction at all.
const rateLimitHandler = (req: Request, res: Response) => {
  sendError(res, HTTP_STATUS.TOO_MANY_REQUESTS, 'Too many requests. Please try again later.');
};

// Integration tests (tests/integration/) exercise register/login dozens of
// times per run from the same source IP - without this they'd trip the
// limiter on their own requests rather than the app under test. Jest sets
// NODE_ENV=test by default, so normal dev/prod traffic is unaffected.
const skipInTest = () => process.env.NODE_ENV === 'test';

// 10 attempts per 15 minutes per IP - generous enough for a real user who
// mistypes a password a few times, tight enough to make scripted brute-force
// impractical.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: skipInTest,
});

// OTP endpoints are guessable 6-digit codes - tighter limit than plain
// login/register.
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: skipInTest,
});

module.exports = { authLimiter, otpLimiter };

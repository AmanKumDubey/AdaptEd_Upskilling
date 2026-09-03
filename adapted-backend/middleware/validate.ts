import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

const { sendError } = require('../utilities/helpers/helper');
const { HTTP_STATUS } = require('../utilities/constants');

type RequestSource = 'body' | 'query' | 'params';

// Phase B2: one Zod schema per request shape, enforced at the edge.
// Replaces express-validator's per-field chains and the ad hoc manual
// checks that used to live inside controllers.
const validate = (schema: ZodTypeAny, source: RequestSource = 'body') =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse((req as any)[source]);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.length ? issue.path.join('.') : '(root)',
        message: issue.message,
      }));

      return sendError(res, HTTP_STATUS.UNPROCESSABLE_ENTITY, 'Validation failed', errors);
    }

    // Controllers read the parsed value, not the raw one: defaults are applied,
    // emails are trimmed/lowercased, query-string numbers are coerced, etc.
    (req as any)[source] = result.data;
    next();
  };

module.exports = { validate };

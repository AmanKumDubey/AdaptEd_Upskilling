import express from 'express';

const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  startSessionSchema,
  sessionIdParamSchema,
  resultIdParamSchema,
  answerQuestionSchema,
} = require('../schemas/assessmentSchemas');

const {
  startSession,
  getActiveSession,
  answerQuestion,
  completeSession,
  listResults,
  getLatestResult,
  getResult,
} = require('../controllers/assessmentController');

// Every route here is user-scoped - no public routes to leak through a
// path-less router.use(authenticate) the way authRoutes.ts's did.
router.use(authenticate);

router.post('/sessions', validate(startSessionSchema), startSession);
router.get('/sessions/active', getActiveSession);
router.put('/sessions/:sessionId/answer', validate(sessionIdParamSchema, 'params'), validate(answerQuestionSchema), answerQuestion);
router.post('/sessions/:sessionId/complete', validate(sessionIdParamSchema, 'params'), completeSession);

router.get('/results', listResults);
router.get('/results/latest', getLatestResult);
router.get('/results/:resultId', validate(resultIdParamSchema, 'params'), getResult);

module.exports = router;

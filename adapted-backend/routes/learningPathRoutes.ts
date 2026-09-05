import express from 'express';

const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { generatePathSchema, moduleIdParamSchema } = require('../schemas/learningPathSchemas');
const {
  getPath,
  generatePath,
  startModuleHandler,
  completeModuleHandler,
  resetPathProgress,
} = require('../controllers/learningPathController');

// Every route here is user-scoped - no public routes to leak through a
// path-less router.use(authenticate) the way authRoutes.ts's did.
router.use(authenticate);

router.get('/', getPath);
router.post('/generate', validate(generatePathSchema), generatePath);
router.put('/modules/:moduleId/start', validate(moduleIdParamSchema, 'params'), startModuleHandler);
router.put('/modules/:moduleId/complete', validate(moduleIdParamSchema, 'params'), completeModuleHandler);
router.post('/reset', resetPathProgress);

module.exports = router;

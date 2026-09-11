import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

require('dotenv').config({ path: '.env' });

const { connectDB } = require('./config/database');
const { getRuntimeConfig, validateEnvironment } = require('./config/environment');
const { logger } = require('./config/logger');
const { healthCheck } = require('./controllers/healthController');
const { startHttpServer } = require('./services/startupService');

const app = express();

// Phase B3: no more per-model requires here - Sequelize needed these purely to
// register associations at import time. Drizzle's schema (db/schema.ts) already
// declares every table up front, so there's no side-effect registration step.

// Import routes
const authRoutes = require('./routes/authRoutes');
const onboardingRoutes = require('./routes/onboardingRoutes');
const courseRoutes = require('./routes/courseRoutes');
const userCourseRoutes = require('./routes/userCourseRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const learningPathRoutes = require('./routes/learningPathRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const meAssignmentRoutes = require('./routes/meAssignmentRoutes');
const meOnboardingProfileRoutes = require('./routes/meOnboardingProfileRoutes');
const meSkillVerificationRoutes = require('./routes/meSkillVerificationRoutes');
const walletShareRoutes = require('./routes/walletShareRoutes');
const publicWalletRoutes = require('./routes/publicWalletRoutes');

// Middleware
app.use(helmet()); // Security headers
// Phase 1 stabilization: parse CORS_ORIGIN into one flat, de-duplicated origin list.
// The previous nested array could reject valid frontend origins unexpectedly.
const runtimeConfig = getRuntimeConfig();

app.use(cors({
  origin: runtimeConfig.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(pinoHttp({ logger })); // Structured JSON request logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

// better-auth's own routes (sign-in/social, callback/:provider, get-session,
// etc.) - only reached for /api/auth/* paths authRoutes itself didn't match,
// since authRoutes is mounted first and Express falls through on no match.
app.all('/api/auth/*', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const { getAuth } = require('./auth/config');
    const { toNodeHandler } = await import('better-auth/node');
    const auth = await getAuth();
    return toNodeHandler(auth.handler)(req, res);
  } catch (error) {
    next(error);
  }
});

app.use('/api/onboarding', onboardingRoutes);

// User-specific course routes (wishlist, continue learning, enroll/verify)
app.use('/api/me', userCourseRoutes);

// Public course catalog routes
app.use('/api', courseRoutes);

// Certificate Routes
app.use('/api/me', certificateRoutes);

// Assessments (Phase B8 - previously 100% client-side/localStorage)
app.use('/api/me/assessment', assessmentRoutes);

// Learning Path (Phase B9 - previously 100% client-side/localStorage)
app.use('/api/me/learning-path', learningPathRoutes);

// Recommendation Routes
app.use('/api/me', recommendationRoutes);

// Organizations, departments, members (tenant-scoped RBAC)
app.use('/api/orgs', organizationRoutes);

// Invitation acceptance (not org-scoped - caller isn't a member yet)
app.use('/api/invitations', invitationRoutes);

// Notifications (Phase B13)
app.use('/api/me/notifications', notificationRoutes);

// Assessment assignments - assignee's own view (Phase B16)
app.use('/api/me/assessment-assignments', meAssignmentRoutes);

// Onboarding wizard profile, persisted per account (Phase B17)
app.use('/api/me/onboarding-profile', meOnboardingProfileRoutes);

// Skill verifications - a learner's own view (Phase B29); the granting side
// (POST/DELETE) lives on organizationRoutes since only an owner/admin/hr can verify.
app.use('/api/me/skill-verifications', meSkillVerificationRoutes);

// Skills Wallet share link (Phase B29) - authenticated get-or-create, plus
// the one genuinely public, unauthenticated read in this API.
app.use('/api/me/wallet-share', walletShareRoutes);
app.use('/api/public/wallet', publicWalletRoutes);

// Phase 1 stabilization: this endpoint now verifies PostgreSQL, not only the HTTP server.
app.get('/api/health', healthCheck);

// Phase B6: served from the file `npm run openapi:generate` writes (generated
// straight from the B2 Zod schemas - see scripts/generateOpenApi.ts) rather
// than a hand-maintained document that drifts from the real routes.
app.get('/api/openapi.json', (req: express.Request, res: express.Response) => {
  const fs = require('fs');
  const path = require('path');
  const specPath = path.join(__dirname, 'openapi.json');

  if (!fs.existsSync(specPath)) {
    return res.status(404).json({
      status: 'error',
      message: 'OpenAPI spec not generated yet. Run `npm run openapi:generate`.',
    });
  }

  res.type('application/json').send(fs.readFileSync(specPath, 'utf-8'));
});

// 404 handler
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ err: error }, 'Unhandled request error');
  res.status(error.status || 500).json({
    status: 'error',
    message: error.message || 'Internal server error',
  });
});

// Phase 1 stabilization: validate configuration and connect to PostgreSQL before listening.
// Phase B4: also bootstrap better-auth once up front (it's loaded via a dynamic
// import behind getAuth() - see auth/config.ts) so the first real request never
// pays that one-time cost.
const startServer = async () => {
  const config = validateEnvironment();
  const { getAuth } = require('./auth/config');
  await getAuth();

  return startHttpServer({
    application: app,
    connectDatabase: connectDB,
    port: config.port,
    nodeEnv: config.nodeEnv,
  });
};

if (require.main === module) {
  startServer().catch((error: Error) => {
    console.error('Failed to start server:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, startServer };

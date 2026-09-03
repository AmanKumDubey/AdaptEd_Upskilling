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
app.use('/api/onboarding', onboardingRoutes);

// User-specific course routes (wishlist, continue learning, enroll/verify)
app.use('/api/me', userCourseRoutes);

// Public course catalog routes
app.use('/api', courseRoutes);

// Certificate Routes
app.use('/api/me', certificateRoutes);

// Recommendation Routes
app.use('/api/me', recommendationRoutes);

// Organizations, departments, members (tenant-scoped RBAC)
app.use('/api/orgs', organizationRoutes);

// Invitation acceptance (not org-scoped - caller isn't a member yet)
app.use('/api/invitations', invitationRoutes);

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

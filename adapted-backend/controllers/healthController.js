const { database: defaultDatabase } = require('../config/database');

// Phase 1 stabilization: health means both Express and PostgreSQL are available.
// Returning 503 for a database outage prevents deployments from reporting false health.
const createHealthCheck = (database = defaultDatabase) => async (req, res) => {
  try {
    await database.authenticate();

    return res.status(200).json({
      status: 'success',
      message: 'Server and database are healthy',
      services: {
        api: 'up',
        database: 'up'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(503).json({
      status: 'error',
      message: 'Database is unavailable',
      services: {
        api: 'up',
        database: 'down'
      },
      timestamp: new Date().toISOString()
    });
  }
};

const healthCheck = createHealthCheck();
module.exports = { createHealthCheck, healthCheck };

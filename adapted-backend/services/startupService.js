// Phase 1 stabilization: PostgreSQL must connect successfully before the HTTP port opens.
// This prevents the API from accepting traffic while its required database is unavailable.
const startHttpServer = async ({
  application,
  connectDatabase,
  port,
  nodeEnv,
  logger = console
}) => {
  await connectDatabase();

  return new Promise((resolve, reject) => {
    const server = application.listen(port);

    const handleError = error => {
      server.removeListener('listening', handleListening);
      reject(error);
    };

    const handleListening = () => {
      server.removeListener('error', handleError);
      logger.log(`Server is running on port ${port}`);
      logger.log(`Environment: ${nodeEnv}`);
      resolve(server);
    };

    server.once('error', handleError);
    server.once('listening', handleListening);
  });
};

module.exports = { startHttpServer };

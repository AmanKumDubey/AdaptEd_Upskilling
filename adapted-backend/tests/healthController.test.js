const { createHealthCheck } = require('../controllers/healthController');

const createResponse = () => {
  const response = {};
  response.status = jest.fn(() => response);
  response.json = jest.fn(() => response);
  return response;
};

describe('health check', () => {
  test('returns 200 when PostgreSQL is available', async () => {
    const database = { authenticate: jest.fn().mockResolvedValue(undefined) };
    const response = createResponse();

    await createHealthCheck(database)({}, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'success',
      services: { api: 'up', database: 'up' }
    }));
  });

  test('returns 503 when PostgreSQL is unavailable', async () => {
    const database = { authenticate: jest.fn().mockRejectedValue(new Error('offline')) };
    const response = createResponse();

    await createHealthCheck(database)({}, response);

    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'error',
      services: { api: 'up', database: 'down' }
    }));
  });
});

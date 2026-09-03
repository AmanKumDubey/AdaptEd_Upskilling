const { EventEmitter } = require('events');
const { startHttpServer } = require('../services/startupService');

describe('HTTP startup', () => {
  test('waits for the database before listening', async () => {
    const calls = [];
    const server = new EventEmitter();
    const connectDatabase = jest.fn(async () => calls.push('database'));
    const application = {
      listen: jest.fn(() => {
        calls.push('listen');
        setImmediate(() => server.emit('listening'));
        return server;
      })
    };

    await startHttpServer({
      application,
      connectDatabase,
      port: 5000,
      nodeEnv: 'test',
      logger: { log: jest.fn() }
    });

    expect(calls).toEqual(['database', 'listen']);
  });

  test('does not listen when the database connection fails', async () => {
    const application = { listen: jest.fn() };
    const connectDatabase = jest.fn().mockRejectedValue(new Error('database unavailable'));

    await expect(startHttpServer({
      application,
      connectDatabase,
      port: 5000,
      nodeEnv: 'test'
    })).rejects.toThrow('database unavailable');

    expect(application.listen).not.toHaveBeenCalled();
  });
});

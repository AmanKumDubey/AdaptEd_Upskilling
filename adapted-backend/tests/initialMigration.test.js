const migration = require('../migrations/202608180001-initial-schema');

const tableRows = (names) => ({ rows: names.map(tablename => ({ tablename })) });

describe('initial database migration', () => {
  test('baselines an existing complete schema without recreating tables', async () => {
    const client = { query: jest.fn().mockResolvedValueOnce(tableRows(migration.CORE_TABLES)) };

    await migration.up({ client });

    expect(client.query).toHaveBeenCalledTimes(1); // only the introspection query
  });

  test('creates the schema when the database is empty', async () => {
    const client = { query: jest.fn().mockResolvedValueOnce(tableRows([])).mockResolvedValueOnce(undefined) };

    await migration.up({ client });

    expect(client.query).toHaveBeenNthCalledWith(2, migration.INITIAL_SCHEMA_SQL);
  });

  test('rejects a partial schema instead of making unsafe assumptions', async () => {
    const client = { query: jest.fn().mockResolvedValueOnce(tableRows(['Users'])) };

    await expect(migration.up({ client })).rejects.toThrow(/partial schema/);
  });
});

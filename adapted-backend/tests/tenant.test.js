jest.mock('../db/client', () => ({ db: { select: jest.fn() } }));

const { db } = require('../db/client');
const { requireOrgMembership, requireOrgRole } = require('../middleware/tenant');

// Mocks db.select().from().where().limit() to resolve with `rows`, and
// captures the where-clause arguments so tests can assert the lookup was
// actually scoped by (orgId, userId) - not just "any membership row exists".
const mockSelectResult = (rows) => {
  const where = jest.fn(() => ({ limit: jest.fn().mockResolvedValue(rows) }));
  const from = jest.fn(() => ({ where }));
  db.select.mockReturnValue({ from });
  return { where };
};

const createResponse = () => {
  const response = {};
  response.status = jest.fn(() => response);
  response.json = jest.fn(() => response);
  return response;
};

describe('tenant isolation (requireOrgMembership)', () => {
  afterEach(() => jest.clearAllMocks());

  test('a member of Org A is granted access to Org A', async () => {
    const membership = { id: 'mem-1', orgId: 'org-a', userId: 'user-1', role: 'member', departmentId: null };
    mockSelectResult([membership]);

    const req = { params: { orgId: 'org-a' }, user: { userId: 'user-1' } };
    const res = createResponse();
    const next = jest.fn();

    await requireOrgMembership(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.orgMember).toEqual(membership);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('a member of Org A is REJECTED from Org B, even with a fully valid session', async () => {
    // The membership lookup is scoped to (orgB, user-1) - user-1 has no row
    // there (only in Org A), so the query legitimately returns nothing.
    mockSelectResult([]);

    const req = { params: { orgId: 'org-b' }, user: { userId: 'user-1' } };
    const res = createResponse();
    const next = jest.fn();

    await requireOrgMembership(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(req.orgMember).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'error',
      message: 'You are not a member of this organization',
    }));
  });

  test('the lookup is scoped by BOTH orgId and userId, not userId alone', async () => {
    const { where } = mockSelectResult([{ id: 'mem-1', orgId: 'org-a', userId: 'user-1', role: 'member' }]);

    const req = { params: { orgId: 'org-a' }, user: { userId: 'user-1' } };
    await requireOrgMembership(req, createResponse(), jest.fn());

    // drizzle-orm's and()/eq() build a SQL AST (a tree of SQL/Column/Param
    // nodes, with cycles back to the table) - walk it collecting Column names
    // instead of JSON.stringify-ing it, to confirm the query is actually
    // scoped by BOTH orgId and userId, not just one of them.
    const condition = where.mock.calls[0][0];
    const seen = new Set();
    const columnNames = [];
    const walk = (node) => {
      if (!node || typeof node !== 'object' || seen.has(node)) return;
      seen.add(node);
      if (node.name && node.constructor?.name?.startsWith('Pg')) columnNames.push(node.name);
      if (Array.isArray(node.queryChunks)) node.queryChunks.forEach(walk);
    };
    walk(condition);

    expect(columnNames).toEqual(expect.arrayContaining(['orgId', 'userId']));
  });
});

describe('tenant isolation (requireOrgRole)', () => {
  test('rejects a plain member from an owner/admin-only action', () => {
    const req = { orgMember: { role: 'member' } };
    const res = createResponse();
    const next = jest.fn();

    requireOrgRole('owner', 'admin')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('allows an owner through an owner/admin-only action', () => {
    const req = { orgMember: { role: 'owner' } };
    const res = createResponse();
    const next = jest.fn();

    requireOrgRole('owner', 'admin')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

const request = require('supertest');
const app = require('../../src/app');
const dbHelper = require('../fixtures/db-helper');
const User = require('../../src/models/User');
const AuditLog = require('../../src/models/AuditLog');
const { createHubAdmin } = require('../../src/hub/createAdmin');
const { parseArgs } = require('../../src/hub/cli');

describe('Hub: first super-admin creation', () => {
  const details = {
    name: 'Hub Owner',
    email: 'Owner@Example.com',
    password: 'HubSecret2026',
  };

  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterAll(async () => {
    await dbHelper.disconnect();
  });

  beforeEach(async () => {
    await dbHelper.clearDatabase();
  });

  it('creates a super-admin on an empty Hub who can log in', async () => {
    const result = await createHubAdmin(details);

    expect(result.created).toBe(true);
    expect(result.user).toMatchObject({ email: 'owner@example.com', role: 'super-admin' });
    expect(result.user).not.toHaveProperty('password');

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@example.com', password: details.password });
    expect(login.status).toBe(200);
    expect(login.body.data.user.role).toBe('super-admin');

    const audit = await AuditLog.findOne({ action: 'hub:create-admin' }).lean();
    expect(audit).not.toBeNull();
    expect(JSON.stringify(audit)).not.toContain(details.password);
  });

  it('refuses to create a second super-admin unless explicitly allowed', async () => {
    await createHubAdmin(details);

    const again = await createHubAdmin({ ...details, email: 'second@example.com' });
    expect(again.created).toBe(false);
    expect(again.reason).toMatch(/already exists/i);
    expect(await User.countDocuments({ role: 'super-admin' })).toBe(1);

    const allowed = await createHubAdmin({
      ...details,
      email: 'second@example.com',
      allowAdditional: true,
    });
    expect(allowed.created).toBe(true);
    expect(await User.countDocuments({ role: 'super-admin' })).toBe(2);
  });

  it('does not overwrite an existing account with the same email', async () => {
    await User.create({
      name: 'Existing Guest',
      email: 'owner@example.com',
      password: 'GuestPass123',
      role: 'user',
    });

    const result = await createHubAdmin(details);
    expect(result.created).toBe(false);
    const user = await User.findOne({ email: 'owner@example.com' }).lean();
    expect(user.role).toBe('user');
  });

  it.each([
    ['short password', { password: 'Abc12345' }],
    ['password without digits', { password: 'OnlyLettersHere' }],
    ['missing email', { email: '' }],
    ['missing name', { name: '  ' }],
  ])('rejects %s', async (_label, override) => {
    await expect(createHubAdmin({ ...details, ...override })).rejects.toThrow(/Invalid admin details/);
    expect(await User.countDocuments()).toBe(0);
  });

  it('parses CLI flags', () => {
    expect(parseArgs(['init-replset', '--host=127.0.0.1:27017', '--allow-additional'])).toEqual({
      command: 'init-replset',
      flags: { host: '127.0.0.1:27017', 'allow-additional': true },
    });
  });
});

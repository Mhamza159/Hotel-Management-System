const mongoose = require('mongoose');
const User = require('../../src/models/User');
const { ROLES, PERMISSIONS, ROLE_DEFAULT_PERMISSIONS } = require('../../src/config/constants');
const dbHelper = require('../fixtures/db-helper');

describe('User Model Unit Verification', () => {
  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterAll(async () => {
    await dbHelper.disconnect();
  });

  afterEach(async () => {
    await dbHelper.clearDatabase();
  });

  it('hashes password on save and does not return password in find queries by default', async () => {
    const rawPassword = 'SecurePassword123!';
    const user = await User.create({
      name: 'Hamza Guest',
      email: 'guest@hotel.com',
      password: rawPassword,
    });

    expect(user.password).not.toBe(rawPassword);
    expect(user.password).toMatch(/^\$2[aby]\$\d+\$/); // Valid bcrypt hash pattern

    // Query from database - password should be excluded
    const queried = await User.findById(user._id);
    expect(queried.password).toBeUndefined();

    // Query with explicit select('+password')
    const queriedWithPassword = await User.findById(user._id).select('+password');
    expect(queriedWithPassword.password).toBeDefined();

    // Verify isPasswordMatch
    const isMatch = await queriedWithPassword.isPasswordMatch(rawPassword);
    const isWrongMatch = await queriedWithPassword.isPasswordMatch('WrongPassword!');
    expect(isMatch).toBe(true);
    expect(isWrongMatch).toBe(false);
  });

  it('automatically populates default permissions for the specified role', async () => {
    const receptionist = await User.create({
      name: 'Front Desk Sara',
      email: 'sara@hotel.com',
      password: 'StrongPassword123!',
      role: ROLES.RECEPTIONIST,
    });

    expect(receptionist.permissions).toEqual(
      expect.arrayContaining(ROLE_DEFAULT_PERMISSIONS[ROLES.RECEPTIONIST])
    );
    expect(receptionist.hasPermission(PERMISSIONS.CHECKIN_MANAGE)).toBe(true);
    expect(receptionist.hasPermission(PERMISSIONS.ROOMS_DELETE)).toBe(false);
  });

  it('super-admin role implicitly bypasses all permission checks', async () => {
    const admin = await User.create({
      name: 'Super Admin Boss',
      email: 'boss@hotel.com',
      password: 'AdminPassword123!',
      role: ROLES.SUPER_ADMIN,
      permissions: [], // Even with empty permissions array
    });

    // Should return true for any permission
    expect(admin.hasPermission(PERMISSIONS.ROOMS_DELETE)).toBe(true);
    expect(admin.hasPermission(PERMISSIONS.STAFF_MANAGE)).toBe(true);
    expect(admin.hasPermission('any:unregistered:permission')).toBe(true);
  });

  it('fails validation when email format is invalid or password is too short', async () => {
    await expect(
      User.create({
        name: 'Invalid Email User',
        email: 'not-an-email',
        password: 'Password123!',
      })
    ).rejects.toThrow();

    await expect(
      User.create({
        name: 'Short Password User',
        email: 'valid@hotel.com',
        password: 'short', // < 8 chars
      })
    ).rejects.toThrow();
  });
});

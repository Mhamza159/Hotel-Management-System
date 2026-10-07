const {
  requirePermission,
  requireAnyPermission,
} = require('../../src/middlewares/permission.middleware');
const { ROLES, PERMISSIONS } = require('../../src/config/constants');
const ApiError = require('../../src/utils/apiError');

describe('PBAC Permission Middleware Unit Verification', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
  });

  it('rejects unauthenticated requests (req.user is undefined) with 401 ApiError', () => {
    const middleware = requirePermission(PERMISSIONS.BOOKINGS_VIEW);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(401);
  });

  it('allows access when user explicitly possesses the required permission', () => {
    req.user = {
      role: ROLES.RECEPTIONIST,
      permissions: [PERMISSIONS.CHECKIN_MANAGE, PERMISSIONS.BOOKINGS_VIEW],
      hasPermission: function (perm) {
        return this.permissions.includes(perm);
      },
    };

    const middleware = requirePermission(PERMISSIONS.CHECKIN_MANAGE);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(); // Called with no error
  });

  it('implicitly bypasses permission checks for super-admin accounts', () => {
    req.user = {
      role: ROLES.SUPER_ADMIN,
      permissions: [],
      hasPermission: function () {
        return true; // Super-admin bypass logic from User model
      },
    };

    const middleware = requirePermission(PERMISSIONS.ROOMS_DELETE);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('denies access with 403 ApiError when user lacks the required permission', () => {
    req.user = {
      role: ROLES.GUEST,
      permissions: [PERMISSIONS.BOOKINGS_VIEW],
      hasPermission: function (perm) {
        return this.permissions.includes(perm);
      },
    };

    const middleware = requirePermission(PERMISSIONS.ROOMS_DELETE);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(403);
    expect(err.message).toContain(PERMISSIONS.ROOMS_DELETE);
  });

  it('requireAnyPermission allows access if user has any one of the listed permissions', () => {
    req.user = {
      role: ROLES.HOUSEKEEPING,
      permissions: [PERMISSIONS.HOUSEKEEPING_UPDATE],
      hasPermission: function (perm) {
        return this.permissions.includes(perm);
      },
    };

    const middleware = requireAnyPermission([
      PERMISSIONS.ROOMS_CREATE,
      PERMISSIONS.HOUSEKEEPING_UPDATE,
    ]);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});

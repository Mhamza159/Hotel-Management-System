const ApiError = require("../utils/apiError");

/**
 * =========================================================================
 * DYNAMIC PBAC (Permission-Based Access Control) MIDDLEWARE
 * =========================================================================
 * 
 * NOTE: Yeh middleware kisi ko permission "assign / grant" nahi karta.
 * Iska kaam Security Guard ki tarah route par check (enforce) karna hai
 * ke jo user request bhej raha hai, kya uske account me yeh permission maujood hai?
 */

/**
 * Middleware factory jo single required permission check karta hai.
 * 
 * Usage example on a route:
 * router.post('/rooms', authenticate, requirePermission('rooms:create'), createRoomController);
 * 
 * @param {string} requiredPermission - Permission string (e.g. 'rooms:create' from PERMISSIONS constant)
 * @returns {Function} Express middleware (req, res, next)
 */
const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    // 1. Check: Kya user authenticated hai?
    // Agar route par 'authenticate' middleware lagana bhool gaye, toh req.user nahi hoga.
    if (!req.user) {
      return next(
        new ApiError(401, "Authentication required before permission evaluation.")
      );
    }

    // 2. Check: Safety check ke kya User model ka custom method 'hasPermission' exist karta hai
    if (typeof req.user.hasPermission !== "function") {
      return next(
        new ApiError(500, "Internal error: User model lacks permission evaluation helper.")
      );
    }

    // 3. Check: User model ka method check karega:
    // - Agar user 'super-admin' hai -> direct true return hoga (Super-admin bypass)
    // - Agar receptionist/guest hai -> check karega ke user.permissions array me yeh string hai ya nahi
    if (req.user.hasPermission(requiredPermission)) {
      // Access Granted: User ke paas ijazat hai, agle controller ko request pass kardo
      return next();
    }

    // 4. Access Denied: User ke paas yeh permission nahi hai, 403 Forbidden throw karo
    return next(
      new ApiError(
        403,
        `Forbidden: You do not have the required permission '${requiredPermission}' to perform this action.`
      )
    );
  };
};

/**
 * Middleware factory jo check karta hai ke user ke paas di gayi permissions
 * ki list me se KAM AZ KAM KOI EK (at least one) permission zaroor ho.
 * 
 * Usage example on a route:
 * router.get('/rooms/status', authenticate, requireAnyPermission(['checkin:manage', 'housekeeping:update']), controller);
 * 
 * @param {string[]} permissions - Array of permission strings
 * @returns {Function} Express middleware
 */
const requireAnyPermission = (permissions = []) => {
  return (req, res, next) => {
    // 1. Check: User authenticated hai ya nahi
    if (!req.user) {
      return next(
        new ApiError(401, "Authentication required before permission evaluation.")
      );
    }

    // 2. Check: Array me se koi ek bhi permission match kar gayi toh true aayega
    const hasAny = permissions.some((permission) =>
      req.user.hasPermission(permission)
    );

    if (hasAny) {
      // Access Granted
      return next();
    }

    // Access Denied (user ke paas inme se koi ek bhi permission nahi thi)
    return next(
      new ApiError(
        403,
        `Forbidden: Requires at least one of permissions: [${permissions.join(", ")}]`
      )
    );
  };
};

module.exports = {
  requirePermission,
  requireAnyPermission,
};

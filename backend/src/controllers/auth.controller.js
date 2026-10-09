const User = require("../models/User");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const config = require("../config/env");
const { ROLES, PERMISSIONS, ROLE_DEFAULT_PERMISSIONS } = require("../config/constants");
const AuditService = require("../services/audit.service");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} = require("../middlewares/auth.middleware");

/**
 * =========================================================================
 * AUTHENTICATION CONTROLLER
 * =========================================================================
 *
 * Handles user registration, credentials verification (login),
 * token refresh rotation, and current authenticated user retrieval.
 */

/**
 * Register a new user (Guest or Staff member).
 * Route: POST /api/v1/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // 1. Basic validation: Required fields check
    if (!name || !email || !password) {
      throw new ApiError(400, "Name, email, and password are required fields.");
    }

    // 2. Duplicate Check: Email pehle se database me maujood toh nahi?
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(
        409,
        "An account with this email address already exists."
      );
    }

    // 3. User Creation (Security Enforcement):
    // Public registration hamesha ROLES.GUEST ('user') hi banayegi.
    // Koi bhi bahar se 'role' parameter bhej kar Admin ya Staff nahi ban sakta!
    // Staff accounts sirf Super Admin apne dashboard se create karega.
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: ROLES.GUEST, // Strictly guest only
    });

    // 4. JWT Tokens Generation
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    // 5. Response sanitize karna (password field response me kabhi nahi jani chahiye)
    const userResponse = user.toObject();
    delete userResponse.password;

    // 6. Return 201 Created standard ApiResponse
    return res.status(201).json(
      new ApiResponse(
        201,
        {
          user: userResponse,
          tokens: {
            accessToken,
            refreshToken,
          },
        },
        "User registered successfully."
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Log in an existing user with email and password.
 * Route: POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Validation: Credentials provided check
    if (!email || !password) {
      throw new ApiError(400, "Please provide both email and password.");
    }

    // 2. Database lookup:
    // User schema me password 'select: false' hai, is liye '+password' lagana zaroori hai
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );

    // 3. User existence check
    if (!user) {
      throw new ApiError(401, "Invalid email or password.");
    }

    // 4. Password verification using bcrypt compare method
    const isMatch = await user.isPasswordMatch(password);
    if (!isMatch) {
      throw new ApiError(401, "Invalid email or password.");
    }

    // 5. Account status check: Kya account active hai?
    if (!user.isActive) {
      throw new ApiError(
        401,
        "Your account has been deactivated. Please contact hotel administration."
      );
    }

    // 6. Generate fresh Access and Refresh tokens
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    // 7. Sanitize password before sending
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          user: userResponse,
          tokens: {
            accessToken,
            refreshToken,
          },
        },
        "User logged in successfully."
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Generates a new access and refresh token pair using a valid refresh token.
 * Route: POST /api/v1/auth/refresh-token
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    // 1. Refresh token presence check
    if (!token) {
      throw new ApiError(400, "Refresh token is required in request body.");
    }

    // 2. Verify token signature with JWT_REFRESH_SECRET
    let decoded;
    try {
      decoded = verifyToken(token, config.jwt.refreshSecret);
    } catch (err) {
      throw new ApiError(
        401,
        "Invalid or expired refresh token. Please log in again."
      );
    }

    // 3. Database se user find karna taake verify ho sake account abhi bhi active hai
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      throw new ApiError(
        401,
        "User belonging to this token no longer exists or is deactivated."
      );
    }

    // 4. Token Rotation: Naya Access Token aur naya Refresh Token issue karein
    const newAccessToken = generateAccessToken(user._id.toString());
    const newRefreshToken = generateRefreshToken(user._id.toString());

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          tokens: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          },
        },
        "Tokens rotated successfully."
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Returns current authenticated user profile and permissions.
 * Route: GET /api/v1/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    // req.user pehle hi authenticate middleware ne verify karke attach kar diya hai
    const userResponse = req.user.toObject ? req.user.toObject() : req.user;
    delete userResponse.password;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          user: userResponse,
        },
        "Current authenticated user profile fetched successfully."
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Returns all available permissions, roles, and default role permissions.
 * Route: GET /api/v1/auth/permissions
 * Used by Frontend UI to render permissions checklist and role templates.
 */
const getAllPermissionsAndRoles = async (req, res, next) => {
  try {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          roles: Object.values(ROLES),
          permissions: Object.values(PERMISSIONS),
          roleDefaultPermissions: ROLE_DEFAULT_PERMISSIONS,
        },
        "Permissions metadata fetched successfully for UI tab configuration."
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Returns staff directory (receptionists, housekeepers, admins) with their roles & permissions.
 * Route: GET /api/v1/auth/staff
 */
const getStaffList = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    const filter = {};

    if (role) {
      filter.role = role;
    } else {
      // By default, return all non-guest staff
      filter.role = { $ne: ROLES.GUEST };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const staff = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json(
      new ApiResponse(
        200,
        { count: staff.length, staff },
        "Staff directory fetched successfully."
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Privilege-escalation guard for staff administration.
 * Super-Admin par koi pabandi nahi. Baqi `staff:manage` holders ke liye:
 * 1. `super-admin` role sirf Super-Admin assign kar sakta hai.
 * 2. Koi apna khud ka role / permissions modify nahi kar sakta.
 * 3. Sirf wahi permissions grant ki ja sakti hain jo actor ke apne paas hain.
 *
 * @param {Object} actor - Logged-in user (req.user)
 * @param {Object} params
 * @param {string} params.targetRole - Role jo assign hoga
 * @param {string[]} params.addedPermissions - Nayi grant hone wali permissions
 * @param {string} [params.targetUserId] - Jis user ko modify kiya ja raha hai
 */
const assertCanGrantAccess = (actor, { targetRole, addedPermissions = [], targetUserId = null }) => {
  if (actor.role === ROLES.SUPER_ADMIN) {
    return;
  }

  if (targetRole === ROLES.SUPER_ADMIN) {
    throw new ApiError(403, "Only Super-Admin can assign the super-admin role.");
  }

  if (targetUserId && targetUserId.toString() === actor._id.toString()) {
    throw new ApiError(403, "You cannot modify your own role or permissions.");
  }

  const actorPermissions = Array.isArray(actor.permissions) ? actor.permissions : [];
  const notHeld = addedPermissions.filter((perm) => !actorPermissions.includes(perm));
  if (notHeld.length > 0) {
    throw new ApiError(
      403,
      `You cannot grant permissions you do not hold yourself: ${notHeld.join(", ")}.`
    );
  }
};

/**
 * Allows Super-Admin (or staff with STAFF_MANAGE) to create a new staff account.
 * Route: POST /api/v1/auth/staff
 */
const createStaffUser = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, permissions } = req.body;

    if (!name || !email || !password || !role) {
      throw new ApiError(
        400,
        "Name, email, password, and role are required for staff creation."
      );
    }

    if (!Object.values(ROLES).includes(role)) {
      throw new ApiError(
        400,
        `Invalid role '${role}'. Allowed: ${Object.values(ROLES).join(", ")}`
      );
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(
        409,
        "An account with this email address already exists."
      );
    }

    // Default permissions ya custom permissions assign karein
    let assignedPermissions = [];
    if (permissions && Array.isArray(permissions)) {
      const validPermissions = Object.values(PERMISSIONS);
      for (const perm of permissions) {
        if (!validPermissions.includes(perm)) {
          throw new ApiError(400, `Invalid permission '${perm}'.`);
        }
      }
      assignedPermissions = [...new Set(permissions)];
    } else {
      assignedPermissions = ROLE_DEFAULT_PERMISSIONS[role] || [];
    }

    assertCanGrantAccess(req.user, {
      targetRole: role,
      addedPermissions: role === ROLES.SUPER_ADMIN ? [] : assignedPermissions,
    });

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role,
      permissions: assignedPermissions,
    });

    // Record immutable audit log
    await AuditService.logAction({
      actorId: req.user?._id || user._id,
      action: 'staff:create',
      targetType: 'User',
      targetId: user._id,
      beforeState: null,
      afterState: { role: user.role, permissions: user.permissions, email: user.email },
      ipAddress: AuditService.getClientIp(req),
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(201).json(
      new ApiResponse(
        201,
        { user: userResponse },
        `Staff member (${role}) created successfully.`
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Updates a user's permissions array and/or role dynamically.
 * Route: PATCH /api/v1/auth/users/:id/permissions
 * Super-Admin can dynamically assign custom permissions or reset to default template.
 */
const updateUserPermissions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permissions, role, resetToDefault, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    // Capture beforeState for audit trail with full human attribution
    const beforeState = {
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: [...user.permissions],
      isActive: user.isActive,
    };

    // Security guard: Super-Admin account ko sirf doosra Super-Admin hi modify kar sakta hai
    if (user.role === ROLES.SUPER_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
      throw new ApiError(
        403,
        "Only Super-Admin can modify another Super-Admin account."
      );
    }

    // Role update
    let nextRole = user.role;
    if (role) {
      if (!Object.values(ROLES).includes(role)) {
        throw new ApiError(
          400,
          `Invalid role '${role}'. Allowed: ${Object.values(ROLES).join(", ")}`
        );
      }
      nextRole = role;
    }

    // Permissions update logic (Default template vs Custom permissions list)
    let nextPermissions = [...user.permissions];
    if (resetToDefault) {
      nextPermissions = ROLE_DEFAULT_PERMISSIONS[nextRole] || [];
    } else if (permissions !== undefined) {
      if (!Array.isArray(permissions)) {
        throw new ApiError(
          400,
          "Permissions must be an array of permission strings."
        );
      }
      const validPermissions = Object.values(PERMISSIONS);
      for (const perm of permissions) {
        if (!validPermissions.includes(perm)) {
          throw new ApiError(400, `Invalid permission '${perm}'.`);
        }
      }
      nextPermissions = [...new Set(permissions)]; // deduplicate
    }

    // Privilege-escalation guard: changes ko apply karne se pehle verify karein
    assertCanGrantAccess(req.user, {
      targetRole: nextRole,
      addedPermissions: nextPermissions.filter((perm) => !user.permissions.includes(perm)),
      targetUserId: user._id,
    });

    user.role = nextRole;
    user.permissions = nextPermissions;

    // Active/Inactive toggle
    if (isActive !== undefined) {
      user.isActive = Boolean(isActive);
    }

    await user.save();

    // Capture afterState and write immutable AuditLog record
    const afterState = {
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: [...user.permissions],
      isActive: user.isActive,
    };

    await AuditService.logAction({
      actorId: req.user._id,
      action: 'staff:permission-update',
      targetType: 'User',
      targetId: user._id,
      beforeState,
      afterState,
      ipAddress: AuditService.getClientIp(req),
    });

    const sanitizedUser = user.toObject();
    delete sanitizedUser.password;

    return res.status(200).json(
      new ApiResponse(
        200,
        { user: sanitizedUser },
        "User role and permissions updated successfully."
      )
    );
  } catch (error) {
    next(error);
  }
};

const crypto = require("crypto");
const NotificationService = require("../services/notification.service");

/**
 * Initiates password recovery process.
 * Generates temporary reset token and dispatches notification.
 * POST /api/v1/auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(200).json(
        new ApiResponse(
          200,
          null,
          "If an account exists with this email, a reset token has been issued."
        )
      );
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    NotificationService.notifyPasswordReset({ user, resetToken });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          message: "Password reset token dispatched successfully.",
          ...(config.env === "development" || config.env === "test" ? { resetToken } : {}),
        },
        "Password reset instructions sent."
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Resets user password using valid token.
 * POST /api/v1/auth/reset-password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new ApiError(400, "Reset token is invalid or has expired.");
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        null,
        "Password reset successfully. You can now log in with your new credentials."
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  getMe,
  getAllPermissionsAndRoles,
  getStaffList,
  createStaffUser,
  updateUserPermissions,
  forgotPassword,
  resetPassword,
};

const express = require("express");
const {
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
} = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { requirePermission } = require("../middlewares/permission.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  createStaffSchema,
  updatePermissionsSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validations/auth.validation");
const { PERMISSIONS } = require("../config/constants");

const router = express.Router();

/**
 * =========================================================================
 * AUTHENTICATION ROUTES (/api/v1/auth)
 * =========================================================================
 */

// 1. Public routes: Kisi token ki zaroorat nahi hai
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh-token", validate(refreshTokenSchema), refreshToken);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

// 2. Protected route: Sirf valid logged in user hi apna profile dekh sakta hai
router.get("/me", authenticate, getMe);

// 3. Staff & Permissions Administration (PBAC Protected: staff:manage or Super-Admin bypass)
// Frontend Permissions Tab ke liye metadata (roles, permissions, default templates)
router.get(
  "/permissions",
  authenticate,
  requirePermission(PERMISSIONS.STAFF_MANAGE),
  
  getAllPermissionsAndRoles
);

// Staff directory list
router.get(
  "/staff",
  authenticate,
  requirePermission(PERMISSIONS.STAFF_MANAGE),
  getStaffList
);

// Super-Admin creates a new staff member (receptionist, housekeeping)
router.post(
  "/staff",
  authenticate,
  requirePermission(PERMISSIONS.STAFF_MANAGE),
  validate(createStaffSchema),
  createStaffUser
);

// Super-Admin updates a staff member's permissions or role dynamically
router.patch(
  "/users/:id/permissions",
  authenticate,
  requirePermission(PERMISSIONS.STAFF_MANAGE),
  validate(updatePermissionsSchema),
  updateUserPermissions
);

module.exports = router;


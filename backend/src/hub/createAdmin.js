const User = require("../models/User");
const AuditService = require("../services/audit.service");
const { ROLES } = require("../config/constants");

/**
 * =========================================================================
 * HUB: PEHLA SUPER-ADMIN ACCOUNT
 * =========================================================================
 *
 * Naya Hub khaali database se shuru hota hai (cloud ka data Step 4 sync laata hai).
 * Staff ko login karne ke liye kam az kam ek super-admin chahiye — ye function
 * wahi banata hai. Sirf tab chalta hai jab koi super-admin mojood NA ho, taake
 * installer dobara chalane se chupke se naya admin na ban jaye.
 */

const MIN_PASSWORD_LENGTH = 10;

const validateAdminInput = ({ name, email, password }) => {
  const errors = [];
  if (!name || !name.trim()) errors.push("name is required");
  if (!email || !email.trim()) errors.push("email is required");
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.push("password must contain letters and numbers");
  }
  return errors;
};

/**
 * @param {Object} params
 * @param {string} params.name
 * @param {string} params.email
 * @param {string} params.password
 * @param {boolean} [params.allowAdditional=false] - true ho to super-admin pehle se hone par bhi naya bana dein
 * @returns {Promise<{ created: boolean, reason?: string, user?: Object }>}
 */
const createHubAdmin = async ({ name, email, password, allowAdditional = false }) => {
  const errors = validateAdminInput({ name, email, password });
  if (errors.length > 0) {
    throw new Error(`Invalid admin details: ${errors.join("; ")}`);
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!allowAdditional) {
    const existingAdmin = await User.exists({ role: ROLES.SUPER_ADMIN });
    if (existingAdmin) {
      return { created: false, reason: "A super-admin already exists on this Hub" };
    }
  }

  if (await User.exists({ email: normalizedEmail })) {
    return { created: false, reason: `A user with email ${normalizedEmail} already exists` };
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    role: ROLES.SUPER_ADMIN,
    isActive: true,
  });

  await AuditService.logAction({
    actorId: user._id,
    action: "hub:create-admin",
    targetType: "User",
    targetId: user._id,
    afterState: { name: user.name, email: user.email, role: user.role },
    ipAddress: "hub-installer",
  });

  return {
    created: true,
    user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
  };
};

module.exports = { createHubAdmin, validateAdminInput, MIN_PASSWORD_LENGTH };

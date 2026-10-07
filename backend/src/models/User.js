const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ROLES, ROLE_DEFAULT_PERMISSIONS } = require("../config/constants");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false, // Prevents password from leaking in queries
      minlength: [8, "Password must be at least 8 characters long"],
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.GUEST,
    },
    permissions: {
      type: [String],
      default: [],
    },
    phone: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Guest loyalty reward points accrued on stays (100 points = $10 discount)
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: [0, 'Loyalty points cannot be negative'],
    },
    // Bookmarked rooms in guest's personal wishlist
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
      },
    ],
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

const crypto = require("crypto");

/**
 * Generates a random 32-byte hex reset token, hashes it via SHA-256 for database
 * storage, and sets a 1-hour expiration timestamp.
 * 
 * @returns {string} Plaintext reset token to be sent to user via email
 */
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return resetToken;
};

/**
 * Pre-save middleware:
 * 1. Automatically assigns default role permissions if none provided
 * 2. Hashes password using bcrypt if modified
 */
userSchema.pre("save", async function (next) {
  // Assign default permissions according to role if permissions array is empty
  if (this.isNew && (!this.permissions || this.permissions.length === 0)) {
    this.permissions = ROLE_DEFAULT_PERMISSIONS[this.role] || [];
  }

  // Only hash password if it has been modified or is new
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compares candidate plain text password with stored bcrypt hash.
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.isPasswordMatch = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Checks if user has a specific permission.
 * Super-Admin implicitly bypasses all permission checks.
 * @param {string} permission
 * @returns {boolean}
 */
userSchema.methods.hasPermission = function (permission) {
  if (this.role === ROLES.SUPER_ADMIN) {
    return true; // Super-admin bypass
  }
  return Array.isArray(this.permissions) && this.permissions.includes(permission);
};

const User = mongoose.model("User", userSchema);

module.exports = User;

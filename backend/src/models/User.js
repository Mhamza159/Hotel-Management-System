const mongoose = require("mongoose");
const syncPlugin = require("../sync/syncPlugin");
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
        // Purana regex sirf 2-3 harf ke TLD (.com) aur bina "+" wale address maanta tha,
        // jab ke Joi/frontend .info, .travel, name+tag@ waghera qubool karte hain
        /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/,
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
    // Har token me likha hota hai; barhane se user ke saare purane tokens khatam
    // (password reset, "sab devices se logout")
    tokenVersion: {
      type: Number,
      default: 0,
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
  // Guest kabhi staff nahi: purane guest accounts me "bookings:view" save hai (pehle
  // default tha) jis se wo /admin/bookings jaise staff routes khol sakte the. Guest ke
  // liye sirf guest ki default permissions maani jati hain, saved list nahi.
  if (this.role === ROLES.GUEST) {
    return (ROLE_DEFAULT_PERMISSIONS[ROLES.GUEST] || []).includes(permission);
  }
  return Array.isArray(this.permissions) && this.permissions.includes(permission);
};

// Hub <-> cloud sync: har tabdeeli par syncUpdatedAt/syncOrigin muhar (src/sync/syncPlugin.js)
userSchema.plugin(syncPlugin);

const User = mongoose.model("User", userSchema);

module.exports = User;

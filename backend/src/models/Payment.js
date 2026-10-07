const mongoose = require("mongoose");
const { PAYMENT_STATUS, PAYMENT_PROVIDERS } = require("../config/constants");

/**
 * ============================================================================
 * PAYMENT MODEL SCHEMA (Financial Ledger & Staff Audit Trail)
 * ============================================================================
 *
 * Yeh model hotel ke tamam financial len-den (cash, card, stripe) ka permanent record rakhta hai.
 *
 * Ahem Points:
 * 1. Immutability (Na-badalne wala record):
 *    Financial transaction kabhi delete ya randomly modify nahi honi chahiye.
 * 2. Staff Accountability (Auditing):
 *    Front desk par cash ya card swipe hone par `receivedByStaffId` lazmi save hota hai,
 *    taake hisaab-kitaab me shafafiat (transparency) rahe.
 * 3. Multi-currency Support:
 *    USD, PKR, INR support karta hai (default: USD/PKR).
 */

const paymentSchema = new mongoose.Schema(
  {
    // Kis booking ke aewaz yeh payment ki gayi hai
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Booking ID is required for payment"],
      index: true,
      alias: "booking", // `booking` likhne par bhi `bookingId` map hoga
    },

    // Kis guest/user ne yeh payment ki hai
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required for payment"],
      index: true,
      alias: "user", // `user` likhne par bhi `userId` map hoga
    },

    // Kitni raqam ada ki gayi hai (Kam az kam 0.01 honi chahiye)
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0.01, "Amount must be at least 0.01"],
    },

    // Currency code
    currency: {
      type: String,
      enum: {
        values: ["USD", "PKR", "INR"],
        message: "{VALUE} is not a supported currency",
      },
      default: "USD",
      uppercase: true,
    },

    // Payment ka tareeqa: cash, offline-card (POS machine), ya stripe (online gateway)
    paymentMethod: {
      type: String,
      required: [true, "Payment method is required"],
      enum: {
        values: Object.values(PAYMENT_PROVIDERS),
        message: "{VALUE} is not a valid payment method",
      },
      lowercase: true,
      index: true,
    },

    // Payment ki soorat-e-haal: pending, completed, failed, refunded
    status: {
      type: String,
      enum: {
        values: Object.values(PAYMENT_STATUS),
        message: "{VALUE} is not a valid payment status",
      },
      default: PAYMENT_STATUS.COMPLETED,
      index: true,
    },

    // Front Desk Staff Attribution:
    // Kis receptionist ya staff member ne counter par cash/card physically receive kiya?
    // Cash aur offline-card ke transactions ke liye yeh lazmi track hota hai.
    receivedByStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      alias: "recievedByStaffId", // Common spelling mistake handle karne ke liye alias
    },

    // Receipt number, POS slip reference, ya Stripe payment intent ID
    transactionReference: {
      type: String,
      trim: true,
      default: null,
    },

    // Staff remarks ya specific remarks (e.g., "Received 50% advance at check-in")
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    // createdAt aur updatedAt automatically manage hote hain
    timestamps: true,
    versionKey: false,
  },
);

// ============================================================================
// COMPOUND INDEXES (Reporting & Managerial Query Optimization)
// ============================================================================
// 1. Managerial Cash Drawer Reconciliation Index:
// "Aaj Receptionist X ne kitna cash jama kiya?" -> Fast response ke liye
paymentSchema.index({ receivedByStaffId: 1, paymentMethod: 1, createdAt: -1 });

// 2. Booking Financial Statement Index:
// "Booking ID Y ke tamaam payment records laao"
paymentSchema.index({ bookingId: 1, status: 1 });

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;

/**
 * Global application constants, enums, and PBAC permissions.
 * Frozen objects guarantee immutability.
 */

export const ROLES = Object.freeze({
  GUEST: "user",
  RECEPTIONIST: "receptionist",
  HOUSEKEEPING: "housekeeping",
  SUPER_ADMIN: "super-admin",
});

export const PERMISSIONS = Object.freeze({
  // Room operations
  ROOMS_CREATE: "rooms:create",
  ROOMS_UPDATE: "rooms:update",
  ROOMS_DELETE: "rooms:delete",
  ROOMS_VIEW: "rooms:view",
  ROOMS_PRICE_UPDATE: "rooms:priceUpdate",

  // Booking operations
  BOOKINGS_CREATE: "bookings:create",
  BOOKINGS_VIEW: "bookings:view",
  BOOKINGS_CONFIRM: "bookings:confirm",
  BOOKINGS_CANCEL: "bookings:cancel",

  // Front desk & housekeeping
  CHECKIN_MANAGE: "checkin:manage",
  CHECKOUT_MANAGE: "checkout:manage",
  HOUSEKEEPING_UPDATE: "housekeeping:update",

  // Payments
  PAYMENTS_RECORD_CASH: "payments:recordCash",
  PAYMENTS_RECORD_CARD: "payments:recordCard",
  PAYMENTS_REFUND: "payments:refund",

  // Administrative & Analytics
  STAFF_MANAGE: "staff:manage",
  ANALYTICS_VIEW: "analytics:view",
  AUDIT_VIEW: "audit:view",
  COUPONS_MANAGE: "coupons:manage",
  WAITLIST_MANAGE: "waitlist:manage",
});

export const BOOKING_STATUS = Object.freeze({
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CHECKED_IN: "checked-in",
  CHECKED_OUT: "checked-out",
  CANCELLATION_REQUESTED: "cancellation-requested",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
});

export const PAYMENT_STATUS = Object.freeze({
  PENDING: "pending",
  PARTIALLY_PAID: "partially-paid",
  COMPLETED: "completed",
  FAILED: "failed",
  REFUNDED: "refunded",
});

export const PAYMENT_PROVIDERS = Object.freeze({
  CASH: "cash",
  OFFLINE_CARD: "offline-card",
  STRIPE: "stripe",
});

export const REFUND_TIERS = Object.freeze({
  FULL: { minHours: 48, percentage: 100, label: "Full Refund (100%)" },
  HALF: { minHours: 24, percentage: 50, label: "Partial Refund (50%)" },
  NONE: { minHours: 0, percentage: 0, label: "Non-refundable (0%)" },
});

export const ROOM_TYPES = Object.freeze({
  SINGLE: "single",
  DOUBLE: "double",
  DELUXE: "deluxe",
  SUITE: "suite",
  PRESIDENTIAL: "presidential",
});

export const HOUSEKEEPING_STATUS = Object.freeze({
  CLEAN: "clean",
  DIRTY: "dirty",
  CLEANING: "cleaning",
  MAINTENANCE: "maintenance",
});

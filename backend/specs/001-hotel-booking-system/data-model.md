# Data Model Specification: Hotel Booking and Management System

**Branch**: `001-hotel-booking-system` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)

---

## 1. Overview & Schemas

The data layer is built on MongoDB using Mongoose schemas with compound indexes, strong validation hooks, and optimistic concurrency versioning (`__v`).

```
┌──────────────┐         ┌───────────────┐
│     User     │◄───┐     │     Room      │
└──────────────┘    │     └───────────────┘
  ▲        ▲        │             ▲
  │        │        │             │
  │        │     ┌──┴─────────────┴─┐
  │        └─────│     Booking      │
  │              └──────────────────┘
  │                 ▲            ▲
  │                 │            │
┌─┴────────────┐ ┌──┴──────────┐ │
│   Review     │ │   Payment   │ │
└──────────────┘ └─────────────┘ │
                                 │
┌──────────────┐                 │
│   Waitlist   │─────────────────┘
└──────────────┘
```

---

## 2. Entity Definitions

### 2.1 User
Represents guests, receptionists, housekeeping staff, and super-administrators.
- **`name`**: `String`, required, trimmed.
- **`email`**: `String`, required, unique, lowercase, trimmed, indexed.
- **`passwordHash`**: `String`, required (excluded from default queries).
- **`role`**: `String`, enum: `['user', 'receptionist', 'housekeeping', 'super-admin']`, default: `'user'`, indexed.
- **`permissions`**: `[String]`, default: `[]`.
  - Valid strings: `rooms:create`, `rooms:edit`, `rooms:delete`, `pricing:manage`, `coupons:manage`, `bookings:view`, `bookings:confirm`, `bookings:cancel`, `bookings:refund`, `checkin:manage`, `housekeeping:update`, `payments:recordCash`, `payments:recordCard`, `payments:refund`, `waitlist:manage`, `analytics:view`, `audit:view`, `staff:manage`, `chatbot:write`.
- **`isActive`**: `Boolean`, default: `true`, indexed.
- **`loyaltyPoints`**: `Number`, default: `0`, min: `0`.
- **`isVerified`**: `Boolean`, default: `false`.
- **`verificationToken`**: `String`, optional.
- **`passwordResetToken`**: `String`, optional.
- **`passwordResetExpires`**: `Date`, optional.
- **`refreshTokenHash`**: `String`, optional.
- **`createdAt`**, **`updatedAt`**: Timestamps.

### 2.2 Room
Represents physical, individual hotel rooms.
- **`roomNumber`**: `String`, required, unique, indexed (e.g. `"101"`, `"204A"`).
- **`type`**: `String`, enum: `['single', 'double', 'deluxe', 'suite']`, required, indexed.
- **`description`**: `String`, required.
- **`images`**: Array of `{ url: String, publicId: String }`.
- **`capacity`**: `Number`, required, min: `1`.
- **`pricePerNight`**: `Number`, required, min: `0` (base rate in USD or local currency).
- **`amenities`**: `[String]`, default: `[]` (e.g. `['WiFi', 'AC', 'Ocean View', 'Balcony']`).
- **`housekeepingStatus`**: `String`, enum: `['clean', 'dirty', 'maintenance']`, default: `'clean'`, indexed.
- **`isActive`**: `Boolean`, default: `true`, indexed.
- **`isDeleted`**: `Boolean`, default: `false`, indexed (soft-delete).
- **`version`**: Concurrency version tracking (`__v`).

### 2.3 Booking
Represents an atomic reservation contract for one or more physical rooms over a specific date span.
- **`bookingReference`**: `String`, required, unique, indexed (e.g. `"BK-984210"`).
- **`userId`**: `ObjectId`, ref: `'User'`, required, indexed.
- **`rooms`**: Array of:
  - `roomId`: `ObjectId`, ref: `'Room'`, required.
  - `pricePerNight`: `Number`, required (locked authoritative rate at booking time).
- **`checkInDate`**: `Date`, required, indexed.
- **`checkOutDate`**: `Date`, required, indexed.
- **`numberOfGuests`**: `Number`, required, min: `1`.
- **`specialRequests`**: `String`, default: `""`.
- **`totalPrice`**: `Number`, required, min: `0` (server-computed).
- **`couponApplied`**: `ObjectId`, ref: `'Coupon'`, optional.
- **`discountAmount`**: `Number`, default: `0`.
- **`loyaltyPointsUsed`**: `Number`, default: `0`.
- **`status`**: `String`, enum: `['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled', 'completed']`, default: `'pending'`, indexed.
- **`paymentStatus`**: `String`, enum: `['unpaid', 'partially-paid', 'paid', 'refunded']`, default: `'unpaid'`, indexed.
- **`checkedInAt`**: `Date`, optional.
- **`checkedOutAt`**: `Date`, optional.
- **`cancellation`**:
  - `cancelledAt`: `Date`.
  - `cancelledBy`: `ObjectId`, ref: `'User'`.
  - `reason`: `String`.
  - `appliedTier`: `String`, enum: `['100%', '50%', '0%', 'no-show']`.
  - `refundAmount`: `Number`, default: `0` (server-calculated).
- **`expiresAt`**: `Date`, optional (TTL candidate for unpaid pending bookings: 15 minutes from creation).
- **`idempotencyKey`**: `String`, unique, sparse, indexed.

### 2.4 Payment
Represents an individual financial transaction (online or front desk in-person).
- **`bookingId`**: `ObjectId`, ref: `'Booking'`, required, indexed.
- **`amount`**: `Number`, required, min: `0`.
- **`currency`**: `String`, default: `'USD'`.
- **`provider`**: `String`, enum: `['stripe', 'razorpay', 'cash', 'offline-card']`, required, indexed.
- **`status`**: `String`, enum: `['pending', 'succeeded', 'failed', 'refunded']`, default: `'pending'`, indexed.
- **`transactionId`**: `String`, optional (Stripe payment_intent_id or external gateway ID).
- **`receivedByStaffId`**: `ObjectId`, ref: `'User'`, required if `provider` in `['cash', 'offline-card']` (accountability link).
- **`notes`**: `String`, default: `""` (e.g. physical drawer receipt reference).
- **`idempotencyKey`**: `String`, unique, sparse, indexed.
- **`createdAt`**: `Date`, default: `Date.now`.

### 2.5 Review
Represents guest feedback restricted exclusively to verified stays.
- **`userId`**: `ObjectId`, ref: `'User'`, required, indexed.
- **`bookingId`**: `ObjectId`, ref: `'Booking'`, required, unique, indexed (1 review per completed booking).
- **`roomType`**: `String`, required, indexed.
- **`rating`**: `Number`, required, min: `1`, max: `5`.
- **`comment`**: `String`, required, maxLength: `1000`.
- **`createdAt`**: `Date`, default: `Date.now`.

### 2.6 Waitlist
Represents waitlist alerts for fully booked dates.
- **`userId`**: `ObjectId`, ref: `'User'`, required, indexed.
- **`roomType`**: `String`, required, indexed.
- **`checkInDate`**: `Date`, required.
- **`checkOutDate`**: `Date`, required.
- **`notified`**: `Boolean`, default: `false`, indexed.
- **`createdAt`**: `Date`, default: `Date.now`.

### 2.7 Coupon
Represents promotional codes with date bounds and usage limits.
- **`code`**: `String`, required, unique, uppercase, indexed.
- **`discountType`**: `String`, enum: `['percentage', 'fixed']`, required.
- **`discountValue`**: `Number`, required, min: `1`.
- **`validFrom`**: `Date`, required.
- **`validUntil`**: `Date`, required.
- **`maxUses`**: `Number`, default: `100`.
- **`usedCount`**: `Number`, default: `0`.
- **`isActive`**: `Boolean`, default: `true`, indexed.

### 2.8 AuditLog
Represents an immutable, append-only record of all administrative, staff, and financial actions.
- **`actorId`**: `ObjectId`, ref: `'User'`, required, indexed.
- **`action`**: `String`, required, indexed (e.g. `'staff:permission-grant'`, `'payment:record-cash'`, `'room:soft-delete'`).
- **`targetType`**: `String`, required, indexed (e.g. `'User'`, `'Booking'`, `'Payment'`, `'Room'`).
- **`targetId`**: `ObjectId`, required, indexed.
- **`beforeState`**: `Object`, default: `null`.
- **`afterState`**: `Object`, default: `null`.
- **`ipAddress`**: `String`, optional.
- **`createdAt`**: `Date`, default: `Date.now`, immutable: `true`, indexed.

### 2.9 ChatSession
Represents an AI assistant conversation history and tool execution log.
- **`userId`**: `ObjectId`, ref: `'User'`, required, indexed.
- **`role`**: `String`, required.
- **`messages`**: Array of `{ role: String, content: String, toolCalls: Array, toolResults: Array, timestamp: Date }`.
- **`createdAt`**, **`updatedAt`**: Timestamps.

---

## 3. State Machines & Transitions

### 3.1 Booking Lifecycle
```
[Creation]
    │
    ▼
[pending] ────────(15m timeout)───────► [cancelled]
    │
 (Payment Succeeded OR Desk Reservation Confirmed)
    │
    ▼
[confirmed] ──────(Cancellation: 48h / 24-48h / <24h)──► [cancelled]
    │
 (Guest Arrives & Checked In)
    │
    ▼
[checked-in]
    │
 (Guest Departs & Checked Out)
    │
    ▼
[checked-out] ───► [completed] (Eligible for Review & Loyalty Points)
```

### 3.2 Housekeeping Lifecycle
```
[clean] ──(Guest Checked In & Out)──► [dirty]
   ▲                                     │
   │                                     ▼
   └──────────(Staff Marks Clean)── [maintenance] (if damage/repair needed)
```

---

## 4. Compound Indexes for High-Performance Queries

1. **Active Overlap Index (Double-Booking Guard)**:
   ```javascript
   BookingSchema.index({
     'rooms.roomId': 1,
     status: 1,
     checkInDate: 1,
     checkOutDate: 1
   });
   ```
2. **Availability Range Filter**:
   ```javascript
   RoomSchema.index({
     type: 1,
     isActive: 1,
     isDeleted: 1,
     housekeepingStatus: 1
   });
   ```
3. **Audit Log Querying**:
   ```javascript
   AuditLogSchema.index({ actorId: 1, createdAt: -1 });
   AuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
   ```
4. **Idempotency Expiration Index**:
   ```javascript
   // Automatically purges expired idempotency records after 24 hours
   IdempotencySchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });
   ```

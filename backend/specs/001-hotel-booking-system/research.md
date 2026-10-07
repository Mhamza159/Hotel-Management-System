# Research & Technical Decisions: Hotel Booking and Management System

**Branch**: `001-hotel-booking-system` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)

---

## 1. Dynamic Permission-Based Access Control (PBAC)

### Context & Problem
Traditional role-based access control (RBAC) hardcodes checks such as `if (req.user.role === 'receptionist')`. This creates brittle controllers and makes it impossible to grant or revoke specific operational permissions (e.g. allowing one senior receptionist to cancel bookings or view analytics) without redefining the entire role hierarchy.

### Decision
Implement a decoupled Dynamic Permission-Based Access Control (PBAC) middleware:
1. The `User` model stores a `role` enum (`'user'`, `'receptionist'`, `'housekeeping'`, `'super-admin'`) and a `permissions: [String]` array.
2. The authorization middleware `requirePermission(...neededPermissions)` checks:
   - If `req.user.role === 'super-admin'`, immediately call `next()` (implicit global bypass).
   - If `req.user.isActive === false`, reject immediately with `401 Unauthorized` / `403 Forbidden`.
   - If every required permission exists in `req.user.permissions`, call `next()`.
   - Otherwise, reject with `403 Forbidden` including the missing permission identifier.
3. When creating staff accounts, standard baseline templates are populated into `permissions`:
   - `receptionist`: `['bookings:view', 'bookings:confirm', 'checkin:manage', 'housekeeping:update', 'payments:recordCash', 'payments:recordCard', 'waitlist:manage']`
   - `housekeeping`: `['housekeeping:update']`
4. Every mutation to a staff member's permissions via `PATCH /api/admin/staff/:id/permissions` appends an immutable record to the `AuditLog`.

### Rationale
- Complies with Principle II of the Constitution.
- Allows fine-grained access governance (e.g. desk staff can record cash payments without permission to cancel reservations or alter pricing).
- `super-admin` bypass ensures administrative recovery without bloating stored permission lists.

### Alternatives Considered
- *Hardcoded role checks (`req.user.role === 'admin'`)**: Rejected because it violates Constitution Principle II and cannot support flexible hotel staffing workflows.
- *ACL matrix in external Redis*: Rejected for excessive operational complexity in this phase; MongoDB document-level arrays provide millisecond evaluation directly from authenticated user context.

---

## 2. Atomic Concurrency & Double-Booking Prevention

### Context & Problem
When two guests concurrently attempt to book the same physical room for overlapping dates (`[checkIn, checkOut]`), a naive check-then-write pattern queries room availability first and saves the booking second. Under high concurrency, both requests observe the room as vacant and write reservations, causing catastrophic double-booking.

### Decision
Implement **MongoDB Multi-Document ACID Transactions** combined with an **Atomic Date-Overlap Reservation Query**:
1. Run booking creation inside a MongoDB session transaction:
   ```javascript
   const session = await mongoose.startSession();
   session.startTransaction();
   try {
     // 1. Query for ANY active conflicting booking for target room(s)
     const conflict = await Booking.findOne({
       'rooms.roomId': { $in: targetRoomIds },
       status: { $in: ['pending', 'confirmed', 'checked-in'] },
       checkInDate: { $lt: requestedCheckOut },
       checkOutDate: { $gt: requestedCheckIn }
     }).session(session);

     if (conflict) {
       throw new AppError('One or more selected rooms are no longer available for these dates', 409);
     }

     // 2. Insert new booking with status 'pending' or 'confirmed'
     const booking = await Booking.create([bookingData], { session });

     await session.commitTransaction();
     return booking[0];
   } catch (err) {
     await session.abortTransaction();
     throw err;
   } finally {
     session.endSession();
   }
   ```
2. **Optimistic Locking Fallback**: For standalone MongoDB deployments where replica-set transactions are unavailable in development, use document-level atomic conditional updates:
   - Store an array of reserved date spans directly on the physical `Room` document with an optimistic concurrency version key (`__v`), or atomically update `Room` with `$push` conditional on `$not: { reservedRanges: { $elemMatch: { checkIn: { $lt: requestedCheckOut }, checkOut: { $gt: requestedCheckIn } } } }`.

### Rationale
- Complies with Principle III of the Constitution.
- Guarantees isolation and atomicity across multi-room checkout sessions.
- Eliminates race conditions with zero possibility of partial reservations.

### Alternatives Considered
- *Distributed Redis Locks (`Redlock`)*: Rejected as redundant when MongoDB multi-document transactions natively provide serializable/snapshot isolation without maintaining a second distributed lock manager.
- *Naive `find()` then `save()` without session*: Rejected; violates Constitution Principle III.

---

## 3. Server-Side Authoritative Financial & Refund Calculations

### Context & Problem
Client applications must never be trusted to submit refund amounts, base rates, or calculated totals. Malicious clients could manipulate HTTP payloads to grant themselves 100% refunds on non-refundable cancellations or purchase luxury suites at discounted rates.

### Decision
1. **Authoritative Price Computation**:
   - Room rates per night are fetched directly from the database `Room` record at transaction time.
   - Total calculation: `nights * basePrice + seasonalSurcharges - couponDiscount - loyaltyRedemption`.
   - Client-provided amounts in request bodies are ignored or rejected by schema validation.
2. **Authoritative Cancellation Tier Calculation**:
   - Compute `hoursUntilCheckIn = (booking.checkInDate.getTime() - Date.now()) / (1000 * 60 * 60)`.
   - **Tier 1 (>= 48 hours)**: 100% refund.
   - **Tier 2 (24 to 48 hours)**: 50% refund.
   - **Tier 3 (< 24 hours)**: 0% refund.
   - **No-show**: Handled by end-of-day cron, marked completed with `checkedIn: false` and 0% refund.
3. **Payment Reversal Dispatch**:
   - For online payments (`stripe`), invoke `stripe.refunds.create({ payment_intent: payment.intentId, amount: computedRefundInCents })`.
   - For front-desk payments (`cash`, `offline-card`), record an audit-stamped `Payment` record with status `refunded` and a ledger note for physical cash drawer reconciliation.

### Rationale
- Complies with Principle I of the Constitution.
- Enforces strict deterministic financial audits and prevents revenue leakage.

---

## 4. Idempotency Key Handling & Auto-Release Lifecycle

### Context & Problem
Double-clicking "Pay Now" or network retries on flaky mobile connections can submit duplicate booking requests. Furthermore, unpaid `pending` reservations lock room inventory indefinitely if guests abandon their browser tabs.

### Decision
1. **Idempotency Key Pattern**:
   - Require `Idempotency-Key` header on `POST /api/bookings` and `POST /api/payments/create-intent`.
   - Store key hashes in an `Idempotency` collection with a 24-hour TTL index.
   - If an existing key in state `completed` is matched, return the cached HTTP response immediately.
   - If an existing key in state `processing` is matched, return `409 Conflict: Request is currently being processed`.
2. **Cron-Based Expiration of Unpaid Reservations**:
   - Use `node-cron` running every 60 seconds:
   - Query: `Booking.find({ status: 'pending', paymentStatus: 'unpaid', createdAt: { $lt: new Date(Date.now() - 15 * 60 * 1000) } })`.
   - Atomically mark them `cancelled`, set `cancellationReason: 'Payment timeout (15m expired)'`, and release room inventory.
   - Dispatch waitlist notifications for the newly liberated date intervals.

### Rationale
- Protects guests from accidental multiple charges.
- Prevents inventory denial-of-service from uncompleted checkouts.

---

## 5. Role-Gated AI Chatbot Architecture

### Context & Problem
Exposing an LLM directly to database modifications or unconstrained function calling introduces prompt injection vulnerabilities and unintended state modifications.

### Decision
1. **Role-Scoped Tool Registry**:
   - **Guest Tools** (`role: user`): `checkAvailability`, `getRoomDetails`, `getMyBookings`. Strictly read-only queries scoped to `req.user.id`.
   - **Staff Tools** (`role: receptionist`): `getBookingStatus`, `getBookingsForDateRange`, `getOccupancyStats`. Read-only operational views.
   - **Admin Tools** (`role: super-admin`): Read tools plus `prepareBookingCancellation`.
2. **Two-Step Confirmation Gate for Mutations**:
   - The AI MUST NOT execute a cancellation or state-changing action autonomously.
   - When an admin prompts: "Cancel booking #1234", the AI generates a confirmation payload: `{ action: 'cancelBooking', bookingId: '1234', requiresConfirmation: true }`.
   - The user interface or caller must explicitly submit a confirmed approval token back to the backend before the controller executes the mutation.

### Rationale
- Enforces defense-in-depth and eliminates unauthorized or hallucinated data mutations.

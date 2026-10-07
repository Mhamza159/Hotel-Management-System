# Feature Specification: Hotel Booking and Management System

**Feature Branch**: `001-hotel-booking-system`

**Created**: 2026-09-18

**Status**: Draft

**Input**: User description: "Full Hotel Booking & Management System specification (Node.js, Express, MongoDB/Mongoose, JWT auth, permission-based access control, atomic double-booking prevention, server-side refund calculations, and staff operations)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Core Guest Booking & Atomic Reservation Lifecycle (Priority: P1)

Guests can browse available rooms for specific date ranges, configure multi-room selections, and complete an atomic reservation with idempotency guarantees, paying online or opting to pay upon arrival at the front desk.

**Why this priority**: This forms the foundational commercial engine of the hotel. Without the ability to search availability and reserve rooms with absolute race-condition safety, no other hotel operations can function.

**Independent Test**: A guest searches for dates, selects one or more available rooms, and submits a booking with a unique idempotency key. Two simultaneous requests attempting to reserve the same physical room for overlapping dates must result in exactly one confirmed booking and one clean rejection, with zero double-booking.

**Acceptance Scenarios**:

1. **Given** one or more rooms are clean and vacant for a selected date range, **When** a guest submits a booking request with a valid idempotency key, **Then** the system atomically locks and reserves the rooms, generates a booking reference in `pending` or `confirmed` status, and decrements available inventory for those dates.
2. **Given** two concurrent booking requests target the same room for overlapping dates, **When** both requests arrive simultaneously, **Then** exactly one transaction succeeds and the other is safely rejected with a conflict error without creating orphan records.
3. **Given** a guest selects online checkout, **When** payment completes successfully via the payment gateway webhook, **Then** the booking status transitions to `confirmed` and a confirmation notification and invoice receipt are issued.
4. **Given** a guest selects "Pay at Desk", **When** the reservation is submitted, **Then** the booking is saved as `confirmed` with a pending payment status to be reconciled upon arrival.

---

### User Story 2 - Front Desk Operations & Permission-Gated Actions (Priority: P2)

Receptionists and front desk staff perform daily guest servicing—such as checking guests in and out, updating room housekeeping statuses, and recording in-person cash or offline card payments—strictly governed by their assigned granular permissions.

**Why this priority**: Front desk staff manage physical guest arrival and in-person payment intake. Dynamic permissions enforce least privilege while preserving operational fluidity.

**Independent Test**: Log in with a staff account possessing `checkin:manage` and `payments:recordCash`. Successfully record an in-person cash payment against a booking and execute check-in. Verify that an attempt by the same account to execute an unauthorized action (e.g. `bookings:cancel` or accessing financial analytics) is immediately forbidden.

**Acceptance Scenarios**:

1. **Given** an arriving guest with a confirmed booking, **When** a receptionist with `checkin:manage` clicks "Check In", **Then** the booking status updates to `checked-in` and the assigned room is marked as occupied.
2. **Given** a guest paying cash or physical card at the counter, **When** a staff member with `payments:recordCash` or `payments:recordCard` submits payment intake, **Then** an immutable payment record is created referencing the staff member's ID and the booking balance is adjusted.
3. **Given** a receptionist account lacking `bookings:cancel`, **When** the receptionist attempts to cancel a reservation or trigger a refund, **Then** the system denies the request with an HTTP 403 Forbidden.
4. **Given** a super-admin user, **When** the super-admin performs any staff or desk action, **Then** the system permits the action implicitly regardless of individual permission strings.

---

### User Story 3 - Tiered Cancellations & Authoritative Server-Side Refunds (Priority: P3)

Guests and authorized staff can cancel bookings subject to an automated, server-calculated refund policy based on the time remaining before the scheduled check-in.

**Why this priority**: Clear, automated cancellation protects hotel revenue while providing fair policies to guests. Centralizing refund calculation on the server eliminates fraud and manual arithmetic errors.

**Independent Test**: Create bookings with check-in dates set to 50 hours, 30 hours, and 10 hours in the future. Cancel each booking and verify that the server authoritatively awards exactly 100%, 50%, and 0% refunds respectively, ignoring any client-supplied figures.

**Acceptance Scenarios**:

1. **Given** a confirmed booking with check-in > 48 hours away, **When** the guest initiates cancellation, **Then** the server calculates a 100% refund, issues the gateway refund for online payments, marks the booking `cancelled`, and frees the rooms immediately.
2. **Given** a confirmed booking with check-in between 24 and 48 hours away, **When** cancellation is initiated, **Then** the server calculates exactly 50% of the booking total as refundable, records the policy tier applied, and processes the partial refund.
3. **Given** a confirmed booking with check-in < 24 hours away, **When** cancellation is requested, **Then** the server cancels the reservation with 0% refund and releases the room.
4. **Given** a guest fails to check in before check-in cutoff, **When** automated end-of-day processing runs, **Then** the booking is marked `completed` with `checkedIn: false`, no refund is granted, and the room is released.

---

### User Story 4 - Room Lifecycle, Housekeeping & Media Administration (Priority: P4)

Super-admins manage the catalog of physical rooms, pricing structures, and media assets, while housekeeping staff update cleanliness readiness across the property.

**Why this priority**: Accurate room definitions, capacity ratings, and real-time room readiness directly govern what can be sold and occupied.

**Independent Test**: Create a room, upload and delete photos, set room rate and capacity, mark it dirty upon checkout, and transition it back to clean via a housekeeping account.

**Acceptance Scenarios**:

1. **Given** a super-admin, **When** a new physical room with room number, type, capacity, rate, and amenities is created, **Then** the room becomes visible for availability matching.
2. **Given** a departing guest is checked out, **When** check-out completes, **Then** the room status automatically transitions to `dirty`.
3. **Given** a housekeeping staff member with `housekeeping:update`, **When** the room has been sanitized and marked `clean`, **Then** the room is instantly eligible for next guest check-in.
4. **Given** an image deletion request by super-admin, **When** an image is removed, **Then** both the database reference and the remote cloud storage asset are deleted.

---

### User Story 5 - Guest Loyalty, Reviews, Wishlists & Waitlist Auto-Alerts (Priority: P5)

Guests earn loyalty points on completed stays, can bookmark favorites, leave verified reviews, and join waitlists for sold-out dates that notify them as soon as a room becomes vacant.

**Why this priority**: Enhances guest retention, social proof, and recovers revenue from cancelled slots.

**Independent Test**: Complete a stay, verify loyalty point accrual, submit a review. Attempt to submit a review without a completed stay and confirm rejection. Join a waitlist for booked dates, cancel the existing booking, and verify waitlist notification dispatch.

**Acceptance Scenarios**:

1. **Given** a guest who has completed a stay, **When** the guest submits a rating and review, **Then** the review is published and reflected in the room type's average rating.
2. **Given** a user who has never completed a stay in that room type, **When** attempting to submit a review, **Then** the system rejects the submission.
3. **Given** fully booked dates for a room type, **When** a guest joins the waitlist, **Then** the waitlist entry is stored with guest contact details.
4. **Given** an existing booking is cancelled for waitlisted dates, **When** the room returns to inventory, **Then** the system immediately sends notifications to waitlisted guests.

---

### User Story 6 - Audit Logging, Managerial Analytics & Secure AI Assistance (Priority: P6)

Managers monitor revenue, occupancy, and repeat guest metrics, while security tracks an immutable audit log of all administrative actions. Users and staff interact with an intelligent chat assistant constrained by role permissions.

**Why this priority**: Operational intelligence guides pricing and staffing decisions; audit logging ensures compliance and fraud prevention; AI assistance streamlines customer support and internal queries.

**Independent Test**: Query analytics endpoints with and without `analytics:view` permission. Change a staff member's permissions and verify the change appears in the audit log. Invoke the AI assistant as a guest and as an admin to verify tool boundaries and confirmation requirements.

**Acceptance Scenarios**:

1. **Given** a user with `analytics:view` or `super-admin`, **When** querying occupancy and revenue across a date range, **Then** aggregate metrics (total revenue, RevPAR, ADR, occupancy %) are returned.
2. **Given** any staff permission update, room deletion, or cash payment recording, **When** the action completes, **Then** an immutable `AuditLog` entry is appended recording the actor, action, target, timestamp, and before/after states.
3. **Given** a guest interacting with the AI chat assistant, **When** asking for room availability or personal booking status, **Then** the assistant invokes read-only tools and returns accurate data.
4. **Given** an administrator asking the AI assistant to perform a write action (such as cancelling a booking), **When** the request is submitted, **Then** the AI assistant produces an explicit confirmation step before any change is executed.

---

### Edge Cases

- **Double-Click & Network Retries**: Multiple requests sent with the exact same idempotency key must return the cached initial response rather than executing a duplicate booking or double-charge.
- **Unpaid Pending Abandonment**: Bookings created in `pending` status that receive neither payment confirmation nor front desk check-in confirmation within a 15-minute window must be automatically released by background maintenance.
- **Clock Drift & Last-Minute Cancellation**: Cancellation requests arriving at exactly the 48-hour or 24-hour boundary must evaluate against the server's canonical UTC timestamp.
- **Overlapping Multi-Room Conflicts**: In a multi-room booking request where 2 of 3 rooms are available but 1 is unavailable, the entire transaction must roll back atomically; partial bookings are never created.
- **Staff Deactivation Mid-Session**: If a staff member is deactivated by a super-admin, their subsequent API requests must be rejected upon token inspection regardless of token expiration timestamp.
- **Cash Refund Discrepancy**: Cash/offline card cancellations generate a system credit/refund ledger record with staff reconciliation notes, preventing automated payment gateway calls.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST authenticate users via signed JWT tokens (access + refresh tokens) supporting secure logout and token invalidation.
- **FR-002**: System MUST enforce authorization dynamically by inspecting the user's `permissions` array; static role names MUST NOT be hardcoded in access control branches.
- **FR-003**: System MUST allow `super-admin` accounts to bypass all permission checks across all modules.
- **FR-004**: System MUST allow `super-admin` to dynamically grant or revoke individual permissions from staff accounts, logging each modification to an immutable audit log.
- **FR-005**: System MUST maintain physical room records with unique room numbers, room types, capacities, night rates, housekeeping readiness (`clean`, `dirty`, `maintenance`), and soft-deletion flags.
- **FR-006**: System MUST query room availability over arbitrary check-in and check-out date intervals, excluding rooms with active overlapping reservations or maintenance status.
- **FR-007**: System MUST support multi-room reservations within a single atomic checkout session.
- **FR-008**: System MUST prevent double-booking using atomic transactions or document-level optimistic concurrency locking; check-then-write logic without concurrency control is strictly forbidden.
- **FR-009**: System MUST require and validate client idempotency keys on booking and payment creation endpoints.
- **FR-010**: System MUST calculate all pricing, seasonal surcharges, coupon discounts, and loyalty deductions strictly server-side.
- **FR-011**: System MUST calculate refund amounts authoritatively server-side using the 48h (100%), 24-48h (50%), and <24h (0%) policy tiers, rejecting any client-supplied refund values.
- **FR-012**: System MUST support both online payment gateway processing (cards/digital payments with webhook confirmation) and front-desk in-person payments (cash or offline card).
- **FR-013**: System MUST record the identity of the front desk staff member on every in-person cash or card transaction.
- **FR-014**: System MUST automatically release pending unpaid reservations after a configured expiration timeout (15 minutes).
- **FR-015**: System MUST generate a downloadable and printable PDF invoice/receipt upon successful payment.
- **FR-016**: System MUST restrict room review submissions exclusively to guests who have completed a stay in that room type.
- **FR-017**: System MUST maintain a waitlist for dates with zero room vacancy and trigger notifications to waitlisted guests when a matching cancellation occurs.
- **FR-018**: System MUST record an immutable audit log for all administrative modifications, staff permission changes, room rate adjustments, and manual payment entries.
- **FR-019**: System MUST provide aggregated analytics (revenue, occupancy percentage, cancellation rate, repeat guest frequency) restricted to users with `analytics:view` or `super-admin`.
- **FR-020**: System MUST expose an AI assistant with role-gated tool boundaries, requiring explicit human confirmation before executing any state-altering action.

### Key Entities *(include if feature involves data)*

- **User**: Represents guests, receptionists, housekeeping, and administrators. Key attributes: name, email, credentials, role, `permissions` array, active status, loyalty points balance, email verification status.
- **Room**: Represents individual physical accommodation units. Key attributes: room number, room type (single, double, deluxe, suite), capacity, base price per night, amenities list, housekeeping status (`clean`, `dirty`, `maintenance`), images (URL + cloud public ID), active flag, soft-deleted flag.
- **Booking**: Represents a reservation contract. Key attributes: guest reference, room items (room reference + locked price per night), check-in date, check-out date, number of guests, special requests, total computed price, applied discount/coupon, booking status (`pending`, `confirmed`, `checked-in`, `checked-out`, `cancelled`, `completed`), payment status, cancellation details (reason, applied refund tier, computed refund amount).
- **Payment**: Represents a financial transaction. Key attributes: booking reference, transaction amount, provider (`stripe`, `razorpay`, `cash`, `offline-card`), payment method, transaction status (`pending`, `completed`, `failed`, `refunded`), gateway transaction/intent ID, idempotency key, staff receiver reference (for cash/offline card).
- **Review**: Represents guest feedback. Key attributes: guest reference, room reference, rating (1-5), comments, verified stay confirmation reference.
- **Waitlist**: Represents an alert request for unavailable dates. Key attributes: guest reference, room type, desired check-in and check-out dates, notification status.
- **Coupon**: Represents a promotional discount. Key attributes: promotional code, discount type (percentage or fixed amount), discount value, expiry date, maximum uses, active flag.
- **AuditLog**: Represents an immutable event log. Key attributes: actor reference, action performed, target entity type and ID, state delta (before and after state snapshots), IP address, timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of concurrent reservation attempts for the same physical room on overlapping dates result in zero double-bookings (exact 1-to-1 match of room-night capacity).
- **SC-002**: 100% of refund calculations adhere strictly to the published time-tier policy without variance or reliance on client parameters.
- **SC-003**: Guests can search room availability and complete a multi-room booking in under 3 minutes.
- **SC-004**: In-person desk payment and check-in processing can be executed by front desk staff in under 30 seconds per guest.
- **SC-005**: 100% of staff permission adjustments and sensitive administrative operations produce a traceable, queryable audit log record.
- **SC-006**: Automated background cleanup releases 100% of expired pending reservations within 60 seconds of timeout expiration.
- **SC-007**: PDF receipt and booking confirmation dispatch is triggered within 5 seconds of successful payment completion.
- **SC-008**: System withstands repeated network retry requests with identical idempotency keys with 0% duplicate charges or duplicate bookings.

## Assumptions

- Single hotel property management: Multi-property or multi-tenant operations are out of scope for the initial deployment.
- Individual room units are tracked by unique physical room numbers rather than abstract room-type inventory counts.
- Timezone handling: All booking date ranges, cancellation cutoffs, and audit timestamps are stored and evaluated in standard UTC with local conversion applied at presentation.
- Payment gateway test mode (Stripe) is utilized for simulated online transactions; cash and offline card transactions represent verified physical counter exchanges.
- Cloud media storage (Cloudinary) provides image asset hosting with persistent public identifiers for complete remote asset deletion.
- Background scheduled tasks (node-cron) operate with access to the central database to monitor pending reservation expirations.

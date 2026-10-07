# Tasks: Hotel Booking and Management System

**Feature**: `001-hotel-booking-system`  
**Input**: Feature specification from `specs/001-hotel-booking-system/spec.md` and technical design from `specs/001-hotel-booking-system/plan.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, and baseline configuration.

- [x] T001 Initialize Node.js project with `package.json` and dependencies (express, mongoose, jsonwebtoken, bcryptjs, dotenv, cors, helmet, morgan, winston, joi, stripe, pdfkit, node-cron) in `package.json`
- [x] T002 [P] Configure environment validation module in `src/config/env.js`
- [x] T003 [P] Configure Winston logger and Morgan request logging stream in `src/utils/logger.js`
- [x] T004 [P] Create standardized API error envelope and response helper classes in `src/utils/apiError.js` and `src/utils/apiResponse.js`
- [x] T005 [P] Setup test infrastructure with Jest, Supertest, and MongoMemoryServer in `tests/fixtures/db-helper.js` and `jest.config.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database connections, global error handling, authentication, and dynamic permission evaluation.

> **CRITICAL**: No user story work can begin until this foundational phase is complete.

- [x] T006 Establish Mongoose connection with replica set session transaction support in `src/config/db.js`
- [x] T007 Define global constants (roles, valid permission strings, booking statuses, refund tiers) in `src/config/constants.js`
- [x] T008 Implement centralized Express error-handling middleware in `src/middlewares/error.middleware.js`
- [x] T009 [P] Create Mongoose User model with `permissions` array, role enum, and active flag in `src/models/User.js`
- [x] T010 [P] Implement JWT verification and authenticated user context attachment in `src/middlewares/auth.middleware.js`
- [x] T011 [P] Implement Dynamic Permission-Based Access Control (PBAC) middleware with implicit `super-admin` bypass in `src/middlewares/permission.middleware.js`
- [x] T012 [P] Create Idempotency-Key validation and caching middleware with TTL index in `src/middlewares/idempotency.middleware.js`
- [x] T013 Implement Auth routes and controllers (register, login, refresh-token, password-reset) in `src/controllers/auth.controller.js` and `src/routes/auth.routes.js`
- [x] T014 Assemble baseline Express application and route mounting in `src/app.js` and `src/server.js`

**Checkpoint**: Foundation ready—JWT authentication and dynamic PBAC authorization verified.

---

## Phase 3: User Story 1 - Core Guest Booking & Atomic Reservation Lifecycle (Priority: P1) 🎯 MVP

**Goal**: Enable guests to search date availability and atomically reserve one or more rooms with idempotency and double-booking prevention.

**Independent Test**: Execute concurrent overlapping booking requests targeting the exact same room ID and verify that exactly 1 request confirms with `201 Created` while the other is rejected with `409 Conflict`.

### Tests for User Story 1
- [x] T015 [P] [US1] Write automated concurrency integration test proving double-booking prevention under simultaneous requests in `tests/integration/booking-concurrency.test.js`
- [x] T016 [P] [US1] Write idempotency integration test verifying duplicate prevention on retried headers in `tests/integration/idempotency.test.js`

### Implementation for User Story 1
- [x] T017 [P] [US1] Create Room model with compound availability indexes and soft-delete flags in `src/models/Room.js`
- [x] T018 [P] [US1] Create Booking model with multi-room items, date range indexes, and status enum in `src/models/Booking.js`
- [x] T019 [US1] Implement room availability search service with date-overlap exclusion in `src/services/room.service.js`
- [x] T020 [US1] Implement atomic booking reservation service with MongoDB multi-document transaction and conflict checks in `src/services/booking.service.js`
- [x] T021 [US1] Implement booking creation controller and availability search endpoints in `src/controllers/booking.controller.js` and `src/routes/booking.routes.js`
- [x] T022 [US1] Implement guest booking history endpoint `GET /api/bookings/my` in `src/controllers/booking.controller.js`

**Checkpoint**: User Story 1 complete (MVP ready: atomic double-booking-safe reservations fully functional).

---

## Phase 4: User Story 2 - Front Desk Operations & Permission-Gated Actions (Priority: P2)

**Goal**: Front desk receptionists perform check-in, check-out, and record in-person cash/card payments with staff ID attribution under dynamic PBAC.

**Independent Test**: Log in as a receptionist with `payments:recordCash` and record a desk cash payment; confirm that attempting an action without permission (e.g. `bookings:cancel`) returns `403 Forbidden`.

### Tests for User Story 2
- [x] T023 [P] [US2] Write unit tests for PBAC middleware and `super-admin` bypass in `tests/unit/permission.test.js`
- [x] T024 [P] [US2] Write integration test for desk payment recording and staff attribution in `tests/integration/desk.test.js`

### Implementation for User Story 2
- [x] T025 [P] [US2] Create Payment model with provider enum (`stripe`, `cash`, `offline-card`) and staff attribution reference in `src/models/Payment.js`
- [x] T026 [US2] Implement desk payment intake service attributing `receivedByStaffId` in `src/services/desk.service.js`
- [x] T027 [US2] Implement check-in and check-out transition controllers in `src/controllers/desk.controller.js`
- [x] T028 [US2] Mount front desk routes (`/api/v1/desk/bookings/:id/check-in`, `/api/v1/desk/bookings/:id/check-out`, `/api/v1/desk/bookings/:id/payments`) in `src/routes/desk.routes.js`
- [x] T029 [US2] Implement receptionist bookings overview endpoint `GET /api/v1/desk/bookings` gated by `bookings:view` in `src/controllers/desk.controller.js`

**Checkpoint**: Front desk operations and permission enforcement independently functional.

---

## Phase 5: User Story 3 - Tiered Cancellations & Authoritative Refunds (Priority: P3)

**Goal**: Process guest cancellations with server-computed refund tiers (100%, 50%, 0%) and auto-release unpaid pending bookings after 15 minutes.

> **Crucial Business Rules (User Mandate)**:
> 1. **Advance Payment Condition**: Refund applies ONLY if the guest made an advance payment (`totalPaid > 0`). If unpaid (e.g. `pay_at_desk` with $0 paid), booking simply cancels with `refundAmount: 0` without triggering payment gateway/cash refunds.
> 2. **Pre-Check-In Restriction**: Cancellation with refund is strictly allowed ONLY BEFORE check-in. Once a guest is checked-in, cancellation with refund is completely blocked.

**Independent Test**: Trigger cancellations for bookings 50 hours, 30 hours, and 10 hours prior to check-in; verify that server computes exactly 100%, 50%, and 0% refunds respectively.

### Tests for User Story 3
- [x] T030 [P] [US3] Write unit tests validating authoritative refund tier calculation rules in `tests/unit/refund.test.js`
- [x] T031 [P] [US3] Write test for automated 15-minute unpaid booking release cron in `tests/unit/cron.test.js`

### Implementation for User Story 3
- [x] T032 [US3] Implement server-side authoritative refund calculation service in `src/services/refund.service.js`
- [ ] T033 [US3] Implement Stripe refund dispatch and offline cash ledger recording in `src/services/payment.service.js`
- [x] T034 [US3] Implement two-step booking cancellation workflow (Guest cancel-request, Desk review & policy inspection, Desk approval/rejection with notification & inventory unlock) in `src/controllers/booking.controller.js`, `src/controllers/desk.controller.js`, `src/services/cancellation.service.js`, and `tests/integration/cancellation-workflow.test.js`
- [x] T035 [US3] Implement scheduled cron jobs (15-minute unpaid auto-release and no-show processing) using `node-cron` in `src/services/cron.service.js`
- [x] T036 [US3] Implement PDF invoice generation service using `pdfkit` in `src/services/invoice.service.js` and route `GET /api/bookings/:id/invoice`

**Checkpoint**: Cancellation tiers, automated refunds, and inventory auto-release independently verified.

---

## Phase 6: User Story 4 - Room Lifecycle, Housekeeping & Media Administration (Priority: P4)

**Goal**: Enable super-admins to manage room definitions and media assets, while housekeeping updates cleanliness statuses.

**Independent Test**: Upload room photos with Cloudinary, verify public ID persistence, delete a photo, and transition room housekeeping state from `dirty` to `clean`.

### Implementation for User Story 4
- [ ] T037 [P] [US4] Configure Multer and Cloudinary storage pipeline in `src/config/cloudinary.js`
- [ ] T038 [US4] Implement room CRUD controller (create, edit, soft-delete) restricted to `rooms:*` permissions in `src/controllers/room.controller.js`
- [ ] T039 [US4] Implement image upload and remote Cloudinary deletion endpoints in `src/controllers/room.controller.js` and `src/routes/room.routes.js`
- [ ] T040 [US4] Implement housekeeping status toggle endpoint `PATCH /api/rooms/:id/housekeeping` gated by `housekeeping:update` in `src/controllers/room.controller.js`

**Checkpoint**: Room administration and housekeeping workflows complete.

---

## Phase 7: User Story 5 - Guest Loyalty, Reviews, Wishlists & Waitlists (Priority: P5)

**Goal**: Allow guests to earn/redeem loyalty points, save wishlists, post reviews restricted to completed stays, and join availability waitlists.

**Independent Test**: Attempt to post a review on a room without a completed stay (verify rejection); join a waitlist and verify notification dispatch when an overlapping booking cancels.

### Implementation for User Story 7
- [ ] T041 [P] [US5] Create Review, Waitlist, and Coupon Mongoose models in `src/models/Review.js`, `src/models/Waitlist.js`, and `src/models/Coupon.js`
- [ ] T042 [US5] Implement verified stay review submission controller with rating aggregation in `src/controllers/review.controller.js` and `src/routes/review.routes.js`
- [ ] T043 [US5] Implement coupon validation service and loyalty point deduction logic in `src/services/pricing.service.js`
- [ ] T044 [US5] Implement waitlist entry endpoint and cancellation trigger dispatcher in `src/services/waitlist.service.js` and `src/controllers/waitlist.controller.js`
- [ ] T045 [US5] Implement wishlist bookmarking endpoints `POST /api/wishlist/:roomId` and `GET /api/wishlist` in `src/controllers/wishlist.controller.js`

**Checkpoint**: Guest engagement, verified reviews, and loyalty workflows operational.

---

## Phase 8: User Story 6 - Audit Logging, Managerial Analytics & Secure AI Assistance (Priority: P6)

**Goal**: Record immutable administrative audit logs, aggregate business analytics, and provide role-gated AI assistant tools with mandatory confirmation gates.

**Independent Test**: Change a staff member's permissions and verify the change appears in `GET /api/admin/audit-log`; prompt the AI assistant to cancel a booking and verify that a two-step confirmation challenge is returned.

### Implementation for User Story 8
- [ ] T046 [P] [US6] Create AuditLog and ChatSession Mongoose models in `src/models/AuditLog.js` and `src/models/ChatSession.js`
- [ ] T047 [US6] Implement staff account lifecycle and permission management endpoints (`POST /api/admin/staff`, `PATCH /api/admin/staff/:id/permissions`) with automatic audit log appending in `src/controllers/admin.controller.js`
- [ ] T048 [US6] Implement MongoDB aggregation pipelines for revenue, ADR, RevPAR, and occupancy analytics in `src/controllers/analytics.controller.js` and `src/routes/analytics.routes.js`
- [ ] T049 [US6] Implement role-gated AI assistant service with read-only tools and confirmation token challenge protocol in `src/services/ai.service.js`
- [ ] T050 [US6] Implement AI chat endpoints (`POST /api/chat/user`, `POST /api/chat/staff`, `POST /api/chat/admin`) in `src/controllers/chat.controller.js` and `src/routes/chat.routes.js`

**Checkpoint**: Managerial audit logging, analytics aggregation, and secure AI assistance complete.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Production hardening, documentation, and end-to-end quickstart validation.

- [ ] T051 [P] Implement input validation schemas using Joi for all endpoints in `src/middlewares/validate.middleware.js`
- [ ] T052 [P] Implement rate limiting and security headers via Helmet and express-rate-limit in `src/app.js`
- [ ] T053 [P] Configure Swagger / OpenAPI documentation in `src/config/swagger.js`
- [ ] T054 Create database seeding script for default super-admin, sample rooms, and initial coupons in `src/scripts/seed.js`
- [ ] T055 Execute end-to-end verification scenarios per `quickstart.md` and verify all tests pass

---

## Dependencies & Execution Order

```
Phase 1: Setup
     │
     ▼
Phase 2: Foundational (Auth & PBAC)
     │
     ▼
Phase 3: User Story 1 (Core Booking & Concurrency) [MVP]
     │
     ├──► Phase 4: User Story 2 (Front Desk & Desk Payments)
     │         │
     │         ▼
     ├──► Phase 5: User Story 3 (Tiered Refunds & Auto-Release)
     │         │
     │         ▼
     ├──► Phase 6: User Story 4 (Room Catalog & Housekeeping)
     │         │
     │         ▼
     ├──► Phase 7: User Story 5 (Loyalty, Reviews & Waitlist)
     │         │
     │         ▼
     └──► Phase 8: User Story 6 (Audit, Analytics & AI Chat)
               │
               ▼
Phase 9: Polish & Production Hardening
```

### Parallel Execution Opportunities
- **Setup (Phase 1)**: T002, T003, T004, T005 can be executed simultaneously.
- **Foundational (Phase 2)**: Models and middlewares (T009, T010, T011, T012) can be developed concurrently.
- **User Story 1 (Phase 3)**: Tests (T015, T016) and models (T017, T018) can run in parallel before service layer integration.
- **Post-MVP Stories**: Once Phase 3 is completed, User Story 2 and User Story 4 can proceed in parallel.

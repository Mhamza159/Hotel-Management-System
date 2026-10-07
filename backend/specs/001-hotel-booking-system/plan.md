# Implementation Plan: Hotel Booking and Management System

**Branch**: `001-hotel-booking-system` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-hotel-booking-system/spec.md`

## Summary

Build a production-grade Hotel Booking and Management System using Node.js, Express.js, and MongoDB/Mongoose. The architecture enforces dynamic permission-based access control (PBAC) with `super-admin` bypass, strict MongoDB transaction-based double-booking prevention, authoritative server-side pricing and refund calculations, in-person desk checkout attribution, and role-governed AI assistant tooling with confirmation gates.

## Technical Context

**Language/Version**: Node.js (v20+ LTS), JavaScript (ESNext / CommonJS or ES Modules)  
**Primary Dependencies**: Express.js, Mongoose (v8+), jsonwebtoken, bcryptjs, stripe (test mode), multer, multer-storage-cloudinary, pdfkit, node-cron, winston, morgan, joi / express-validator  
**Storage**: MongoDB (MongoDB Atlas or local replica set for multi-document ACID transactions)  
**Testing**: Jest, Supertest, mongodb-memory-server  
**Target Platform**: Linux / Windows / macOS server container, cloud hosted (Render / Railway / Atlas)  
**Project Type**: RESTful Web Service & API Backend with modular domain layers  
**Performance Goals**: Sub-100ms availability queries, sub-250ms booking transactions, 100% isolation on concurrent overlapping reservations  
**Constraints**: Zero client-side refund or rate trust; server-side authoritative computations; multi-document transaction rollbacks; strict idempotency key checks; no hardcoded role names in permission authorization  
**Scale/Scope**: Single hotel property, 50-500 physical rooms, multi-room checkouts, 13-phase modular architecture  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Gate / Principle | Status | Verification Detail |
| :--- | :--- | :--- |
| **I. Server-Side Financial Authority** | **PASSED** | All prices, seasonal rules, coupons, and cancellation refund percentages (48h: 100%, 24-48h: 50%, <24h: 0%) are authoritatively computed server-side. Client-supplied amounts in request payloads are rejected. |
| **II. Dynamic Permission-Based Access Control** | **PASSED** | Middleware `requirePermission` inspects `user.permissions` array. Static role name branches are prohibited. `super-admin` implicitly bypasses all permission checks. Every permission mutation writes to `AuditLog`. |
| **III. Atomic Concurrency & Double-Booking Prevention** | **PASSED** | Booking operations execute inside MongoDB multi-document ACID sessions with conflict detection or document-level optimistic version locking. Check-then-write anti-patterns are strictly eliminated. |
| **IV. Stateless JWT Authentication & Secure Boundaries** | **PASSED** | Stateless JWT tokens with access/refresh rotation. All credentials stored exclusively in `.env`. Error middleware sanitizes stack traces. |
| **V. Test-Driven Verification & Data Integrity** | **PASSED** | Automated Jest + Supertest suites enforce validation of concurrency safety, financial calculations, and permission gates prior to release. |

## Project Structure

### Documentation (this feature)

```text
specs/001-hotel-booking-system/
├── plan.md              # This implementation plan
├── research.md          # Phase 0: Architectural decisions & trade-offs
├── data-model.md        # Phase 1: Mongoose schemas & state machine models
├── quickstart.md        # Phase 1: Verification runbook & end-to-end guide
├── contracts/           # Phase 1: REST API contracts & endpoint specifications
│   ├── auth.contract.md
│   ├── rooms.contract.md
│   ├── bookings.contract.md
│   ├── payments.contract.md
│   ├── admin.contract.md
│   └── chat.contract.md
└── checklists/
    └── requirements.md  # Spec quality validation checklist
```

### Source Code (repository root)

```text
src/
├── app.js                   # Express application setup & middleware chain
├── server.js                # Server entry point & DB connection lifecycle
├── config/
│   ├── db.js                # Mongoose connection & replica set session utilities
│   ├── env.js               # Validated environment variables (dotenv)
│   └── constants.js         # Permission enum, refund tiers, booking statuses
├── middlewares/
│   ├── auth.middleware.js   # JWT verification & req.user attachment
│   ├── permission.middleware.js # Dynamic permissions array evaluation & super-admin bypass
│   ├── idempotency.middleware.js# Idempotency-Key validation & caching
│   ├── validate.middleware.js   # Joi / schema validation runner
│   └── error.middleware.js      # Centralized error handler & status codes
├── models/
│   ├── User.js              # User schema with permissions array & loyalty points
│   ├── Room.js              # Physical room schema, housekeeping, pricing & soft-delete
│   ├── Booking.js           # Reservation schema with multi-room array & date indexes
│   ├── Payment.js           # Online & desk payments with staff attribution
│   ├── Review.js            # Verified stay reviews
│   ├── Waitlist.js          # Availability notification queue
│   ├── Coupon.js            # Discount codes & validation rules
│   ├── AuditLog.js          # Immutable event log for administrative actions
│   └── ChatSession.js       # LLM chat sessions & tool execution history
├── controllers/
│   ├── auth.controller.js
│   ├── room.controller.js
│   ├── booking.controller.js
│   ├── payment.controller.js
│   ├── review.controller.js
│   ├── waitlist.controller.js
│   ├── admin.controller.js
│   ├── analytics.controller.js
│   └── chat.controller.js
├── routes/
│   ├── auth.routes.js
│   ├── room.routes.js
│   ├── booking.routes.js
│   ├── payment.routes.js
│   ├── review.routes.js
│   ├── waitlist.routes.js
│   ├── admin.routes.js
│   └── chat.routes.js
├── services/
│   ├── booking.service.js   # ACID transaction booking & double-booking prevention
│   ├── refund.service.js    # Authoritative server-side refund tier evaluation
│   ├── payment.service.js   # Stripe intent & desk cash/card handling
│   ├── invoice.service.js   # PDF generation (pdfkit)
│   ├── notification.service.js # Email & in-app alerts
│   ├── cron.service.js      # 15m pending reservation auto-release & no-show processing
│   └── ai.service.js        # Tool-calling agent with role gating & confirmation steps
└── utils/
    ├── apiError.js          # Custom operational error class
    ├── apiResponse.js       # Standardized response envelopes
    └── logger.js            # Winston & Morgan structured logging
tests/
├── unit/
│   ├── refund.test.js       # Unit tests for 48h/24h refund tier calculations
│   └── permission.test.js   # Dynamic permissions & super-admin bypass tests
├── integration/
│   ├── auth.test.js         # JWT registration, login, refresh
│   ├── booking-concurrency.test.js # Race condition & double-booking prevention tests
│   ├── desk-payment.test.js # In-person cash recording & staff attribution
│   └── idempotency.test.js  # Network retry & duplicate request tests
└── fixtures/
    └── db-helper.js         # MongoMemoryServer lifecycle for test runner
```

**Structure Decision**: Selected a modular RESTful service architecture (`src/` with clear separation of models, controllers, routes, middlewares, and business logic services). High-risk operations (concurrency-safe booking, refund calculation, invoice generation) are isolated in dedicated services for testability.

## Complexity Tracking

> **Zero violations recorded. All designs strictly comply with Constitution Principles I through V.**

| Architectural Area | Justification & Safeguard | Alternative Rejected Because |
| :--- | :--- | :--- |
| MongoDB Multi-Document Transactions | Mandatory for race-condition-free multi-room booking reservations across distributed web requests. | Naive check-then-write suffers severe race conditions under concurrent checkouts. |
| In-memory / DB Idempotency Cache | Required to guarantee safe retries for payment intents and reservations on unreliable client connections. | Client duplicate submissions cause duplicate charges and phantom bookings. |
| Dynamic Permissions Array | Allows super-admin to manage staff privileges without modifying code or redeploying. | Static role names violate Constitution Principle II and lack operational flexibility. |

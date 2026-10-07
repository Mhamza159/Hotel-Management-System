# Testing Strategy & Test Suites — Hotel Management System

**Generated:** 2026-09-29  
**Scope:** Automated testing harness, coverage breakdown, concurrency tests, and E2E verification.

---

## 1. Test Harness & Frameworks

| Role | Tool | Configuration / Notes |
| :--- | :--- | :--- |
| **Test Runner** | Jest `^30.5.2` | Configured with `--runInBand --detectOpenHandles --forceExit` in `backend/package.json` |
| **HTTP Assertion** | Supertest `^7.2.2` | Tests live Express request pipelines against in-memory DB |
| **In-Memory Database** | `mongodb-memory-server ^11.2.0` | Spins up isolated MongoDB daemon during test runs |
| **E2E Browser Testing** | Playwright MCP | Cross-browser real-world flow verification (documented in `PLAYWRIGHT_TEST_RESULTS.md`) |

---

## 2. Test Suite Breakdown

### Unit Tests (`backend/tests/unit/` — 10 Files)
- **`setup.test.js`:** Confirms database teardown hooks and environment variable guards.
- **`auth-middleware.test.js`:** Verifies missing token, invalid signature, and expired JWT rejection (HTTP 401).
- **`permission-middleware.test.js`:** Tests PBAC authorization matrix and `SUPER_ADMIN` universal pass-through.
- **`error-middleware.test.js`:** Tests error sanitization and removal of stack traces in production mode.
- **`room-availability.test.js`:** Validates date range intersection algorithms and buffer-day policies.
- **`room-model.test.js` & `booking-model.test.js` & `user-model.test.js`:** Verifies Mongoose schema validation rules, default enum values, and pre-save hooks.
- **`refund.test.js`:** Validates Stripe refund calculation percentages based on lead time.
- **`cron.test.js`:** Verifies automated cleanup of stale holds without live database leakage.

### Integration Tests (`backend/tests/integration/` — 11 Files)
- **`auth.test.js`:** End-to-end guest and staff registration, login, token refresh, and password recovery.
- **`booking.test.js`:** Complete booking lifecycle: room selection, price computation, payment capture, and reference issuance.
- **`booking-concurrency.test.js`:** Spawns concurrent HTTP requests targeting the same room to verify that ACID snapshot isolation completely prevents double bookings.
- **`desk.test.js`:** Front-desk reception workflows: guest arrival lookup, room unit assignment, keycard generation, and counter payment settlements.
- **`cancellation-workflow.test.js`:** Tests full guest cancellation journey, automatic status update to `cancelled`, and partial refund ledger recording.
- **`idempotency.test.js`:** Replays identical booking requests with the same `X-Idempotency-Key` to verify single-charge guarantee.
- **`invoice.test.js`:** Tests PDF invoice streaming endpoint (`GET /api/bookings/:id/invoice`) for binary valid PDF headers.
- **`engagement.test.js`:** Tests waitlist subscriptions for sold-out room tiers, promo code applications, and loyalty points.
- **`analytics-audit-chat.test.js`:** Tests managerial KPI aggregation, immutable audit log recording, and AI concierge conversation history.
- **`room-admin.test.js`:** Tests admin room creation, image upload mocking, price adjustments, and maintenance status overrides.
- **`polish-security.test.js`:** Tests HTTP rate limiting, XSS header injection, and unauthorized role escalations.

---

## 3. Running Test Suites

```bash
# Run all backend unit and integration tests
npm test

# Run tests in watch mode during backend development
cd backend && npx jest --watch

# Run a specific integration test file
cd backend && npx jest tests/integration/booking-concurrency.test.js
```

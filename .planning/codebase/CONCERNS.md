# Codebase Concerns, Risks & Technical Debt — Hotel Management System

**Generated:** 2026-09-29  
**Scope:** Technical debt, operational risks, scalability bottlenecks, and planned remediation paths.

---

## 1. Identified Technical Debt & Bottlenecks

### 1. MongoDB Replica Set Requirement for Transactions
- **Location:** `backend/src/services/booking.service.js` (Multi-document ACID transactions via `session.startTransaction()`)
- **Risk:** MongoDB native transactions require an active Replica Set. While production clusters on MongoDB Atlas and test suites using `mongodb-memory-server` have replica sets enabled by default, local development instances running standalone `mongod` will fail when initiating a session.
- **Remediation:** Document local replica set configuration (`mongod --replSet rs0`) in developer setup guidelines or implement an automated fallback check in `db.js`.

### 2. Stateless JWT Token Revocation
- **Location:** `backend/src/middlewares/auth.middleware.js`
- **Risk:** Access tokens are signed JWTs without a distributed cache lookup (such as Redis). If an employee account is compromised or permissions are demoted mid-shift, their token remains valid until expiry (default 24h).
- **Remediation:** Introduce a fast Redis token blacklist or maintain a `tokenVersion` / `lastPasswordResetAt` timestamp check in `User.js` during auth middleware verification.

### 3. Stripe Webhook Body Parsing Invariant
- **Location:** `backend/src/app.js` and `backend/src/routes/booking.routes.js`
- **Risk:** Stripe webhook signature verification (`stripe.webhooks.constructEvent`) requires the raw unparsed HTTP request buffer. If `express.json()` middleware runs globally ahead of the webhook route, signature verification will fail with HTTP 400.
- **Remediation:** Ensure `/api/payments/webhook` route uses `express.raw({ type: 'application/json' })` mounted ahead of global body-parser middlewares.

### 4. Client-Side Large Inventory Pagination
- **Location:** `frontend/src/pages/desk/ArrivalsPage.jsx` and `RoomCatalogPage.jsx`
- **Risk:** Current inventory queries fetch all matching rooms and perform light in-memory filtering. While optimal for boutique hotels with under 200 rooms, properties scaling beyond 1,000 keys may experience rendering latency.
- **Remediation:** Introduce server-side keyset or cursor pagination (`page`, `limit`, `sort`) in `room.service.js` and bind directly to Material UI Data Grid server-mode props.

---

## 2. Security & Operational Hardening Checklist

- [x] Passwords hashed with `bcryptjs` (cost factor 10).
- [x] Fine-grained PBAC middleware prevents horizontal privilege escalation between front desk, housekeeping, and management.
- [x] Input sanitization and Joi validation on all mutating REST endpoints.
- [x] Idempotency keys prevent duplicate card charges on network retries.
- [ ] Implement Redis-backed token revocation ledger for immediate session termination.
- [ ] Set up automated CI/CD pipeline running Jest test suites and Playwright E2E suites on every pull request.

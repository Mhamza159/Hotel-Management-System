# CLAUDE.md — Grand Horizon Hotel Management System

Full analysis (modules, every endpoint, data model, known bugs): see `PROJECT_OVERVIEW.md` (local only, git-ignored).

## What this is

Single-hotel reservation + operations app. Two independent npm packages, no workspace tooling:

- `backend/` — Express 5 + Mongoose 8 REST API (CommonJS). Entry `src/server.js` (local; starts cron) or `api/index.js` (Vercel serverless; **no cron**).
- `frontend/` — React 18 + Vite SPA (ESM), MUI 5 + Tailwind + Zustand + axios. Entry `src/main.jsx` → `src/App.jsx` (all routes).

Personas: guest (`user`), `receptionist`, `housekeeping`, `super-admin`.

## Commands

```bash
# backend (needs backend/.env with MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET ≥16 chars)
cd backend && npm install
npm run dev        # nodemon src/server.js on :5000, Swagger at /api-docs
npm test           # jest --runInBand, in-memory MongoDB (~2 min). Baseline: 163/165 pass (2 known stale tests: auth register perms, room description)
npx jest tests/integration/desk.test.js   # single file
npm run seed       # destructive for seed users/rooms/coupons

# frontend (VITE_API_BASE_URL defaults to /api/v1; Vite proxies /api -> :5000)
cd frontend && npm install
npm run dev        # :5173
npm run build
```

Run backend scripts/tests with `backend/` as the working directory (env and the mongodb-memory-server binary cache resolve from cwd). No linter, formatter, TypeScript, or frontend tests exist.

## Backend architecture

`app.js` → helmet → CORS → json(16kb) → morgan → swagger → `generalLimiter` → routes → `notFoundHandler` → `errorHandler`.

Request path: **route → `authenticate` → `requirePermission`/`requireAnyPermission` → `validate(joiSchema)` → [idempotency] → controller (thin) → service (rules) → model.**

| Domain | Route file (mount) | Service(s) |
| --- | --- | --- |
| Auth/staff/PBAC admin | `auth.routes.js` (`/api/v1/auth`) | in controller, `audit`, `notification` |
| Rooms/housekeeping/media | `room.routes.js` (`/rooms`) | `room.service`, `config/cloudinary` |
| Bookings/invoice | `booking.routes.js` (`/bookings`) | `booking`, `cancellation`, `invoice` |
| Front desk/walk-in | `desk.routes.js` (`/desk`) | `desk`, `cancellation`, `loyalty`, `audit` |
| Reviews/loyalty/waitlist/wishlist | `engagement.routes.js` (4 routers) | `review`, `loyalty`, `waitlist`, `wishlist` |
| Admin bookings/audit/analytics | `admin.routes.js` + `analytics.routes.js` (`/admin`) | `audit`, `analytics` |
| "AI" assistant (rule-based, no LLM) | `chat.routes.js` (`/chat`) | `ai.service` |
| Expiry watchdog | — | `cron.service` (every minute, server.js only) |

Key models (`src/models`): User, Room (`reservedRanges` = per-room date lock), Booking, Payment (refunds are separate rows with `status:'refunded'`), AuditLog (update/delete blocked), Review, Waitlist, Coupon, IdempotencyKey (TTL 24h), ChatSession.

Single source of truth for roles, permissions, statuses: `backend/src/config/constants.js` (mirrored by hand in `frontend/src/config/constants.js` — keep both in sync).

## Frontend architecture

- `services/api.js`: axios instance; attaches Bearer token; adds `Idempotency-Key` on `POST /bookings`; **returns `response.data.data` (unwrapped)**; on 401 refreshes once then redirects to `/login`; **rejects with `{ statusCode, message, errors }` — there is no `err.response`**.
- One service file per backend domain in `services/`. Data fetching is `useEffect` + `useState` (React Query is provided but unused).
- Auth state: `stores/useAuthStore.js` (localStorage `grand_horizon_auth`). Guards: `ProtectedRoute` (`requiredPermission(s)` or `allowedRoles`), `<Can>`, `can(user, perm)`; super-admin bypasses.
- Two staff shells: `StaffLayout` (`/desk`, `/admin/*`, dark/light) and `HousekeepingLayout` (`/housekeeping/*`, warm theme) with partly duplicated dialogs/pages.

## Conventions

- Backend responses: `ApiResponse.success(res, code, data, msg)` / `ApiResponse.created(...)`; errors: `throw ApiError.badRequest|forbidden|notFound|conflict(...)` and `next(error)` in controllers (`try/catch` in every handler).
- Controllers are static-method classes (except `auth.controller.js`, which exports functions); services are static-method classes.
- Joi schemas live in `src/validations/<domain>.validation.js` as `{ params, query, body }`. Body rejects unknown keys. `req.query` cannot be reassigned in Express 5, so Joi defaults/coercion on query params do not apply — parse in the service.
- Express 5 leaves `req.body` **undefined** on bodyless requests; use `req.body || {}` when a route has no body schema.
- Audit sensitive mutations with `AuditService.logAction({ actorId, action, targetType, targetId, beforeState, afterState, ipAddress })`.
- Comments are long and bilingual (Roman Urdu + English); match surrounding style when editing.
- Money is USD numbers on documents; prices are always recomputed server-side from `Room.pricePerNight`.

## Gotchas (see PROJECT_OVERVIEW.md §12 for the full list)

- Pay-at-desk methods (`pay_at_desk`, `cash`, `card`, `offline-card`) create `confirmed` bookings; online methods (`stripe`, `online`, `pay_now_stripe`) are `pending` with a 5-minute `expiresAt` and get auto-cancelled by the cron (no online payment exists yet).
- `bookings:create` is a guest permission (online booking). Walk-ins (`POST /desk/walk-in`) are gated by `checkin:manage`, plus `payments:recordCash/Card` when money is collected.
- Staff admin: only a super-admin can assign `super-admin`; non-super-admins cannot edit themselves or grant permissions they don't hold (`assertCanGrantAccess` in `auth.controller.js`).
- Regression tests for fixed bugs: `backend/tests/integration/critical-fixes.test.js`, `backend/tests/integration/walk-in-room-lock.test.js`.
- Room-overlap checks are duplicated in several services with different status sets; `createBooking` is the only atomic path (`reservedRanges` + `$not/$elemMatch`).
- Walk-ins take the same atomic `reservedRanges` lock as `createBooking` (fields `checkIn`/`checkOut`/`bookingReference`); never push ranges with other field names or `room.save()` will fail validation.
- `engagementService.getWishlist()` / `getWaitlists()` resolve to plain arrays (the API returns bare arrays).
- Transactions only run when MongoDB is a replica set; tests use a standalone in-memory server (non-transactional path).
- Some checks are hard-coded by role on top of PBAC (booking view/invoice, cancellation approve/reject, chat staff/admin, review delete).
- Several tests use fixed late-2026 dates and will fail once those dates are in the past.
- `.planning/`, `.specify/`, `backend/specs/`, `.agents/` are AI planning/tooling docs, not runtime code.

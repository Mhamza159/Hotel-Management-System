# Roadmap: Hotel Booking and Management System

## Overview

Build and deliver a production-grade Hotel Booking and Management System consisting of:
1. **Backend API (Milestone 1 - Complete ✅)**: Node.js, Express, MongoDB with multi-document ACID transactions, dynamic PBAC, authoritative tiered refunds, and AI concierge.
2. **Frontend SPA (Milestone 2 - Active 🚀)**: Single Page Application in `client/` using React 18 + Vite, featuring dual visual registers (hospitality luxury Tailwind CSS for guest portal and custom-themed Material UI v5 for staff/admin consoles), integrated with TanStack Query v5, Zustand, Framer Motion, and Axios with silent 401 token refresh rotation.

---

## Milestone 1: Backend System (Complete ✅)

- [x] **Phase 1: Setup (Shared Infrastructure)** - Initialize Express server, environment validation, structured logger, and Jest test runner
- [x] **Phase 2: Foundational (Auth & PBAC)** - MongoDB transaction session support, User model, JWT auth, dynamic PBAC middleware, and idempotency cache
- [x] **Phase 3: User Story 1 - Core Guest Booking & Atomic Reservation Lifecycle (MVP)** - Room and Booking models, availability search, and multi-document ACID atomic reservation
- [x] **Phase 4: User Story 2 - Front Desk Operations & Permission-Gated Actions** - Check-in, check-out, and desk cash/card payment intake with staff attribution
- [x] **Phase 5: User Story 3 - Tiered Cancellations & Authoritative Refunds** - Server-side refund tier calculations, Stripe gateway refund dispatch, 15m unpaid release cron, and PDFKit invoices
- [x] **Phase 6: User Story 4 - Room Lifecycle, Housekeeping & Media Administration** - Room catalog CRUD, housekeeping cleanliness workflow, and Cloudinary media management
- [x] **Phase 7: User Story 5 - Guest Loyalty, Reviews, Wishlists & Waitlists** - Verified stay reviews, loyalty points accrual/redemption, and cancellation waitlist alerts
- [x] **Phase 8: User Story 6 - Audit Logging, Managerial Analytics & Secure AI Assistance** - Immutable audit logs, managerial occupancy/revenue aggregations, and role-gated AI assistant
- [x] **Phase 9: Polish & Cross-Cutting Concerns** - Joi schema validation, rate limiting, security headers, database seeders, and end-to-end verification

---

## Milestone 2: Frontend Client SPA (Complete ✅)

- [x] **Phase 10: Frontend Foundation & Design System** - Vite + React 18 in `client/`, Tailwind luxury tokens, custom dark MUI v5 theme, Axios interceptor client, client stores, and PBAC render guard
- [x] **Phase 11: Authentication & Password Recovery** - Login, registration, role-based routing, silent 401 token refresh rotation, and self-service password reset token flow
- [x] **Phase 12: Public Room Discovery & Guest Atomic Booking Flow (MVP)** - Asymmetric landing page, availability search grid, Framer Motion shared-element transition (`RoomCard` → Hero), multi-step checkout, and confirmation
- [x] **Phase 13: Front Desk Operations Console & In-Person Payments** - `/desk` Arrivals, Departures, and In-House tabs in dense MUI DataGrid, check-in, check-out, and in-person POS cash/card payment recording
- [x] **Phase 14: Tiered Cancellations & Authoritative Refunds** - Guest cancellation request modal with 3-tier refund warning, front desk audit queue, authoritative backend calculation breakdown, and approve/reject actions
- [x] **Phase 15: Housekeeping Board & Room Cleanliness Transitions** - `/housekeeping` board with state transitions (`clean`, `dirty`, `cleaning`, `maintenance`)
- [x] **Phase 16: Staff Management & Dynamic PBAC Matrix** - Staff directory, staff creation modal, and `/admin/staff/:id/pbac` interactive permission toggle matrix grouped by functional categories
- [x] **Phase 17: Guest Portal, Stays Management & Engagement** - Guest dashboard, loyalty points & tier badge, booking history, dynamic PDF Tax Invoice streaming/download, wishlists, waitlists, and verified reviews
- [x] **Phase 18: Managerial Analytics & Security Audit Intelligence** - Revenue line chart (`@mui/x-charts`), Occupancy rate gauge, Master global bookings DataGrid, and immutable security audit log viewer
- [x] **Phase 19: Multi-Role AI Concierge & Administrative Copilot** - Guest Concierge drawer, full-page `/concierge`, and Super-Admin AI Copilot with 2-phase confirmation modal
- [x] **Phase 20: Command Palette (⌘K) & Production Build Polish** - Staff ⌘K Command Palette with fuzzy search, role filtering, arrow navigation, vendor code-splitting, and zero-warning production build

---

## Phase Details (Milestone 2)

### Phase 10: Frontend Foundation & Design System
**Goal**: Initialize React 18 + Vite project in `client/`, configure Tailwind luxury design tokens, custom dark MUI v5 theme, Axios client with envelope unwrapper & 401 silent refresh queue, and `<Can />` PBAC guard.
**Depends on**: Backend API (Phase 9)
**Requirements**: [FE-FND-01, FE-FND-02, FE-FND-03, FE-FND-04]
**Success Criteria**:
  1. Vite dev server runs cleanly in `client/` on port 5173.
  2. Tailwind config defines custom luxury tokens (`--ink: #0A0F1A`, `--surface: #131A26`, `--gold: #C9A15A`, `--aqua: #3FD0C9`).
  3. Custom MUI dark theme overrides default Material blue with Inter font, 8px radius, and `--surface` panel colors.
  4. Axios instance automatically unwraps `response.data.data` and handles silent 401 token rotation.
  5. `<Can />` component renders children when permitted and renders nothing (invisible, never disabled) when unpermitted.

### Phase 11: Authentication & Password Recovery
**Goal**: Implement complete authentication lifecycle with role-based post-login redirection and self-service password reset token flow.
**Depends on**: Phase 10
**Requirements**: [FE-AUTH-01, FE-AUTH-02, FE-AUTH-03, FE-AUTH-04]
**Success Criteria**:
  1. Guests and staff log in via `/login` and redirect to their appropriate role home (`/dashboard`, `/desk`, `/housekeeping`, `/admin/analytics`).
  2. Registration at `/register` creates account and logs user in immediately.
  3. Submitting email at `/forgot-password` returns generic enumeration-safe success alert.
  4. Entering valid token at `/reset-password` updates credentials and routes to login.

### Phase 12: Public Room Discovery & Guest Atomic Booking Flow (MVP)
**Goal**: Deliver the guest-facing discovery and reservation funnel with Framer Motion shared-element transition and atomic checkout.
**Depends on**: Phase 11
**Requirements**: [FE-BOOK-01, FE-BOOK-02, FE-BOOK-03, FE-BOOK-04, FE-BOOK-05]
**Success Criteria**:
  1. Landing page displays asymmetric hero, ambient skyline SVG, and `<SearchWidget />`.
  2. Availability query `GET /api/v1/rooms/available` renders rooms with staggered 60ms animation.
  3. Clicking a room card triggers Framer Motion `layoutId` morph into the hero of `/rooms/:id`.
  4. Checkout dispatches `POST /api/v1/bookings` with `Idempotency-Key` and sweeps the gold keycard loader.
  5. Confirmation screen displays real `bookingReference` and direct stay detail links.

### Phase 13: Front Desk Operations Console & In-Person Payments
**Goal**: Build front desk flight board for receptionists with arrivals, departures, in-house tabs, check-in, check-out, and cash/card POS payment intake.
**Depends on**: Phase 12
**Requirements**: [FE-DESK-01, FE-DESK-02, FE-DESK-03, FE-DESK-04]
**Success Criteria**:
  1. `/desk` renders Arrivals, Departures, and In-House tabs using dense MUI DataGrid.
  2. Check-in verifies room is clean, updating booking status to `checked-in`.
  3. Check-out updates booking to `checked-out` and room housekeeping status automatically changes to `dirty`.
  4. In-person payment modal records cash or offline POS card payments via `POST /api/v1/desk/bookings/:id/payments`.

### Phase 14: Tiered Cancellations & Authoritative Refunds
**Goal**: Implement guest cancellation request flow and front desk authoritative refund audit queue.
**Depends on**: Phase 13
**Requirements**: [FE-CANCEL-01, FE-CANCEL-02, FE-CANCEL-03, FE-CANCEL-04]
**Success Criteria**:
  1. Guest cancellation modal displays dynamic 3-tier refund policy warnings before submitting.
  2. Status displays "Cancellation requested — front desk will review" while pending.
  3. Front desk queue at `/desk/cancellations` displays pending requests.
  4. Cancellation review modal displays authoritative hours remaining, tier name, and exact refund amount.
  5. Staff can approve or reject (with mandatory reason) cancellation requests.

### Phase 15: Housekeeping Board & Room Cleanliness Transitions
**Goal**: Cleanliness operations board for housekeeping staff with state machine transitions.
**Depends on**: Phase 13
**Requirements**: [FE-HOUSE-01, FE-HOUSE-02]
**Success Criteria**:
  1. `/housekeeping` displays rooms grouped by status (`clean`, `dirty`, `cleaning`, `maintenance`).
  2. Cleaners can transition room statuses with optional notes via `PATCH /api/v1/rooms/:id/housekeeping`.

### Phase 16: Staff Management & Dynamic PBAC Matrix
**Goal**: Super Admin staff directory, account creation, and interactive category-wise permission matrix.
**Depends on**: Phase 11
**Requirements**: [FE-PBAC-01, FE-PBAC-02, FE-PBAC-03]
**Success Criteria**:
  1. `/admin/staff` lists staff accounts and provides "Create New Staff" modal.
  2. `/admin/staff/:id/pbac` renders split-view staff list and category-grouped permission switches.
  3. Toggling switches dispatches updated role and permissions array together with loading feedback.

### Phase 17: Guest Portal, Stays Management & Engagement
**Goal**: Guest dashboard, stay history, dynamic PDF Tax Invoice downloads, wishlists, waitlists, and verified reviews.
**Depends on**: Phase 12
**Requirements**: [FE-PORTAL-01, FE-PORTAL-02, FE-PORTAL-03, FE-PORTAL-04, FE-PORTAL-05]
**Success Criteria**:
  1. `/dashboard` displays loyalty balance, tier badge, and upcoming stays.
  2. `/my-bookings` provides filter tabs (Upcoming, Past, Cancelled).
  3. Booking details streams dynamic PDF Tax Invoice via `GET /api/v1/bookings/:id/invoice`.
  4. Guests can manage wishlists and subscribe to sold-out date waitlists.
  5. Verified reviews can be submitted only on checked-out stays.

### Phase 18: Managerial Analytics & Security Audit Intelligence
**Goal**: Revenue trends, occupancy rates, global master bookings directory, and immutable security audit log viewer.
**Depends on**: Phase 13
**Requirements**: [FE-MGMT-01, FE-MGMT-02, FE-MGMT-03, FE-MGMT-04]
**Success Criteria**:
  1. `/admin/analytics` renders `@mui/x-charts` Revenue Line chart and Occupancy gauge.
  2. `/admin/bookings` provides global multi-filter search across all hotel reservations.
  3. `/admin/audit-log` renders immutable security logs.
  4. `/admin/rooms` provides room CRUD, specs editor, soft-delete, and Cloudinary media management.

### Phase 19: Multi-Role AI Concierge & Administrative Copilot
**Goal**: Role-aware AI assistant: Guest concierge, staff helper, and Super-Admin copilot with two-phase dry-run mutation confirmation.
**Depends on**: Phase 18
**Requirements**: [FE-AI-01, FE-AI-02, FE-AI-03]
**Success Criteria**:
  1. Guest concierge answers travel queries, FAQs, and room advice via `<ChatDrawer />` and `/concierge`.
  2. Admin copilot returns `requiresConfirmation: true` and `actionPayload` for high-impact mutations.
  3. UI opens confirmation modal and calls `POST /api/v1/chat/admin/confirm` upon explicit admin approval.

### Phase 20: Command Palette (⌘K) & Production Build Polish
**Goal**: Staff ⌘K Command Palette, hero CTA magnetic hover pull, route tree integration, and production build verification.
**Depends on**: Phase 19
**Requirements**: [FE-CMD-01, FE-CMD-02, FE-CMD-03]
**Success Criteria**:
  1. Pressing `Cmd+K` / `Ctrl+K` opens staff command palette with fuzzy navigation.
  2. Magnetic hover pull smoothly tracks cursor on landing hero CTA.
  3. Production build `npm run build` in `client/` completes with zero bundling or type errors.

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1-9 (Complete) ➔ 10 ➔ 11 ➔ 12 ➔ 13 ➔ 14 ➔ 15 ➔ 16 ➔ 17 ➔ 18 ➔ 19 ➔ 20

| Phase | Milestone | Status | Completed |
|---|---|---|---|
| 1. Setup (Shared Infrastructure) | M1: Backend | Complete | 2026-09-21 |
| 2. Foundational (Auth & PBAC) | M1: Backend | Complete | 2026-09-21 |
| 3. User Story 1 - Core Guest Booking (MVP) | M1: Backend | Complete | 2026-09-22 |
| 4. User Story 2 - Front Desk Operations | M1: Backend | Complete | 2026-09-22 |
| 5. User Story 3 - Tiered Cancellations | M1: Backend | Complete | 2026-09-22 |
| 6. User Story 4 - Room Lifecycle & Housekeeping | M1: Backend | Complete | 2026-09-22 |
| 7. User Story 5 - Guest Loyalty & Reviews | M1: Backend | Complete | 2026-09-25 |
| 8. User Story 6 - Audit & Secure AI | M1: Backend | Complete | 2026-09-25 |
| 9. Polish & Cross-Cutting Concerns | M1: Backend | Complete | 2026-09-25 |
| 10. Frontend Foundation & Design System | M2: Frontend | Complete | 2026-09-25 |
| 11. Authentication & Password Recovery | M2: Frontend | Complete | 2026-09-25 |
| 12. Public Room Discovery & Guest Booking (MVP) | M2: Frontend | Complete | 2026-09-25 |
| 13. Front Desk Operations Console | M2: Frontend | Complete | 2026-09-25 |
| 14. Tiered Cancellations & Authoritative Refunds | M2: Frontend | Complete | 2026-09-25 |
| 15. Housekeeping Board & Cleanliness Transitions | M2: Frontend | Complete | 2026-09-25 |
| 16. Staff Management & Dynamic PBAC Matrix | M2: Frontend | Complete | 2026-09-25 |
| 17. Guest Portal, Stays Management & Engagement | M2: Frontend | Complete | 2026-09-25 |
| 18. Managerial Analytics & Security Audit | M2: Frontend | Complete | 2026-09-25 |
| 19. Multi-Role AI Concierge & Copilot | M2: Frontend | Complete | 2026-09-25 |
| 20. Command Palette (⌘K) & Production Polish | M2: Frontend | Pending | - |

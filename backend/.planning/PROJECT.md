# Hotel Booking and Management System

## What This Is

A production-grade Hotel Booking and Management System consisting of:
1. **Backend API (v1.0 - Complete)**: Node.js, Express, MongoDB/Mongoose with multi-document ACID transactions, dynamic PBAC, authoritative tiered refunds, and AI concierge.
2. **Frontend SPA (v2.0 - Active Milestone)**: React 18 + Vite Single Page Application implementing a dual-register visual architecture (luxury Tailwind CSS for guest portal and custom-themed Material UI v5 for staff/admin consoles), integrated with TanStack Query v5, Zustand, Framer Motion, and Axios with silent 401 token refresh rotation.

## Core Value

Absolute reservation integrity, financial accuracy, and an exceptional dual-register user experience: zero double-bookings via ACID transactions, authoritative server-side pricing/refunds, and a responsive luxury guest portal alongside a high-density operational staff cockpit.

## Business Context

- **Customer**: Independent hotel properties, front desk staff, housekeeping, guests, and hotel administrators.
- **Revenue model**: Room bookings (in-person desk cash/card payments, future Stripe integration), cancellation fees, and amenities.
- **Success metric**: 0% double-booking rate, 100% adherence to authoritative cancellation tiers, sub-1.5s frontend FCP, and sub-50ms ⌘K command palette response.
- **Strategy notes**: Dual-register frontend architecture (Tailwind for guest warmth, themed MUI v5 for dense operational flight-ops; the two never mix on the same screen).

## Milestone History

- **Milestone 1 (Backend v1.0)**: ✅ Complete (All 9 phases delivered, 100% test pass rate with 143 passing tests across 21 test suites).
- **Milestone 2 (Frontend v2.0)**: 🚀 Active Milestone (React 18 + Vite, Tailwind Guest Portal, Themed MUI Staff Console, PBAC Matrix, AI Copilot, ⌘K Command Palette).

## Active Requirements (Milestone 2 - Frontend)

- [ ] Project scaffold in `client/` (React 18, Vite, Tailwind custom tokens, dark MUI theme, Google Fonts)
- [ ] Network layer with Axios envelope unwrapper (`response.data.data`), 401 silent JWT refresh queue, and `Idempotency-Key` injection
- [ ] Public room discovery, date availability search grid (`/rooms`), and Framer Motion shared-element transition (`RoomCard` → `/rooms/:id`)
- [ ] Multi-step atomic checkout with payment method selection, gold keycard sweep loader, and real `bookingReference` confirmation
- [ ] Front Desk operational board (`/desk`) with Arrivals, Departures, and In-House tabs (MUI DataGrid), check-in, check-out, and in-person POS payment recording
- [ ] Staff-audited tiered cancellations (`cancellation-requested` status, front desk review queue, authoritative refund breakdown, approve/reject dialog)
- [ ] Housekeeping cleanliness board (`/housekeeping`) with state transitions (`clean`, `dirty`, `cleaning`, `maintenance`)
- [ ] Super Admin dynamic PBAC matrix (`/admin/staff/:id/pbac`) with category-wise permission switches
- [ ] Guest portal: dashboard, loyalty balance & tier badge, booking history, PDF invoice download stream, wishlists, and waitlists
- [ ] Managerial analytics (`/admin/analytics` revenue trend line and occupancy gauge) and security audit log viewer
- [ ] Multi-Role AI Assistant: Guest concierge drawer, full-page `/concierge`, and Super-Admin AI Copilot with 2-phase confirmation dialog
- [ ] Staff ⌘K Command Palette and luxury motion orchestration

## Context

- Target platform: Node.js (v20+ LTS), Express.js, MongoDB (Atlas / local replica set for transactions), React 18 + Vite
- Testing framework: Jest, Supertest, MongoMemoryServer, React Testing Library / Playwright
- Architecture: Decoupled MERN Architecture (Express API Backend in `my-app/`, React Vite Client in `client/`)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| MongoDB Multi-Document Transactions | Eliminates race conditions and double-bookings during concurrent guest checkouts | Complete (v1.0) |
| Dynamic PBAC over Static Roles | Gives super-admins operational flexibility to grant/revoke granular staff permissions without redeployment | Complete (v1.0) |
| Server-Authoritative Refund Calculation | Prevents client parameter tampering and guarantees audit-compliant financial deductions | Complete (v1.0) |
| Dual-Register Frontend Architecture | Tailwind CSS for serene guest luxury; custom-themed MUI v5 for dense staff operations (never mixed on same screen) | Active (v2.0) |
| Invisible-Over-Disabled PBAC UI Rule | `<Can permission="...">` renders nothing (never greyed-out or disabled) if permission is lacking | Active (v2.0) |
| Axios Silent 401 Refresh Queue | Prevents session disruption and form data loss on access token expiration | Active (v2.0) |

---
*Last updated: 2026-09-25 after launching Milestone 2 (Frontend Client)*

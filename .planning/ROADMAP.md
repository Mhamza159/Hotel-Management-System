# Project Roadmap: Grand Horizon Hotel — Milestone 2

**Milestone:** Milestone 2: Staff & Super-Admin Console Completeness & PBAC UI Engine  
**Previous Milestone:** [Milestone 1 Archive](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/milestones/v1.0-ROADMAP.md) (Phases 1 - 7 Verified)  
**Related Specs:** [.planning/PROJECT.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/PROJECT.md) | [.planning/REQUIREMENTS.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/REQUIREMENTS.md)  
**Spec Contract:** [.specify/specs/staff-console-completeness/spec.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/staff-console-completeness/spec.md)  
**Status:** Completed & Verified ✅

---

## Phases Overview

```mermaid
gantt
    title Milestone 2: Staff & Super-Admin Console Completeness
    dateFormat  YYYY-MM-DD
    section Staff Operations
    Phase 8  : Front Desk API Parity & Walk-In Engine :done, p8, 2026-09-29, 1d
    section Review & Audits
    Phase 9  : Review Moderation & Audit Observability :done, p9, 2026-09-29, 1d
    section Dynamic Security
    Phase 10 : Categorized Non-Optimistic PBAC Matrix  :done, p10, 2026-09-29, 1d
    section AI & Polish
    Phase 11 : Staff AI Drawer & E2E Validation        :done, p11, 2026-09-29, 1d
```

---

## Detailed Phase Breakdown

### Phase 8: Front Desk API Parity & Walk-In Reservation Engine
**Goal:** Implement full frontend support for all real front-desk endpoints, including instant walk-in booking creation, room status selector, and keycard reissue.
- **Tasks:**
  - [x] **8.1:** Built `WalkInBookingDialog.jsx` and mounted in `DeskDashboardPage.jsx` and `WalkInBookingPage.jsx` with full room selection, guest name/email, night counter, pricing summary, and payment mode toggle (`stripe_intent` vs `cash`).
  - [x] **8.2:** Verified room status quick selector and housekeeping cleanliness transition (`POST /api/v1/rooms/:id/status` / `PATCH /api/v1/rooms/:id/housekeeping`).
  - [x] **8.3:** Integrated Keycard Reissue trigger in `ArrivalsPage.jsx` and `InHousePage.jsx` with visual count indicator.
- **Deliverables:** `WalkInBookingDialog.jsx`, `DeskDashboardPage.jsx`, `deskService.js`.

---

### Phase 9: Staff Review Moderation & Audit Trail Observability
**Goal:** Connect staff review inspection & moderation to real endpoints and build full tabular audit trail observability.
- **Tasks:**
  - [x] **9.1:** Built `AdminReviewsPage.jsx` wired to per-room review endpoints (`GET /api/v1/rooms/:id/reviews`) and deletion/moderation modal (`DELETE /api/v1/reviews/:id`) with permission guard `rooms:view` / `staff:manage`.
  - [x] **9.2:** Verified and polished `AdminAuditLogsPage.jsx` wired to `GET /api/v1/admin/audit-log` with pagination, action-type filter, date-range picker, and expandable JSON metadata inspector (`AuditPayloadModal.jsx`).
  - [x] **9.3:** Added `Guest Reviews` link in `StaffSidebar.jsx` and mounted route in `App.jsx`.
- **Deliverables:** `AdminReviewsPage.jsx`, `AdminAuditLogsPage.jsx`, `engagementService.js`, `adminService.js`.

---

### Phase 10: Categorized Non-Optimistic PBAC Matrix & Dynamic Guarding
**Goal:** Deliver complete PBAC matrix across all 20 permissions with loading feedback and strict DOM omission for unpermitted elements.
- **Tasks:**
  - [x] **10.1:** Categorized 20 PBAC permissions in `StaffPbacMatrixPage.jsx` into 5 clear domains (Bookings, Front Desk, Payments, Rooms, Oversight).
  - [x] **10.2:** Enforced non-optimistic permission switches: individual switch shows active spinner until server confirmation, with sticky action dock and diff confirmation modal (`PbacConfirmModal.jsx`).
  - [x] **10.3:** Audited staff navigation links, buttons, and sub-pages to ensure zero greyed-out or disabled buttons — unpermitted elements are omitted via `<Can>`.
- **Deliverables:** `StaffPbacMatrixPage.jsx`, `StaffSidebar.jsx`, `Can.jsx`.

---

### Phase 11: AI Staff Assistant Drawer & Production Verification
**Goal:** Finalize AI Concierge / Staff Assistant floating trigger, role-based endpoint routing, and run full production build and verification.
- **Tasks:**
  - [x] **11.1:** Verified `ChatDrawer.jsx` styling and positioning (`z-50`, floating pill) with dual-mode styling (Verde cream for guests, Obsidian Dark + Aqua for staff).
  - [x] **11.2:** Wired dynamic staff assistant prompts ("Today's Occupancy", "Pending Cancellations", "Dirty Rooms Queue") and endpoint routing (`POST /api/v1/chat/staff` vs `POST /api/v1/chat/user`).
  - [x] **11.3:** Ran comprehensive `npm run build` verification: built in 26.18s with 0 errors.
- **Deliverables:** `ChatDrawer.jsx`, `chatService.js`, production bundle verification.

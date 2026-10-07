# Feature Specification: Complete Super-Admin & Receptionist UI (Full Codebase Audit & Build)

**Feature Name:** `staff-console-completeness`  
**Status:** Draft / Ready for Plan 📋  
**Priority:** Critical (P1)  
**Author:** Antigravity AI  
**Scope:** Super-Admin & Receptionist Operational Consoles, Front Desk Operations, PBAC Matrix, Room Management & Review Moderation, Bookings Directory, AI Copilot, and Staff Command Palette.

---

## 1. Executive Summary & Codebase Audit Findings

### 1.1 Objective
Deliver a completeness pass across all staff modules (**Super-Admin** and **Receptionist**). This specification is derived from a full, line-by-line inspection of the actual Express backend routes, controllers, and services (not outdated markdown specs). It ensures:
1. Every real backend endpoint is paired with full, responsive UI.
2. The custom MUI dark theme (`navy/gold/aqua`: `--ink: #0A0F1A`, `--surface: #131A26`, `--gold: #C9A15A`, `--aqua: #3FD0C9`) remains consistent across all staff console views.
3. Every UI element and action button is governed by granular PBAC rules (`user.role === 'super-admin' || user.permissions.includes(x)`) using the `<Can>` guard. Elements without permission are **completely absent from the DOM** (never rendered disabled or locked).
4. Zero optimistic UI on financial or state-altering actions (check-in, check-out, payments, cancellations, role changes, and room deletion) — every action requires server confirmation.

---

### 1.2 Backend Codebase Route & Endpoint Audit Matrix

| Module | Route / Method | Enforced Permission Guard | Verified in Codebase | UI Implementation Status & Requirements |
| :--- | :--- | :--- | :---: | :--- |
| **Staff Auth & Profile** | `GET /api/v1/auth/me` | `authenticate` | ✅ | Silently syncs user profile and permissions on mount/focus. |
| **Staff Directory** | `GET /api/v1/auth/staff` | `requirePermission('staff:manage')` | ✅ | Staff Directory table with search, role chips, and contact info. |
| **Create Staff** | `POST /api/v1/auth/staff` | `requirePermission('staff:manage')` | ✅ | Modal creating new staff with role and initial permission templates. |
| **PBAC Metadata** | `GET /api/v1/auth/permissions` | `requirePermission('staff:manage')` | ✅ | Fetches roles list, permissions taxonomy, and default role templates. |
| **Update Permissions & Role** | `PATCH /api/v1/auth/users/:id/permissions` | `requirePermission('staff:manage')` | ✅ | **Audit Finding:** Backend accepts `{ role, permissions }` in single body. Form must allow updating **both** in one screen. |
| **All Rooms Directory** | `GET /api/v1/rooms/admin/all` | `requireAnyPermission(['rooms:view', 'housekeeping:update'])` | ✅ | Admin room inventory catalog with pagination and query filters. |
| **Create Room** | `POST /api/v1/rooms` | `requirePermission('rooms:create')` | ✅ | New room modal with category, rate, capacity, and amenities. |
| **Update Room** | `PATCH /api/v1/rooms/:id` | `requirePermission('rooms:update')` | ✅ | Edit room specification and pricing. |
| **Delete Room** | `DELETE /api/v1/rooms/:id` | `requirePermission('rooms:delete')` | ✅ | **Audit Finding:** Soft-deletes room. Rejects with 400 if upcoming bookings exist. Must surface exact server message. |
| **Housekeeping Override** | `PATCH /api/v1/rooms/:id/housekeeping` | `requirePermission('housekeeping:update')` | ✅ | Cleanliness transition (clean, dirty, cleaning, maintenance). Super-admin bypasses. |
| **Upload Room Photos** | `POST /api/v1/rooms/:id/images` | `requirePermission('rooms:update')` | ✅ | Multer stream to Cloudinary (up to 5 images per request). |
| **Delete Room Photo** | `DELETE /api/v1/rooms/:id/images` | `requirePermission('rooms:update')` | ✅ | Cloudinary photo purge by `{ publicId }`. |
| **Per-Room Reviews** | `GET /api/v1/rooms/:id/reviews` | Public | ✅ | **Audit Finding:** Paginated reviews per room. |
| **Moderate Review** | `DELETE /api/v1/reviews/:id` | `authenticate` (owner or Super-Admin) | ✅ | **Audit Finding:** No global review list endpoint exists. Moderation must live in each room's reviews tab with delete action. |
| **Global Bookings** | `GET /api/v1/admin/bookings` | `requirePermission('bookings:view')` | ✅ | Full directory. Backend supports `status`, `paymentStatus`, `fromDate`, `toDate`, and `search`. Needs date filter controls. |
| **Front Desk Overview** | `GET /api/v1/desk/bookings` | `requirePermission('bookings:view')` | ✅ | Arrivals, Departures, and In-House tabs filtered by operational date. |
| **Room Allotment Status** | `GET /api/v1/desk/rooms-allotment-status` | `requireAnyPermission(['checkin:manage', 'rooms:view'])` | ✅ | Live suite assignment picker during check-in. |
| **Allot Rooms** | `PATCH /api/v1/desk/bookings/:id/allot-rooms` | `requirePermission('checkin:manage')` | ✅ | Assigns physical rooms to booking slots. |
| **Execute Check-In** | `PATCH /api/v1/desk/bookings/:id/check-in` | `requirePermission('checkin:manage')` | ✅ | Gated independently. Validates assigned room is `clean` & paid. |
| **Execute Check-Out** | `PATCH /api/v1/desk/bookings/:id/check-out` | `requirePermission('checkout:manage')` | ✅ | Gated independently. Auto-flips room to `dirty`; immediately refreshes room data. |
| **In-Person Payment** | `POST /api/v1/desk/bookings/:id/payments` | `requireAnyPermission(['payments:recordCash', 'payments:recordCard'])` | ✅ | Records cash or offline POS card payments. Gated independently. |
| **Walk-In Booking** | `POST /api/v1/desk/walk-in` | `requirePermission('bookings:create')` | ✅ | Creates instant walk-in reservation with optional check-in. |
| **Cancellation Queue** | `GET /api/v1/desk/cancellation-requests` | `requirePermission('bookings:view')` | ✅ | Queue of pending cancellation review requests. |
| **Cancellation Breakdown** | `GET /api/v1/desk/bookings/:id/cancellation-review` | `requirePermission('bookings:cancel')` | ✅ | Authoritative refund tier calculation (rendered verbatim). |
| **Approve Cancellation** | `PATCH /api/v1/desk/bookings/:id/cancel-approve` | `requirePermission('bookings:cancel')` | ✅ | Voids booking and releases inventory. |
| **Reject Cancellation** | `PATCH /api/v1/desk/bookings/:id/cancel-reject` | `requirePermission('bookings:cancel')` | ✅ | Restores confirmed booking with required `{ rejectionReason }`. |
| **Revenue Analytics** | `GET /api/v1/admin/analytics/revenue` | `requirePermission('analytics:view')` | ✅ | Total revenue, ADR, RevPAR, and date-range breakdowns. |
| **Occupancy Analytics** | `GET /api/v1/admin/analytics/occupancy` | `requirePermission('analytics:view')` | ✅ | Occupancy rate, total vs occupied rooms, category breakdown. |
| **Payment Search** | `GET /api/v1/admin/analytics/payments/search` | `requirePermission('analytics:view')` | ✅ | Search by Payment ID, Booking Reference, or POS Slip. |
| **Audit Activity Log** | `GET /api/v1/admin/audit-log` | `requirePermission('audit:view')` | ✅ | Paginated immutable security ledger with actor, action, and target filters. |
| **Admin AI Copilot** | `POST /api/v1/chat/admin` | `super-admin` only | ✅ | Operational assistant with prepare-mutation protocol (`requiresConfirmation: true`). |
| **Admin Copilot Confirm** | `POST /api/v1/chat/admin/confirm` | `super-admin` only | ✅ | Executes confirmed high-impact mutation via `{ confirmationToken }`. |
| **Staff AI Assistant** | `POST /api/v1/chat/staff` | `receptionist` or `super-admin` | ✅ | Read-only operational lookup queries (arrivals, occupancy, readiness). |

---

### 1.3 Verified Known Gaps (Explicitly Excluded from UI)
Based on direct inspection of `backend/src/routes` and `backend/src/app.js`:
1. **Coupons (`coupons:manage`):** Zero backend routes or models exist. No coupon management UI will be constructed.
2. **Dynamic Pricing Rules (`rooms:priceUpdate` as a standalone engine):** Price changes are performed directly via `PATCH /rooms/:id`. No independent rules engine endpoint exists.
3. **Staff-Side Waitlist Queue (`waitlist:manage` for staff):** Only guest-facing waitlist endpoints exist (`/api/v1/waitlist`). No staff queue endpoint exists.
4. **Combined Analytics Overview:** No single summary endpoint exists. The Analytics page must compose data from both `/revenue` and `/occupancy`.
5. **Standalone Refund (`payments:refund`):** No standalone endpoint is gated by `payments:refund` alone. Refunds are executed strictly as a side effect of `PATCH /desk/bookings/:id/cancel-approve`.

---

## 2. Core Architectural Principles

1. **Anti-Template Invisibility Rule:**  
   If an authenticated staff member lacks the required PBAC permission for a button, tab, card, or modal, that element is **never rendered in the DOM** (never rendered disabled, greyed out, or with a lock icon). Super-admins bypass all permission restrictions automatically.
2. **Zero Optimistic State for High-Impact Actions:**  
   Check-in, check-out, recording payments, approving/rejecting cancellations, modifying permissions, and room deletion must await authoritative backend HTTP responses before updating UI state.
3. **Strict Visual Consistency:**  
   Housekeeping role pages use the warm minimal planner theme. **Front Desk, Receptionist, and Super-Admin pages strictly maintain the custom-themed MUI Obsidian Dark aesthetic** (`#0A0F1A`, `#131A26`, `#C9A15A`, `#3FD0C9`).
4. **Single Source of Navigation Truth:**  
   `<StaffSidebar>` builds its navigation structure dynamically on every render from `user.role` and `user.permissions`. There must be no duplicate sidebar files or divergent menus.
5. **Live PBAC Synchronization:**  
   `<StaffLayout>` syncs `GET /api/v1/auth/me` on mount and focus so that permission delegations made by Super-Admin take effect live without requiring manual logout/login.

---

## 3. Prioritized User Stories

### P1: Super-Admin Room Management, Image Gallery & Review Moderation
- **US-SA-01 (Room Catalog & Filtering):**  
  As a Super-Admin, I want to view all physical rooms with filters for category, cleanliness status, operational status (`isActive`), and text search, so that I can audit and manage room inventory effectively.
- **US-SA-02 (Room Image Management):**  
  As a Super-Admin, I want to upload up to 5 Cloudinary images per room and delete individual images by `publicId`, so that the room gallery is always up to date.
- **US-SA-03 (Room Deletion Safeguard):**  
  As a Super-Admin, when I attempt to delete a room that has upcoming active reservations, the system must display the exact backend rejection message ("Cannot delete room... It has upcoming active reservations...") so that I understand why the operation was denied.
- **US-SA-04 (Per-Room Review Moderation):**  
  As a Super-Admin, I want to open any room in Room Management, view its paginated guest reviews, and delete abusive or fraudulent reviews with immediate server confirmation, so that hotel reputation is maintained.

---

### P2: Front Desk Operational PBAC & Granular Error Transparency
- **US-FD-01 (Independent Check-In / Check-Out Controls):**  
  As a Receptionist with `checkin:manage` but without `checkout:manage`, I should see and execute Check-In actions, but Check-Out actions must be completely absent from my screen.
- **US-FD-02 (Cleanliness Validation Transparency):**  
  As Front Desk Staff executing Check-In, if the assigned room is not in `clean` status, the system must clearly display the backend validation error rather than failing silently.
- **US-FD-03 (Immediate Check-Out Reflection):**  
  As Front Desk Staff executing Check-Out, the system must complete the transaction, auto-flip the room's status to `dirty`, and immediately refresh the arrivals/departures and room status data without requiring a full page reload.
- **US-FD-04 (In-Person Payment Recording):**  
  As Front Desk Staff with `payments:recordCash` or `payments:recordCard`, I want to record full or partial in-person payments with an optional POS slip reference, updating the booking ledger immediately.

---

### P3: Staff PBAC Matrix Simultaneous Role + Permission Batch Save
- **US-PBAC-01 (Unified Role & Permission Editing):**  
  As a Super-Admin in `/admin/staff/pbac` or `/admin/staff/:id/pbac`, I want to change a staff member's role (e.g. from Housekeeping to Receptionist) AND customize their permission switches on the same screen, committing both in a single atomic PATCH call.
- **US-PBAC-02 (Visual Diffing & Transaction Confirmation):**  
  Before applying changes, a confirmation modal must display the exact additions and revocations, requiring confirmation before executing the update.

---

### P4: Global Bookings Directory Date Filtering & MUI DataGrid
- **US-BK-01 (Advanced Search & Date Range Filters):**  
  As a Super-Admin or Receptionist with `bookings:view`, I want to filter the global reservations table by `status`, `paymentStatus`, `fromDate`, `toDate`, and keyword search (matching booking reference, guest name, email, or phone).

---

### P5: Two-Phase AI Copilot Safety Execution Gate
- **US-AI-01 (Dry-Run Confirmation Dialog):**  
  As a Super-Admin interacting with AI Ops Copilot (`/admin/copilot`), whenever an administrative command returns `requiresConfirmation: true`, the system must open an explicit confirmation dialog showing the action details before calling `/chat/admin/confirm`.

---

### P6: Dynamic Global Command Palette (⌘K)
- **US-CMD-01 (Role & PBAC-Aware Navigation):**  
  As any authenticated staff user pressing ⌘K / Ctrl+K, the command list must evaluate my permissions dynamically so that I can jump to any section I am authorized to access.

---

## 4. Acceptance Criteria (Given / When / Then)

### Scenario 1: Super-Admin Deletes Room with Active Bookings
- **Given** Super-Admin is on `/admin/rooms` and Room #101 has an upcoming confirmed booking
- **When** Super-Admin clicks "Delete Room" and confirms the browser prompt
- **Then** the system sends `DELETE /api/v1/rooms/:id`
- **And** upon receiving HTTP 400 with message `Cannot delete room '101'. It has X upcoming active reservation(s)...`, the UI displays this verbatim message in an error banner.

### Scenario 2: Per-Room Review Moderation by Super-Admin
- **Given** Super-Admin opens Room #204 in `/admin/rooms` and navigates to the "Guest Reviews" tab
- **When** the reviews are retrieved via `GET /api/v1/rooms/:id/reviews`
- **Then** every review item displays a "Delete Review" button
- **When** Super-Admin clicks "Delete Review"
- **Then** `DELETE /api/v1/reviews/:reviewId` is executed, the review is removed from the list, and a success notification is displayed.

### Scenario 3: Independent Check-In and Check-Out Controls
- **Given** a Receptionist user logged in with `checkin:manage` but NOT `checkout:manage`
- **When** viewing `/desk`
- **Then** the "Check In" button is rendered on eligible arrival rows
- **And** the "Check Out" button is completely absent from the DOM on all rows and modals.

### Scenario 4: Front Desk Check-In Blocked by Dirty Room
- **Given** a confirmed booking assigned to a room currently marked `dirty`
- **When** the staff member clicks "Check In"
- **Then** `PATCH /api/v1/desk/bookings/:id/check-in` returns HTTP 400 (`Cannot check in to dirty room`)
- **And** the dashboard renders an explicit alert indicating the room must be inspected and marked clean before keys can be issued.

### Scenario 5: Check-Out Flips Room Cleanliness to Dirty Live
- **Given** a booking in `checked-in` status
- **When** staff member with `checkout:manage` executes Check-Out
- **Then** `PATCH /api/v1/desk/bookings/:id/check-out` succeeds
- **And** the system automatically re-fetches the departures feed and updates the assigned room status to `dirty` without requiring a browser page refresh.

### Scenario 6: PBAC Matrix Simultaneous Role + Permission Update
- **Given** Super-Admin is editing staff member "Alex" on `/admin/staff/pbac`
- **When** Super-Admin changes Alex's role dropdown from "housekeeping" to "receptionist" and toggles `bookings:cancel` ON
- **Then** both the new role and the draft permissions appear in the confirmation modal diff
- **When** Super-Admin clicks "Confirm & Apply"
- **Then** a single atomic `PATCH /api/v1/auth/users/:id/permissions` request is dispatched with `{ role: 'receptionist', permissions: [...] }`.

### Scenario 7: Global Bookings Date Range Filtering
- **Given** staff user on `/admin/bookings`
- **When** user selects `fromDate = 2026-10-01` and `toDate = 2026-10-07`
- **Then** `GET /api/v1/admin/bookings` is called with `fromDate` and `toDate` query parameters
- **And** the DataGrid displays only bookings whose `checkInDate` falls within that range.

### Scenario 8: AI Copilot Dry-Run Confirmation Modal
- **Given** Super-Admin inputs a mutation query into `/admin/copilot`
- **When** `POST /api/v1/chat/admin` returns `{ requiresConfirmation: true, pendingAction: { confirmationToken, ... } }`
- **Then** the system opens `ConfirmationActionModal` displaying the requested action and parameters
- **And** the mutation is never executed until the user explicitly clicks "Confirm & Execute".

---

## 5. Non-Functional Requirements & Security Guarantees

1. **Security & Authorization:**  
   Every client-side PBAC check is backed by authoritative backend middleware (`requirePermission`, `requireAnyPermission`, or Super-Admin bypass). Tampering with client-side state results in HTTP 403 Forbidden.
2. **Performance:**  
   Pagination limits are enforced across all lists (`limit: 10` default, max `100`). DataGrid virtual scrolling handles up to 500 records seamlessly.
3. **Accessibility:**  
   All modal dialogs support keyboard Escape to close, focus trapping, and distinct ARIA labels.
4. **Theme Fidelity:**  
   MUI theme tokens (`--ink: #0A0F1A`, `--surface: #131A26`, `--gold: #C9A15A`, `--aqua: #3FD0C9`, `--danger: #F2545B`, `--success: #3ECF8E`) are strictly preserved.

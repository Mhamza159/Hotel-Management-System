# Implementation Tasks: Complete Super-Admin & Receptionist UI (Full Codebase Audit & Build)

**Feature Name:** `staff-console-completeness`  
**Related Plan:** [.specify/specs/staff-console-completeness/plan.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/staff-console-completeness/plan.md)  
**Related Spec:** [.specify/specs/staff-console-completeness/spec.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/staff-console-completeness/spec.md)  
**Status:** Completed & Verified ✅  
**Portal Scope:** Staff & Management Cockpit (`/admin/*`, `/desk/*`) — Enforcing granular PBAC for Super-Admin and Receptionist roles with custom MUI Dark Theme (`navy/gold/aqua`).  

---

## Task List Checklist

### Phase 1: Navigation Shell, Branding & Dynamic PBAC Gating (P1)

- [x] **Task 1.1: Fix Staff Branding Header & Dynamic PBAC Invisibility in StaffSidebar**
  - **File:** `frontend/src/components/staff/StaffSidebar.jsx`
  - Replaced branding header text from "Harborlight Hotel" to "Grand Horizon Hotel".
  - Ensured navigation items and section headers strictly evaluate `can(user, item.permission)`. Unpermitted items and empty category headers are completely omitted from the DOM.
  - Verified active nav item styling matches custom MUI dark palette (`border-[#C9A15A] text-white`).

- [x] **Task 1.2: PBAC-Aware Global Command Palette (⌘K / Ctrl+K)**
  - **File:** `frontend/src/components/common/CommandPalette.jsx`
  - Mapped each operational command to its required PBAC permission (`cmd.permission`).
  - Filtered commands using dynamic PBAC checks allowing Receptionists with delegated access to navigate to unlocked modules via keyboard shortcut.

- [x] **Task 1.3: Booking Status Badge 7-State Verification**
  - **File:** `frontend/src/components/common/BookingStatusBadge.jsx`
  - Verified that all 7 real states (`pending`, `confirmed`, `checked-in`, `checked-out`, `cancellation-requested`, `cancelled`, `completed`) render with appropriate contrast and borders across both dark staff console surfaces and light guest pages.

---

### Phase 2: Front Desk Operational PBAC & Live State Reflection (P1)

- [x] **Task 2.1: Independent Check-In & Check-Out PBAC Separation**
  - **File:** `frontend/src/pages/desk/DeskDashboardPage.jsx`
  - Defined separate PBAC authorities: `canCheckIn`, `canCheckOut`, `canRecordPayment`.
  - Gated "Allot Rooms" & "Check In" buttons strictly with `canCheckIn`. If unpermitted, renders `null`.
  - Gated "Check Out" button strictly with `canCheckOut`. If unpermitted, renders `null`.
  - Gated "Collect Payment" & "Settle" buttons strictly with `canRecordPayment`. If unpermitted, renders `null`.

- [x] **Task 2.2: Cleanliness Validation Interception & Live Check-Out Auto-Dirty Refresh**
  - **File:** `frontend/src/pages/desk/DeskDashboardPage.jsx`
  - Intercepted HTTP 400 responses (e.g. room dirty) and displayed actionable alert warnings.
  - Triggered re-fetching of bookings and metrics on check-out success, ensuring live room status update without manual page reload.

---

### Phase 3: Super-Admin Room Management, Cloudinary Gallery & Review Moderation (P1)

- [x] **Task 3.1: Room Deletion Safeguard & Active Reservations Disclosure**
  - **File:** `frontend/src/pages/admin/AdminRoomsPage.jsx`
  - Caught error response data and surfaced exact server message in an error banner.

- [x] **Task 3.2: Room Reviews Moderation Page & Purge Action**
  - **Files:** `frontend/src/pages/admin/AdminReviewsPage.jsx`, `frontend/src/components/staff/StaffSidebar.jsx`, `frontend/src/App.jsx`
  - Built dedicated `AdminReviewsPage.jsx` with room selector, star rating indicators, verified stay badges, and soft-delete/moderation dialog calling `DELETE /api/v1/reviews/:id`.
  - Mounted route in `App.jsx` and added "Guest Reviews" link to `StaffSidebar.jsx`.

- [x] **Task 3.3: Verify Cloudinary Photo Gallery Management**
  - **File:** `frontend/src/pages/admin/AdminRoomsPage.jsx`
  - Verified image upload (`POST /api/v1/rooms/:id/images`) and deletion by `publicId` (`DELETE /api/v1/rooms/:id/images`).

---

### Phase 4: Staff PBAC Matrix Unified Role + Permission Mutation (P1)

- [x] **Task 4.1: Unified Draft State for Role & Permissions in StaffPbacMatrixPage**
  - **File:** `frontend/src/pages/admin/StaffPbacMatrixPage.jsx`
  - Stored `draftRole` and `draftPermissions` in local component draft state.
  - Unsaved changes tracked across both role and permission diffs with floating sticky action bar.

- [x] **Task 4.2: Update PbacConfirmModal & Atomic Batch Save**
  - **Files:** `frontend/src/components/admin/PbacConfirmModal.jsx`, `frontend/src/pages/admin/StaffPbacMatrixPage.jsx`
  - Modal displays diff breakdown with green/red pill badges and role transition alert.
  - Single atomic `PATCH /api/v1/auth/users/:id/permissions` payload dispatched with loading state.

---

### Phase 5: Global Bookings Directory Date Filtering & AI Copilot Confirmation (P2)

- [x] **Task 5.1: Add fromDate & toDate Filters in AdminBookingsPage**
  - **File:** `frontend/src/pages/admin/AdminBookingsPage.jsx`
  - Added `fromDate` and `toDate` date picker inputs to filter toolbar.
  - Passed parameters to `adminService.getAllBookings(params)`.
  - Added "Reset Filters" button to restore default query state.

- [x] **Task 5.2: AI Ops Copilot Two-Phase Dry-Run Execution Gate**
  - **Files:** `frontend/src/pages/admin/AdminCopilotPage.jsx`, `frontend/src/components/admin/ConfirmationActionModal.jsx`
  - Verified two-phase signed mutation safeguards via `POST /chat/admin` and `POST /chat/admin/confirm`.

---

## 4. Verification Check
- [x] All 20 real PBAC permissions mapped and verified.
- [x] Dynamic `<Can>` gating strictly eliminates unauthorized DOM elements (zero disabled/locked buttons).
- [x] Production build clean: `vite build` completed in 24.35s with exit code 0.

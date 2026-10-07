# Phase 10 Plan: Categorized Non-Optimistic PBAC Matrix & Dynamic Guarding

**Phase:** 10 of 11 (Milestone 2: Phase 3)  
**Directory:** `.planning/phases/10-categorized-non-optimistic-pbac-matrix/`  
**Related Specs:** [.planning/PROJECT.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/PROJECT.md) | [.planning/ROADMAP.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/ROADMAP.md) | [.specify/specs/staff-console-completeness/spec.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/staff-console-completeness/spec.md)  
**Status:** Ready for Execution 🚀

---

## 1. Objective

Deliver a comprehensive, categorized PBAC (Permission-Based Access Control) matrix across all 20 real permissions defined in `backend/src/config/constants.js`. Enforce strict non-optimistic updating (every toggle sends an API request and displays an active spinner until 200 OK), and conduct a full audit across all staff routes to ensure that unpermitted navigation items, tabs, and action buttons are completely omitted from the DOM via `<Can>` (never disabled or greyed out).

---

## 2. Target Files

- `frontend/src/pages/admin/StaffManagementPage.jsx`: Staff list and permission matrix editor.
- `frontend/src/components/admin/StaffPermissionMatrixModal.jsx`: Modal or drawer displaying categorized switches.
- `frontend/src/services/adminService.js`: Staff permission update endpoint (`POST /api/v1/admin/staff/:id/permissions`).
- `frontend/src/components/common/Can.jsx`: Dynamic permission check component.
- `frontend/src/components/staff/StaffSidebar.jsx`: Dynamic nav links filtering based on active permissions.

---

## 3. Tasks Breakdown

### Task 10.1: Categorize All 20 Real Permissions
Group the 20 backend constants into 5 intuitive operational domains:
1. **Bookings (`bookings:*`)**: `bookings:view`, `bookings:create`, `bookings:update`, `bookings:cancel`.
2. **Front Desk (`desk:*`)**: `desk:checkin`, `desk:checkout`, `desk:assign`.
3. **Payments & Financials (`payments:*`)**: `payments:view`, `payments:refund`.
4. **Rooms & Housekeeping (`rooms:*`, `housekeeping:*`)**: `rooms:view`, `rooms:create`, `rooms:update`, `rooms:delete`, `rooms:priceUpdate`, `housekeeping:view`, `housekeeping:update`.
5. **Staff, Reviews & Oversight (`staff:*`, `reviews:*`, `system:*`, `coupons:*`, `waitlist:*`)**: `staff:manage`, `reviews:manage`, `system:audit`, `coupons:manage`, `waitlist:manage`.

### Task 10.2: Build Non-Optimistic Permission Matrix Editor
- In `StaffManagementPage.jsx`, clicking "Manage Permissions" opens `StaffPermissionMatrixModal.jsx`.
- Render the 5 category cards with clean toggles (using MUI Switch styled in aqua `#3FD0C9`).
- Each toggle tracks its individual pending loading state:
  - When clicked: toggle shows inline circular spinner.
  - Local state does NOT flip immediately.
  - Dispatches `POST /api/v1/admin/staff/:id/permissions` with updated permissions array.
  - On 200 OK response: updates local state and plays subtle success pulse.
  - On error: displays error toast, leaves toggle in original state.
- "Select All Category" / "Deselect All Category" batch actions with batch loading feedback.

### Task 10.3: Deep DOM Omission Audit (`<Can>` Wrapper)
- Audit all staff views:
  - `StaffSidebar.jsx`: Nav items omitted completely if staff lacks the required permission.
  - Check-in/Check-out buttons: Omitted if lacking `desk:checkin` or `desk:checkout`.
  - Walk-in button: Omitted if lacking `bookings:create`.
  - Room edit/delete buttons: Omitted if lacking `rooms:update` or `rooms:delete`.
  - Audit logs & reviews nav: Omitted if lacking `system:audit` or `reviews:manage`.
  - Never render disabled grey buttons — omission is the single source of truth.

---

## 4. Verification & Acceptance Criteria
- [ ] Super-Admin can edit any staff member's permissions with live spinner feedback on each switch.
- [ ] Logging in as a staff member with limited permissions only shows their permitted navigation links and action buttons.
- [ ] No disabled or greyed-out action buttons remain; elements without permission are completely missing from the HTML DOM.
- [ ] `npm run build` exits 0 with zero lint/type errors.

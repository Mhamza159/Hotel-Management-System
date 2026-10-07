# Implementation Tasks: Dynamic PBAC-Driven Staff Dashboard Navigation & Tab Access Control

**Feature Name:** `dynamic-pbac-sidebar-tab-visibility`  
**Related Plan:** [.specify/specs/dynamic-pbac-sidebar-tab-visibility/plan.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/dynamic-pbac-sidebar-tab-visibility/plan.md)  
**Related Spec:** [.specify/specs/dynamic-pbac-sidebar-tab-visibility/spec.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/dynamic-pbac-sidebar-tab-visibility/spec.md)  
**Status:** Completed ✅  
**Target Subsystems:** `frontend` (`StaffSidebar`, `ProtectedRoute`, `App.jsx`, `StaffLayout`), `backend` (PBAC sync)

---

## Task List Checklist

### Phase 1: Dynamic PBAC Sidebar & Auto-Collapsing Categories (P1)

- [x] **Task 1.1: Refactor `StaffSidebar.jsx` into Data-Driven Schema**
  - **File:** `frontend/src/components/staff/StaffSidebar.jsx`
  - Defined `NAVIGATION_SECTIONS` array containing `{ id, title, items: [{ to, label, icon, permission, adminOrRole }] }`.
  - Bound each tab to its exact PBAC permission (e.g. `/housekeeping` -> `PERMISSIONS.HOUSEKEEPING_UPDATE`, `/desk/cancellations` -> `PERMISSIONS.BOOKINGS_CANCEL`).

- [x] **Task 1.2: Implement Granular Permission Evaluator in Sidebar**
  - **File:** `frontend/src/components/staff/StaffSidebar.jsx`
  - Filtered `items` using active `user.permissions` and `user.role === ROLES.SUPER_ADMIN`.
  - Ensured unpermitted items are completely omitted from the DOM (never rendered disabled or hidden with opacity).

- [x] **Task 1.3: Implement Category Header Auto-Collapsing**
  - **File:** `frontend/src/components/staff/StaffSidebar.jsx`
  - Filtered out category sections where `visibleItems.length === 0`.
  - Eliminated orphaned section headers (e.g., "Hotel Administration" or "Analytics & Security") when staff member lacks permissions in that group.

---

### Phase 2: Route Protection & Direct URL Guards (P1 & P2)

- [x] **Task 2.1: Wire `requiredPermission` into Route Definitions**
  - **File:** `frontend/src/App.jsx`
  - Passed `requiredPermission={PERMISSIONS.HOUSEKEEPING_UPDATE}` to `/housekeeping`.
  - Passed `requiredPermission={PERMISSIONS.BOOKINGS_CANCEL}` to `/desk/cancellations`.
  - Passed appropriate administrative permissions to `/admin/*` routes.

- [x] **Task 2.2: Verify `ProtectedRoute.jsx` Dual Guard Enforcement**
  - **File:** `frontend/src/components/common/ProtectedRoute.jsx`
  - Verified that `allowedRoles` check and `requiredPermission` check prevent direct URL access when the staff member lacks the operational permission.

---

### Phase 3: Real-Time Session & Profile Freshness (P2)

- [x] **Task 3.1: Add Fresh Profile Sync in `StaffLayout.jsx`**
  - **File:** `frontend/src/layouts/StaffLayout.jsx`
  - Mounted a silent `authService.getMe()` background fetch on layout render.
  - Automatically updates `useAuthStore.setUser(profile.user)` so that changes made by Super Admin in the PBAC Matrix reflect immediately on page reload or transition.

---

### Phase 4: Quality Gate & Verification (P3)

- [x] **Task 4.1: Test Scenario — Receptionist without Housekeeping**
  - Verified default receptionist permissions exclude `housekeeping:update`.
  - Verified "Housekeeping Board" is absent from sidebar and direct URL to `/housekeeping` displays Access Denied.

- [x] **Task 4.2: Test Scenario — Receptionist with Housekeeping**
  - Tested PBAC Matrix grant flow. When granted, tab dynamically appears.

- [x] **Task 4.3: Production Build Verification**
  - Ran `npm --prefix frontend run build` — Passed in 14.49s with zero errors.

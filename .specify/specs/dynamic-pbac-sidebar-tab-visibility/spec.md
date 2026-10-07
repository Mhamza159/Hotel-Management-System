# Feature Specification: Dynamic PBAC-Driven Staff Dashboard Navigation & Tab Access Control

**Feature Name:** `dynamic-pbac-sidebar-tab-visibility`  
**Status:** Draft / Ready for Plan 📋  
**Priority:** High (P1)  
**Author:** Antigravity AI  
**Scope:** Staff Navigation Cockpit (`StaffSidebar`), Route Protection (`ProtectedRoute`), and PBAC Permission Synchronization.

---

## 1. Executive Summary & Problem Statement

### 1.1 Problem Statement
Currently, staff roles (such as Receptionist or Housekeeping) may see sidebar tabs or route options (e.g. *Housekeeping Board*, *All Reservations*, etc.) regardless of whether the **Super Admin** has explicitly granted them that permission in the PBAC Permission Matrix. Furthermore:
1. If a staff member does not possess the operational permission for a specific module, the corresponding tab must be **completely removed from the DOM** (never rendered disabled or visible).
2. If all tabs in a sidebar category group (e.g. *Hotel Administration* or *Analytics & Security*) lack permission, the **category header itself must not render** (preventing orphaned section titles with empty spaces).
3. If Super Admin modifies a staff member's permissions in the PBAC Matrix, the updated permission state must be reflected reliably so revoked privileges immediately disappear.
4. Direct URL access (e.g. manually entering `/housekeeping`) must be synchronously blocked with a granular permission check, matching the sidebar visibility.

---

## 2. Core Architectural Principles

1. **Strict Zero-Trust UI (Anti-Template Rule):**
   - No tab, button, or link is rendered unless the active user's permissions array explicitly contains the mapped permission key, or the user is `super-admin`.
2. **Dynamic Section Auto-Collapsing:**
   - Sidebar section groups only render if at least one child navigation item is authorized.
3. **Dual-Layer Enforcement:**
   - **Layer 1 (Visual/Sidebar):** `<Can permission="...">` hides ungranted navigation tabs.
   - **Layer 2 (Route Guard):** `<ProtectedRoute requiredPermission="...">` blocks unauthorized direct URL access.
4. **Session Freshness:**
   - Staff permissions must be synchronized with backend authoritative state to prevent stale `localStorage` caching from showing revoked tabs.

---

## 3. Sidebar Tab to Permission Mapping Matrix

| Sidebar Tab Title | Route | Required PBAC Permission Key | Default Roles Allowed |
| :--- | :--- | :--- | :--- |
| **Arrivals & Departures** | `/desk` | `bookings:view` | `super-admin`, `receptionist` (if granted) |
| **Cancellations Queue** | `/desk/cancellations` | `bookings:cancel` | `super-admin`, `receptionist` (if granted) |
| **Housekeeping Board** | `/housekeeping` | `housekeeping:update` | `super-admin`, `housekeeping`, `receptionist` (only if granted) |
| **All Reservations** | `/admin/bookings` | `bookings:view` & `bookings:confirm` | `super-admin`, `receptionist` (only if granted) |
| **Room Inventory** | `/admin/rooms` | `rooms:view` | `super-admin` |
| **Staff & Roles** | `/admin/staff` | `staff:manage` | `super-admin` only |
| **PBAC Matrix** | `/admin/staff/pbac` | `staff:manage` | `super-admin` only |
| **Manager Analytics** | `/admin/analytics` | `analytics:view` | `super-admin` only |
| **Security Audit Log** | `/admin/audit-log` | `audit:view` | `super-admin` only |
| **AI Ops Copilot** | `/admin/copilot` | `staff:manage` | `super-admin` only |

---

## 4. Prioritized User Stories

### P1: Strict Permission-Based Tab Visibility
* **As a** Receptionist or Housekeeping staff member,  
* **I want** to see ONLY the navigation tabs for modules that Super Admin has granted me in the PBAC Matrix,  
* **So that** I am not confused by features I cannot use or exposed to unauthorized hotel operations.

### P1: Clean Auto-Collapsing Category Headers
* **As a** Staff member without administrative or analytics permissions,  
* **I want** category headers like "Hotel Administration" or "Analytics & Security" to completely disappear when I have no permissions in those sections,  
* **So that** my dashboard sidebar remains clean, uncluttered, and professional.

### P2: Direct URL Permission Guarding
* **As a** Super Admin,  
* **I want** staff members attempting to navigate directly via URL (e.g. `/housekeeping` or `/admin/rooms`) to be blocked if they lack the required permission,  
* **So that** URL tampering cannot bypass the sidebar restrictions.

### P2: Real-time Profile & Permission Sync
* **As a** Staff member whose permissions were just updated by Super Admin,  
* **I want** my sidebar to update without requiring manual clearing of browser storage,  
* **So that** permission changes take effect immediately upon page load or re-authentication.

---

## 5. Acceptance Criteria (Given / When / Then)

### Scenario 1: Receptionist without Housekeeping Permission
* **Given** a logged-in user with role `receptionist` and permissions lacking `housekeeping:update`
* **When** they view their Dashboard Sidebar
* **Then** the "Housekeeping Board" tab must NOT be visible in the DOM
* **And** navigating directly to `/housekeeping` must render "Restricted Action: You lack the required operational permission"

### Scenario 2: Super Admin Grants Housekeeping to Receptionist
* **Given** Super Admin enables `housekeeping:update` for a Receptionist in the PBAC Matrix (`/admin/staff/:id/pbac`)
* **When** the Receptionist logs in or refreshes their profile
* **Then** the "Housekeeping Board" tab becomes immediately visible under Front Desk
* **And** navigating to `/housekeeping` grants full access to update room cleanliness

### Scenario 3: Staff Member with Zero Administration Permissions
* **Given** a Receptionist who has no `staff:manage`, `rooms:view`, or `rooms:create` permissions
* **When** they look at the sidebar
* **Then** the section header "Hotel Administration" must be completely hidden (not an empty box)

### Scenario 4: Super Admin Universal Bypass
* **Given** a user logged in with role `super-admin`
* **When** they view the sidebar or any route
* **Then** all tabs and sections are fully visible and accessible regardless of individual permission toggles

---

## 6. Functional Requirements Checklist

1. **`StaffSidebar.jsx`**:
   - Refactor navigation groups into data-driven section arrays with mapped `permission` or `permissions`.
   - Filter items dynamically against `useAuthStore.getState().user.permissions`.
   - Omit category headers if `visibleItems.length === 0`.
2. **`App.jsx`**:
   - Update `<ProtectedRoute>` on staff routes to pass `requiredPermission={PERMISSIONS....}` alongside `allowedRoles`.
3. **Session Freshness / Sync**:
   - In `StaffLayout` or `App.jsx`, call `authService.getMe()` periodically or on route transitions so permission updates made by Super Admin reflect promptly.

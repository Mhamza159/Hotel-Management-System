# Technical Architecture Plan: Dynamic PBAC-Driven Staff Dashboard Navigation & Tab Access Control

**Feature Name:** `dynamic-pbac-sidebar-tab-visibility`  
**Related Spec:** [.specify/specs/dynamic-pbac-sidebar-tab-visibility/spec.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/dynamic-pbac-sidebar-tab-visibility/spec.md)  
**Status:** Architecture Blueprint (Draft / Ready for Tasks)  
**Priority:** High (P1)  
**Target Subsystems:**
- `frontend` (React + Vite: `StaffSidebar`, `ProtectedRoute`, `App.jsx`, `StaffLayout`, `useAuthStore`)
- `backend` (Express / MongoDB: `auth.controller.js`, `admin.controller.js`, PBAC Verification)

---

## 1. System Architecture Overview

```mermaid
flowchart TD
    subgraph SuperAdminActions [Super Admin PBAC Console]
        SA[Super Admin opens /admin/staff/pbac] --> TOGGLE[Toggle Permission Switch<br/>e.g., housekeeping:update OFF for Receptionist]
        TOGGLE --> API_UPDATE[PUT /api/v1/admin/staff/:id/permissions]
        API_UPDATE --> DB[(MongoDB: User.permissions Updated)]
    end

    subgraph StaffClientSession [Staff Browser Session]
        APP_MOUNT[Staff Logs In or Mounts Dashboard] --> FETCH_ME[GET /api/v1/auth/me]
        FETCH_ME --> STORE[useAuthStore.setUser(freshUser)]
        
        STORE --> SIDEBAR[StaffSidebar Component]
        SIDEBAR --> EVAL{Check PBAC Permission per Tab}
        
        EVAL -- Granted --> SHOW_TAB[Render NavLink in DOM]
        EVAL -- Not Granted --> HIDE_TAB[Completely Remove from DOM]
        
        SIDEBAR --> GRP_EVAL{Are any items in section visible?}
        GRP_EVAL -- Yes --> RENDER_HDR[Render Section Header]
        GRP_EVAL -- No (0 visible items) --> COLLAPSE_HDR[Auto-Collapse Section Header]

        URL_INPUT[Staff attempts direct URL /housekeeping] --> PROT_ROUTE[ProtectedRoute Guard]
        PROT_ROUTE --> CHECK_PERM{User has housekeeping:update OR is Super-Admin?}
        CHECK_PERM -- Yes --> ALLOW[Render Page Component]
        CHECK_PERM -- No --> DENY[Render Access Denied Modal]
    end
```

---

## 2. Frontend Component Blueprints & Data Structures

### 2.1 Data-Driven Navigation Schema (`StaffSidebar.jsx`)

Instead of hardcoding JSX blocks with manual `<Can>` wrappers, navigation items will be structured as an array of categories, each containing child route definitions mapped to explicit PBAC permission keys:

```javascript
const NAVIGATION_SECTIONS = [
  {
    id: 'front-desk',
    title: 'Front Desk',
    items: [
      {
        to: '/desk',
        label: 'Arrivals & Departures',
        icon: ConciergeBell,
        end: true,
        permission: PERMISSIONS.BOOKINGS_VIEW,
      },
      {
        to: '/desk/cancellations',
        label: 'Cancellations Queue',
        icon: Clock,
        permission: PERMISSIONS.BOOKINGS_CANCEL,
      },
      {
        to: '/housekeeping',
        label: 'Housekeeping Board',
        icon: Sparkles,
        permission: PERMISSIONS.HOUSEKEEPING_UPDATE,
      },
    ],
  },
  {
    id: 'administration',
    title: 'Hotel Administration',
    items: [
      {
        to: '/admin/bookings',
        label: 'All Reservations',
        icon: CalendarCheck,
        permission: PERMISSIONS.BOOKINGS_VIEW,
        adminOrRole: [ROLES.SUPER_ADMIN], // Only admins or permitted staff
      },
      {
        to: '/admin/rooms',
        label: 'Room Inventory',
        icon: BedDouble,
        permission: PERMISSIONS.ROOMS_VIEW,
      },
      {
        to: '/admin/staff',
        label: 'Staff & Roles',
        icon: Users,
        permission: PERMISSIONS.STAFF_MANAGE,
      },
    ],
  },
  {
    id: 'intelligence',
    title: 'Analytics & Security',
    items: [
      {
        to: '/admin/analytics',
        label: 'Manager Analytics',
        icon: BarChart3,
        permission: PERMISSIONS.ANALYTICS_VIEW,
      },
      {
        to: '/admin/audit-log',
        label: 'Security Audit Log',
        icon: ShieldAlert,
        permission: PERMISSIONS.AUDIT_VIEW,
      },
      {
        to: '/admin/copilot',
        label: 'AI Ops Copilot',
        icon: Sparkles,
        permission: PERMISSIONS.STAFF_MANAGE,
      },
    ],
  },
];
```

### 2.2 Category Header Auto-Collapsing Logic

```javascript
// Filter visible sections dynamically
const visibleSections = NAVIGATION_SECTIONS.map((section) => {
  const visibleItems = section.items.filter((item) => {
    // 1. Super-Admin bypasses all permission checks
    if (user?.role === ROLES.SUPER_ADMIN) return true;
    
    // 2. Specific role constraint if declared
    if (item.adminOrRole && !item.adminOrRole.includes(user?.role)) {
      return false;
    }
    
    // 3. PBAC Permission verification
    const userPerms = Array.isArray(user?.permissions) ? user.permissions : [];
    return userPerms.includes(item.permission);
  });

  return {
    ...section,
    items: visibleItems,
  };
}).filter((section) => section.items.length > 0); // Hide section if 0 items
```

---

## 3. Route Security Synchronization (`App.jsx`)

Synchronize the route definitions with explicit `requiredPermission` properties in `App.jsx` so that direct URL access is checked at the router level:

```jsx
{/* Housekeeping Board: Requires housekeeping:update */}
<Route
  path="/housekeeping"
  element={
    <ProtectedRoute
      allowedRoles={[ROLES.HOUSEKEEPING, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST]}
      requiredPermission={PERMISSIONS.HOUSEKEEPING_UPDATE}
    >
      <StaffLayout title="Housekeeping Operations Board">
        <HousekeepingBoardPage />
      </StaffLayout>
    </ProtectedRoute>
  }
/>

{/* Cancellations Queue: Requires bookings:cancel */}
<Route
  path="/desk/cancellations"
  element={
    <ProtectedRoute
      allowedRoles={[ROLES.RECEPTIONIST, ROLES.SUPER_ADMIN]}
      requiredPermission={PERMISSIONS.BOOKINGS_CANCEL}
    >
      <StaffLayout title="Cancellation Audit & Refunds">
        <DeskCancellationsPage />
      </StaffLayout>
    </ProtectedRoute>
  }
/>
```

---

## 4. Session Freshness Synchronization (`StaffLayout.jsx`)

To ensure that permission changes made by the Super Admin in the PBAC Matrix reflect immediately for staff without forcing them to manually clear `localStorage`:

1. In `StaffLayout.jsx`, implement a silent background `authService.getMe()` call on component mount:
   ```javascript
   useEffect(() => {
     const syncPermissions = async () => {
       try {
         const profile = await authService.getMe();
         if (profile?.user) {
           useAuthStore.getState().setUser(profile.user);
         }
       } catch (err) {
         // Token expired or network error handled by axios interceptor
       }
     };
     syncPermissions();
   }, []);
   ```
2. When the user object updates in `useAuthStore`, `StaffSidebar` instantly re-renders and re-evaluates `visibleSections`.

---

## 5. Implementation Strategy & Work Packages

| Package | Files Affected | Changes |
| :--- | :--- | :--- |
| **WP1: Data-Driven Sidebar & Auto-Collapse** | `frontend/src/components/staff/StaffSidebar.jsx` | Implement `NAVIGATION_SECTIONS` array, dynamic PBAC filter, and zero-item header auto-collapse. |
| **WP2: Route Protection Sync** | `frontend/src/App.jsx` | Add `requiredPermission` to `/housekeeping`, `/desk/cancellations`, and admin subroutes. |
| **WP3: Profile Freshness Sync** | `frontend/src/layouts/StaffLayout.jsx` | Add silent `getMe()` synchronization on layout mount. |
| **WP4: Verification & Build** | Full workspace | Test with receptionists with and without `housekeeping:update` and verify production build. |

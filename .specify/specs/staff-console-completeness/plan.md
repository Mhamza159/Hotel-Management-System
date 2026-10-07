# Technical Architecture Plan: Complete Super-Admin & Receptionist UI (Full Codebase Audit & Build)

**Feature Name:** `staff-console-completeness`  
**Related Spec:** [.specify/specs/staff-console-completeness/spec.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/staff-console-completeness/spec.md)  
**Status:** Architecture Blueprint (Approved & Ready for Tasks)  
**Portal Scope:** Staff & Management Cockpit (`/admin/*`, `/desk/*`) — Enforcing granular PBAC for Super-Admin and Receptionist roles with custom MUI Dark Theme (`navy/gold/aqua`).  
**Target Subsystems:**
- `backend` (Express / MongoDB Controllers & Services: Auth, Rooms, Desk, Admin, Analytics, Chat, Engagement)
- `frontend` (React 18 / Vite / MUI / Tailwind: Staff Layout, Staff Sidebar, Desk Dashboard, Admin Rooms & Reviews, Staff PBAC Matrix, Global Bookings DataGrid, AI Copilot, Command Palette)

---

## 1. System Architecture & Component Interaction Flow

```mermaid
flowchart TD
    subgraph UI_Shell [Staff Operations Shell - MUI Navy/Gold/Aqua]
        SB[StaffSidebar<br/>Dynamic PBAC Gating]
        SH[StaffHeader & ⌘K Palette]
        AUTH[useAuthStore<br/>User + Permissions]
        AUTH -->|can(user, perm)| SB
        AUTH -->|can(user, perm)| SH
    end

    subgraph Front_Desk [Front Desk Console /desk]
        FD_ARR[Arrivals Tab]
        FD_DEP[Departures Tab]
        FD_INH[In-House Tab]
        
        FD_ALLOT[Allot Rooms Dialog<br/>gated: checkin:manage]
        FD_PAY[Record Payment Dialog<br/>gated: payments:recordCash/Card]
        FD_IN[Check-In Execution<br/>gated: checkin:manage]
        FD_OUT[Check-Out Execution<br/>gated: checkout:manage]
        
        FD_ARR --> FD_ALLOT --> FD_PAY --> FD_IN
        FD_DEP --> FD_OUT
    end

    subgraph Super_Admin [Super-Admin Management /admin/*]
        ADM_ROOMS[Admin Rooms Page<br/>gated: rooms:view]
        ADM_REV[Room Reviews Moderation Tab<br/>DELETE /reviews/:id]
        ADM_IMG[Cloudinary Photo Gallery<br/>Upload 5 max / Delete by publicId]
        
        ADM_PBAC[Staff PBAC Matrix<br/>Unified Role + Perm Draft State]
        ADM_CONFIRM[PbacConfirmModal<br/>Diff & Atomic PATCH]
        
        ADM_BK[Global Bookings DataGrid<br/>fromDate / toDate / search / status]
        ADM_COPILOT[AI Ops Copilot<br/>Two-Phase Mutation Challenge]
        
        ADM_ROOMS --> ADM_REV
        ADM_ROOMS --> ADM_IMG
        ADM_PBAC --> ADM_CONFIRM
    end

    subgraph Backend_APIs [Authoritative Backend APIs]
        BE_CHECKIN[PATCH /desk/bookings/:id/check-in<br/>Validates clean room & payment]
        BE_CHECKOUT[PATCH /desk/bookings/:id/check-out<br/>Auto-flips room to dirty]
        BE_PAY[POST /desk/bookings/:id/payments<br/>Cash / Offline Card Ledger]
        BE_DEL_ROOM[DELETE /rooms/:id<br/>Soft-delete with Active Bookings Guard]
        BE_REV_DEL[DELETE /reviews/:id<br/>Owner or Super-Admin purge]
        BE_PBAC[PATCH /auth/users/:id/permissions<br/>Accepts { role, permissions }]
        BE_COPILOT_CONFIRM[POST /chat/admin/confirm<br/>Executes signed confirmationToken]
    end

    FD_IN --> BE_CHECKIN
    FD_OUT --> BE_CHECKOUT
    FD_PAY --> BE_PAY
    ADM_ROOMS --> BE_DEL_ROOM
    ADM_REV --> BE_REV_DEL
    ADM_CONFIRM --> BE_PBAC
    ADM_COPILOT --> BE_COPILOT_CONFIRM
```

---

## 2. Granular API Route Specifications & Behavioral Contracts

### 2.1 Staff & Permissions: Unified Role + Permission Mutation
- **Endpoint:** `PATCH /api/v1/auth/users/:id/permissions`
- **Controller:** `AuthController.updateUserPermissions`
- **Request Body Contract:**
  ```json
  {
    "role": "receptionist",
    "permissions": [
      "bookings:view",
      "bookings:confirm",
      "bookings:cancel",
      "checkin:manage",
      "checkout:manage",
      "payments:recordCash",
      "payments:recordCard",
      "waitlist:manage"
    ]
  }
  ```
- **Behavioral Contract:**
  - The UI must **not** fire premature network requests when switching the role dropdown.
  - The role selection and permission toggles update a single local draft state: `{ draftRole, draftPermissions }`.
  - The visual diff calculator compares `{ draftRole, draftPermissions }` against `{ originalRole, originalPermissions }`.
  - `PbacConfirmModal` presents both the role transition (e.g. `housekeeping -> receptionist`) and the specific permission additions/revocations.
  - Upon user confirmation, a single atomic `PATCH` is dispatched. If modified user is the active logged-in user, `useAuthStore.getState().updateUser(updatedUser)` is synchronized immediately.

---

### 2.2 Room Inventory & Deletion Safeguard
- **Endpoint:** `DELETE /api/v1/rooms/:id`
- **Controller:** `RoomController.deleteRoom`
- **Rejection Contract (HTTP 400 Bad Request):**
  - When a room has future confirmed or checked-in reservations:
  ```json
  {
    "success": false,
    "statusCode": 400,
    "message": "Cannot delete room '101'. It has 2 upcoming active reservation(s). Please reassign or cancel those bookings first."
  }
  ```
- **UI Error Handling:**
  - `AdminRoomsPage` must catch `err.response?.data?.message` and render this exact message in an alert banner.
  - The room card must remain in the UI without disappearance.

---

### 2.3 Room Reviews Moderation (In-Room Reviews Tab)
- **Endpoint 1 (List per-room reviews):** `GET /api/v1/rooms/:id/reviews?page=1&limit=20`
- **Endpoint 2 (Purge specific review):** `DELETE /api/v1/reviews/:id`
- **Controller:** `EngagementController.deleteReview`
- **Authorization:** Authenticated user who is review owner OR `super-admin`.
- **UI Implementation:**
  - In `AdminRoomsPage`, each room card has a "Reviews" button (with star icon) that opens a dedicated dialog.
  - Dialog fetches reviews via `engagementService.getRoomReviews(roomId)` or `api.get('/rooms/:id/reviews')`.
  - Every review row displays guest name, star rating, comment, timestamp, and a red "Delete Review" button with confirmation.
  - Deletion calls `api.delete('/reviews/:id')` and removes the row from the dialog without page refresh.

---

### 2.4 Front Desk Check-In & Check-Out Independent PBAC
- **Independent PBAC Authority:**
  - `canCheckIn`: `user.role === 'super-admin' || user.permissions.includes('checkin:manage')`
  - `canCheckOut`: `user.role === 'super-admin' || user.permissions.includes('checkout:manage')`
  - `canRecordPayment`: `user.role === 'super-admin' || user.permissions.includes('payments:recordCash') || user.permissions.includes('payments:recordCard')`
- **Check-In Validation Enforcement:**
  - If room cleanliness is `dirty`, `cleaning`, or `maintenance`, the backend returns HTTP 400: `Cannot check in to dirty room`.
  - The UI must intercept this error and show an explicit actionable alert: *"Room #102 is currently dirty. Housekeeping must certify the room as clean before check-in can proceed."*
- **Check-Out Immediate Live Reflection:**
  - Upon successful `checkOut(id)` API response:
    1. Display success alert.
    2. Re-trigger `fetchBookings()` and `fetchMetrics()`.
    3. The room's housekeeping status flips to `dirty` automatically server-side. The assigned room chip immediately reflects `dirty` in red/blush styling without requiring a browser reload.

---

### 2.5 Global Bookings DataGrid Advanced Date Filtering
- **Endpoint:** `GET /api/v1/admin/bookings`
- **Supported Query Parameters:**
  - `page`: Integer (1-indexed)
  - `limit`: Integer (10 to 100)
  - `status`: Enum (`confirmed`, `checked-in`, `checked-out`, `cancelled`, etc.)
  - `paymentStatus`: Enum (`pending`, `partially-paid`, `completed`, `refunded`)
  - `fromDate`: ISO Date string (`YYYY-MM-DD`)
  - `toDate`: ISO Date string (`YYYY-MM-DD`)
  - `search`: Keyword matching booking reference or guest name, email, phone
- **UI Component Update (`AdminBookingsPage.jsx`):**
  - Add `fromDate` and `toDate` input controls in the filter header bar.
  - Pass `fromDate` and `toDate` into `adminService.getAllBookings(params)`.
  - Reset pagination to page 0 when filters change.

---

### 2.6 AI Ops Copilot Two-Phase Dry-Run Execution Gate
- **Step 1 (Dry-Run Chat Query):** `POST /api/v1/chat/admin` with `{ message }` or `{ toolCallName, toolCallArgs }`.
- **Step 2 (High-Impact Mutation Return):**
  - If action alters reservations or state, backend returns:
  ```json
  {
    "response": "Cancellation prepared. Confirmation required.",
    "toolResult": {
      "requiresConfirmation": true,
      "pendingAction": {
        "action": "cancelBooking",
        "bookingReference": "GRH-123456",
        "confirmationToken": "<signed-jwt-token>"
      }
    }
  }
  ```
- **Step 3 (Confirmation Modal):**
  - `AdminCopilotPage` intercepts `requiresConfirmation` and opens `ConfirmationActionModal`.
  - Modal displays the target reference and explains the database impact.
  - Clicking "Confirm & Execute" calls `POST /api/v1/chat/admin/confirm` with `{ confirmationToken }`.
  - Zero execution occurs if user cancels or closes modal.

---

## 3. Frontend Component Architecture & File Modification Plan

### File 1: `frontend/src/components/staff/StaffSidebar.jsx`
- **Changes:**
  1. Fix branding header from "Harborlight Hotel" to "Grand Horizon Hotel".
  2. Enforce dynamic PBAC: compute navigation items strictly from `user.role === 'super-admin' || user.permissions.includes(item.permission)`.
  3. Ensure that if all items in a section are unpermitted, the section title is omitted completely from the DOM.
  4. Ensure all links point to real implemented routes:
     - Front Desk: `/desk` (`bookings:view`), `/desk/walk-in` (`bookings:create`), `/desk/cancellations` (`bookings:cancel`), `/housekeeping` (`housekeeping:update`).
     - Administration: `/admin/bookings` (`bookings:view`), `/admin/rooms` (`rooms:view`), `/admin/staff` (`staff:manage`), `/admin/staff/pbac` (`staff:manage`).
     - Intelligence: `/admin/analytics` (`analytics:view`), `/admin/audit-log` (`audit:view`), `/admin/copilot` (`staff:manage`).

---

### File 2: `frontend/src/pages/desk/DeskDashboardPage.jsx`
- **Changes:**
  1. Import `can` from `../../components/common/Can`.
  2. Define separate permission flags:
     ```javascript
     const canCheckIn = can(user, PERMISSIONS.CHECKIN_MANAGE);
     const canCheckOut = can(user, PERMISSIONS.CHECKOUT_MANAGE);
     const canRecordPayment = can(user, PERMISSIONS.PAYMENTS_RECORD_CASH) || can(user, PERMISSIONS.PAYMENTS_RECORD_CARD);
     ```
  3. In the Actions column:
     - Wrap Allot Rooms & Check In buttons with `canCheckIn`. If not permitted, render `null` (not disabled).
     - Wrap Check Out button with `canCheckOut`. If not permitted, render `null`.
     - Wrap Record Payment button with `canRecordPayment`. If not permitted, render `null`.
  4. Intercept check-in failure error message (`err?.response?.data?.message`) and render explicit warning if room is dirty.
  5. In `handleCheckOutSuccess`, immediately trigger re-fetching of bookings and metrics so room status updates to `dirty` live in the table.

---

### File 3: `frontend/src/pages/admin/AdminRoomsPage.jsx`
- **Changes:**
  1. Add "Reviews Moderation" tab/dialog for physical rooms:
     - Add a "Reviews" button on each room card.
     - Open modal loading `GET /rooms/:id/reviews`.
     - Render star ratings, guest comment, and a Super-Admin "Delete Review" button calling `DELETE /reviews/:id`.
  2. In `handleDeleteRoom`:
     - Catch `err?.response?.data?.message` and surface the exact server message ("Cannot delete room... upcoming active reservations").
  3. Verify Cloudinary photo gallery management:
     - Ensure image upload (up to 5) and deletion by `publicId` are fully operational.

---

### File 4: `frontend/src/pages/admin/StaffPbacMatrixPage.jsx`
- **Changes:**
  1. Refactor role change handler:
     - Moving role dropdown updates `draftRole` instead of making an instant isolated server call.
     - Keep `draftPermissions` synchronized or suggest default template while allowing custom toggle overrides.
  2. Update `hasUnsavedChanges` to check both:
     ```javascript
     const hasUnsavedChanges = draftRole !== selectedStaff.role || !isEqual(draftPermissions, selectedStaff.permissions);
     ```
  3. In `PbacConfirmModal`, render role diff if `draftRole !== selectedStaff.role`.
  4. In `handleConfirmSave`, send both in the single atomic call:
     ```javascript
     await staffService.updatePermissions(selectedStaff._id, {
       role: draftRole,
       permissions: draftPermissions,
     });
     ```

---

### File 5: `frontend/src/pages/admin/AdminBookingsPage.jsx`
- **Changes:**
  1. Add `fromDate` and `toDate` date picker input fields to the filter toolbar.
  2. Pass `fromDate` and `toDate` to `adminService.getAllBookings({ page, limit, status, paymentStatus, fromDate, toDate, search })`.
  3. Add clear filters button to reset all filters to default state.

---

### File 6: `frontend/src/components/common/CommandPalette.jsx`
- **Changes:**
  1. Update `ALL_COMMANDS` array to associate each command with a required PBAC permission (`cmd.permission`).
  2. Filter commands using:
     ```javascript
     const isAllowed = !cmd.permission || can(user, cmd.permission);
     ```
  3. Ensure Receptionists with delegated permissions can access Rooms, Staff, Analytics, etc., via keyboard shortcut ⌘K / Ctrl+K.

---

### File 7: `frontend/src/components/common/BookingStatusBadge.jsx`
- **Changes:**
  1. Verify all 7 booking states: `pending`, `confirmed`, `checked-in`, `checked-out`, `cancellation-requested`, `cancelled`, `completed`.
  2. Provide responsive style mappings that render cleanly in both dark console and light surfaces.

---

## 4. Verification & Testing Strategy

1. **Compilation Check:** Run `npm run build` in `frontend` to verify 0 build errors.
2. **Permission Invisibility Verification:**
   - Log in as Receptionist (default permissions: no `rooms:view`, no `staff:manage`, no `analytics:view`).
   - Confirm sidebar and command palette do NOT render Room Inventory, Staff Directory, or Manager Analytics.
   - Confirm Front Desk table only renders permitted action buttons.
3. **Delegation Flow Verification:**
   - Log in as Super-Admin. Open `/admin/staff/pbac`.
   - Change a Housekeeping staff user's role to Receptionist and grant `rooms:view`.
   - Confirm single atomic PATCH updates both role and permissions.
   - Verify that upon logging in as that user (or live syncing), the Room Inventory tab immediately appears.
4. **Room Deletion Safeguard Verification:**
   - Attempt to delete a room with an upcoming reservation. Confirm exact rejection message is displayed.
5. **Review Moderation Verification:**
   - Open Room Reviews tab as Super-Admin and delete a review. Confirm review disappears.

# Feature Specification: PBAC Permission Matrix Batch Save with Confirmation Modal & Loader

**Feature Name:** `pbac-matrix-batch-save-modal`  
**Status:** Draft / Ready for Plan 📋  
**Priority:** High (P1)  
**Author:** Antigravity AI  
**Scope:** Staff Administration (`StaffPbacMatrixPage.jsx`), Staff Service (`staff.service.js`), and PBAC Access Synchronization.

---

## 1. Executive Summary & Problem Statement

### 1.1 Problem Statement
Currently, in the PBAC Permission Matrix (`/admin/staff/pbac` or `/admin/staff/:id/pbac`), every toggle switch for a permission immediately triggers an individual, immediate backend HTTP `PATCH` request (`/api/v1/auth/users/:id/permissions`).
This architecture has significant operational flaws:
1. **Network Chatter & Race Conditions:** Toggling 5 permissions rapidly fires 5 asynchronous parallel HTTP requests, causing race conditions in MongoDB where earlier requests may overwrite subsequent requests.
2. **Accidental Privilege Grants:** A misclick immediately grants or revokes live system permissions without any confirmation or review step.
3. **Lack of Transactional Review:** Super Admin cannot inspect all proposed changes across categories (Reservations, Front Desk, Payments, Room Inventory, Managerial Intelligence) before committing them.
4. **Missing Confirmation Modal & Save Feedback:** There is no dedicated "Save Changes" button, no confirmation dialog previewing additions/removals, and no batch-processing loader state.

### 1.2 Proposed Solution
Transform the PBAC Matrix from single-switch eager auto-saving to a **Batch Draft & Explicit Commit** workflow:
1. **Local Draft State:** Toggling switches updates a local in-memory set (`draftPermissions`) without firing immediate API calls.
2. **Unsaved Changes Bar & Sticky Save Button:** A prominent action bar appears at the bottom/top showing the number of modified permissions with an "Unsaved Changes" indicator, "Discard", and "Save Permissions" button.
3. **Confirmation Modal (`PbacConfirmModal`):** Clicking "Save Permissions" opens a dialog displaying:
   - Target Staff Member name, email, and role.
   - Diff preview: Added permissions (green tags) and Removed permissions (red tags).
   - Authoritative warning regarding security implications.
4. **Atomic Batch Commit with Loader:** Clicking "Confirm & Apply" triggers the single atomic update API call with an active loading spinner, gracefully handles success/failure, and synchronizes the staff directory state.

---

## 2. Core Architectural Principles & Zero-Bloat Rules

1. **Atomic Batch Mutation (YAGNI & Shortest Diff):**
   - Use the existing backend endpoint `PATCH /api/v1/auth/users/:id/permissions` which already accepts `{ role, permissions }`. Zero backend route or database schema modifications needed.
2. **Clean State Diffing:**
   - Derive dirty state by comparing `draftPermissions` with `selectedStaff.permissions` (Set difference: added vs removed).
   - If `added.length === 0 && removed.length === 0`, Save button is disabled.
3. **Dual Theme Accessibility (Light & Dark):**
   - The confirmation modal and sticky action bar must strictly adhere to the newly implemented luxury Light and Dark design tokens (`bg-surface`, `border-border`, `text-text`, `bg-ink`).
4. **Fail-Safe Discard:**
   - Provide a "Discard Changes" action that reverts `draftPermissions` back to the saved database state without page reloading.

---

## 3. Prioritized User Stories

### P1: In-Memory Draft Permission Toggling
* **As a** Super Admin,  
* **I want** to toggle multiple permissions across different categories without the screen freezing or firing multiple API requests,  
* **So that** I can configure a staff member's complete access profile smoothly.

### P1: Sticky Save Action Bar with Unsaved Changes Indicator
* **As a** Super Admin,  
* **I want** to see a clear "Save Permissions" button and a count of unsaved changes at the bottom of the PBAC Matrix,  
* **So that** I know exactly when changes are pending and have not yet been applied to the live system.

### P1: Security Confirmation Modal
* **As a** Super Admin,  
* **I want** a confirmation modal to pop up when I click Save, showing exactly which permissions are being added and removed,  
* **So that** I don't accidentally grant dangerous privileges (e.g. `payments:refund` or `staff:manage`) by mistake.

### P2: Loading State & Transactional Feedback
* **As a** Super Admin,  
* **I want** to see an animated loader while the batch update is saving and receive a clear success notification once complete,  
* **So that** I have full confidence that the permissions have been committed to MongoDB.

### P2: Discard / Reset Draft
* **As a** Super Admin,  
* **I want** the ability to discard my draft toggles and return to the user's current saved permissions,  
* **So that** I can easily cancel unwanted modifications.

---

## 4. Acceptance Criteria (Given / When / Then)

### Scenario 1: Toggling Permissions Updates Local Draft Only
* **Given** Super Admin is on `/admin/staff/:id/pbac` for Receptionist "John Doe"
* **When** Super Admin switches ON `rooms:view` and switches OFF `bookings:cancel`
* **Then** NO network request is dispatched to `/api/v1/auth/users/:id/permissions`
* **And** the sticky Save Bar appears displaying "2 unsaved permission changes"
* **And** the "Save Permissions" button becomes active and highlighted

### Scenario 2: Opening Confirmation Modal
* **Given** Super Admin has pending changes in the PBAC Matrix
* **When** Super Admin clicks the "Save Permissions" button
* **Then** the Confirmation Modal opens
* **And** the modal displays:
  - Added permissions in green pill badges (`+ rooms:view`)
  - Revoked permissions in red pill badges (`- bookings:cancel`)
  - "Confirm & Save" and "Cancel" buttons

### Scenario 3: Confirming Save with Loader & State Update
* **Given** the Confirmation Modal is open
* **When** Super Admin clicks "Confirm & Save"
* **Then** a loading spinner is displayed inside the button (with disabled interaction)
* **And** a single `PATCH` request is sent to `/api/v1/auth/users/:id/permissions` with `{ role, permissions: draftPermissions }`
* **And** on success (HTTP 200), the modal closes, a success alert is shown, and `selectedStaff.permissions` is updated to match the new state
* **And** the Save Bar disappears since there are no remaining unsaved changes

### Scenario 4: Discarding Unsaved Changes
* **Given** Super Admin has toggled 3 permissions in draft
* **When** Super Admin clicks "Discard Changes"
* **Then** all switches immediately revert back to the saved state in database
* **And** the Save Bar returns to hidden/idle state

---

## 5. UI/UX & Component Blueprint

```
+-----------------------------------------------------------------------------------+
| PBAC Permission Matrix: Receptionist (John Doe)                                   |
| +-------------------------------------------------------------------------------+ |
| | [Reservations & Bookings]           [Front Desk & Cleanliness]                 | |
| | View All Bookings           [ON]    Guest Check-In                     [ON]   | |
| | Audit Cancellations        [OFF*]   Housekeeping Cleanliness Board    [ON*]   | |
| |                                                                               | |
| | [Physical Room Inventory]                                                     | |
| | View Room Inventory         [ON*]   Define New Rooms                  [OFF]   | |
| +-------------------------------------------------------------------------------+ |
|                                                                                   |
| [STICKY SAVE BAR AT BOTTOM OF VIEWPORT]                                           |
| +-------------------------------------------------------------------------------+ |
| | ⚠️ 3 Unsaved Permission Changes | [Discard]          [ Save Permissions (3) ] | |
| +-------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------+
                                        | (Click Save)
                                        v
+-----------------------------------------------------------------------------------+
| CONFIRMATION MODAL                                                                |
| +-------------------------------------------------------------------------------+ |
| | Review Permission Updates for John Doe (receptionist)                         | |
| |                                                                               | |
| | Newly Granted Permissions (+2):                                               | |
| |   [+ rooms:view]  [+ housekeeping:update]                                     | |
| |                                                                               | |
| | Revoked Permissions (-1):                                                     | |
| |   [- bookings:cancel]                                                         | |
| |                                                                               | |
| | [Cancel]                                        [Confirm & Apply Permissions] | |
| +-------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------+
```

---

## 6. Functional Requirements & Implementation Checklist

1. **State Management (`StaffPbacMatrixPage.jsx`):**
   - Add `draftPermissions` (array/set) initialized from `selectedStaff.permissions`.
   - Update `handleTogglePermission` to mutate `draftPermissions` locally without triggering `staffService.updatePermissions`.
   - Compute `hasUnsavedChanges`, `addedPermissions`, and `removedPermissions` using `useMemo`.
2. **Sticky Action Bar:**
   - Mount sticky or fixed bottom footer bar displaying change summary, Discard button, and Save button.
3. **Confirmation Modal (`PbacSaveModal`):**
   - Modal with clean Material UI / Tailwind styling compatible with Light/Dark mode tokens.
   - Renders badge lists for added vs removed permissions with clear explanations.
4. **Async Execution & Loader:**
   - Submit handler with `isSaving` state, circular progress loader, and error recovery.
   - Synchronize with `staffList` and `selectedStaff` on successful commit.

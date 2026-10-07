# Technical Architecture Plan: PBAC Permission Matrix Batch Save with Confirmation Modal & Loader

**Feature Name:** `pbac-matrix-batch-save-modal`  
**Related Spec:** [.specify/specs/pbac-matrix-batch-save-modal/spec.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/pbac-matrix-batch-save-modal/spec.md)  
**Status:** Architecture Blueprint (Draft / Ready for Tasks)  
**Priority:** High (P1)  
**Target Subsystems:**
- `frontend` (React + Vite + Material UI: `StaffPbacMatrixPage.jsx`, `PbacConfirmModal.jsx`, `staff.service.js`, `useAuthStore`)
- `backend` (Express / MongoDB: `/api/v1/auth/users/:id/permissions` - existing endpoint reuse, zero backend changes required)

---

## 1. System Architecture Overview

```mermaid
flowchart TD
    subgraph UI_State [StaffPbacMatrixPage Local State]
        LOAD[Select Staff Member] --> INIT[Initialize draftPermissions = selectedStaff.permissions]
        TOGGLE[User Toggles Permission Switch] --> MUTATE_DRAFT[Update draftPermissions in-memory]
        MUTATE_DRAFT --> DIFF_CALC[Calculate added vs removed permissions diff]
        
        DIFF_CALC --> HAS_CHANGES{hasUnsavedChanges == true?}
        HAS_CHANGES -- Yes --> SHOW_BAR[Render Sticky Save Action Bar at bottom]
        HAS_CHANGES -- No --> HIDE_BAR[Hide Sticky Save Bar]
        
        SHOW_BAR --> CLICK_DISCARD[Click Discard Changes] --> REVERT[Reset draftPermissions to selectedStaff.permissions]
        SHOW_BAR --> CLICK_SAVE[Click Save Permissions Button] --> OPEN_MODAL[Open PbacConfirmModal Dialog]
    end

    subgraph Modal_Execution [PbacConfirmModal & API Execution]
        OPEN_MODAL --> REVIEW[Review Added Green Badges & Removed Red Badges]
        REVIEW --> CANCEL[Click Cancel] --> CLOSE_MODAL[Close Dialog, keep draft intact]
        REVIEW --> CONFIRM[Click Confirm & Apply Permissions]
        
        CONFIRM --> SET_LOADER[Set isSaving = true, render CircularProgress spinner]
        SET_LOADER --> API_CALL[PATCH /api/v1/auth/users/:id/permissions]
        
        API_CALL -- 200 OK --> SYNC_STATE[Update selectedStaff.permissions & staffList]
        SYNC_STATE --> CHECK_SELF{Is edited staff current logged in user?}
        CHECK_SELF -- Yes --> SYNC_AUTH[useAuthStore.getState().updateUser(updatedUser)]
        CHECK_SELF -- No --> FINISH[Toast Success Alert & Close Modal]
        SYNC_AUTH --> FINISH
        
        API_CALL -- Error --> SHOW_ERR[Display Error Alert & Keep Modal Open for retry]
    end
```

---

## 2. Component Architecture & State Structure

### 2.1 State Model in `StaffPbacMatrixPage.jsx`

Instead of dispatching an HTTP request on every switch toggle, the page will maintain a decoupled draft state:

```javascript
// Authoritative staff member from DB
const [selectedStaff, setSelectedStaff] = useState(null);

// In-memory draft permission set currently being manipulated
const [draftPermissions, setDraftPermissions] = useState([]);

// Modal visibility & execution state
const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
const [isSaving, setIsSaving] = useState(false);
```

### 2.2 Diffing Engine (`useMemo`)

```javascript
// Compute permission deltas between DB authoritative state and draft state
const { addedPermissions, removedPermissions, hasUnsavedChanges } = useMemo(() => {
  if (!selectedStaff) {
    return { addedPermissions: [], removedPermissions: [], hasUnsavedChanges: false };
  }
  const original = new Set(selectedStaff.permissions || []);
  const current = new Set(draftPermissions || []);

  const added = [...current].filter((p) => !original.has(p));
  const removed = [...original].filter((p) => !current.has(p));
  const hasChanges = added.length > 0 || removed.length > 0;

  return {
    addedPermissions: added,
    removedPermissions: removed,
    hasUnsavedChanges: hasChanges,
  };
}, [selectedStaff, draftPermissions]);
```

---

## 3. UI Blueprints: Sticky Bar & Confirmation Modal

### 3.1 Sticky Save Action Bar Component

A floating, backdrop-blurred dock anchored at the bottom of the viewport:
- **Left Side:** 
  - Alert indicator icon (`ShieldAlert` / `AlertCircle`).
  - Badge text: `"{count} unsaved permission change(s) pending review"`.
- **Right Side:**
  - **Discard Button:** `handleDiscardChanges()` reverts `draftPermissions` to `[...selectedStaff.permissions]`.
  - **Save Button:** High-contrast button with badge count: `Save Permissions ({count})`, opens `PbacConfirmModal`.

### 3.2 Confirmation Modal Blueprint (`PbacConfirmModal.jsx`)

A dedicated modal dialog following our newly implemented **Light & Dark mode design system**:
- **Header:**
  - Security Shield Icon + Title: `"Confirm Permission Updates"`.
  - Subtitle displaying target user: `"{selectedStaff.name} ({selectedStaff.role}) • {selectedStaff.email}"`.
- **Body / Diff Breakdown:**
  - **Newly Granted Permissions Group (+):**
    - Rendered in emerald green pill tags (`bg-emerald-500/10 border-emerald-500/30 text-emerald-400`).
    - Format: `+ [permission.key] (permission.label)`.
  - **Revoked Permissions Group (-):**
    - Rendered in rose red pill tags (`bg-rose-500/10 border-rose-500/30 text-rose-400`).
    - Format: `- [permission.key] (permission.label)`.
  - **Security Warning Notice:**
    - Callout noting that granted permissions take effect immediately upon next request or session synchronization.
- **Footer Actions:**
  - **Cancel Button:** Closes dialog without losing in-memory toggles.
  - **Confirm & Apply Button:**
    - If `isSaving === true`, displays a spinning `CircularProgress` or `Loader2` icon and disabled cursor.
    - If `isSaving === false`, displays `Check` icon and text `"Confirm & Apply Changes"`.

---

## 4. API Contract & Integration (`staff.service.js`)

The existing API route `PATCH /api/v1/auth/users/:id/permissions` already accepts:
```json
{
  "role": "receptionist",
  "permissions": [
    "bookings:view",
    "bookings:create",
    "rooms:view",
    "housekeeping:update"
  ]
}
```
**Response Format (200 OK):**
```json
{
  "success": true,
  "message": "Staff user permissions updated successfully",
  "data": {
    "user": {
      "_id": "64f123456789...",
      "name": "Jane Receptionist",
      "email": "jane@grandhorizon.com",
      "role": "receptionist",
      "permissions": [...]
    }
  }
}
```
This architecture leverages the existing endpoint with **Zero Backend Code Changes**, adhering strictly to Ponytail Rung 1 (YAGNI) and Rung 2 (Reuse existing code).

---

## 5. Work Packages & Implementation Tasks

| Work Package | Target Files | Key Responsibilities |
| :--- | :--- | :--- |
| **WP1: Draft State Decoupling** | `frontend/src/pages/admin/StaffPbacMatrixPage.jsx` | Decouple switch toggles from API calls into `draftPermissions`. Calculate delta diffs with `useMemo`. |
| **WP2: Sticky Save Bar** | `frontend/src/pages/admin/StaffPbacMatrixPage.jsx` | Add responsive floating dock with change counter, Discard button, and Save button. |
| **WP3: Confirmation Modal** | `frontend/src/components/admin/PbacConfirmModal.jsx` | Create accessible modal with diff breakdown badges, security callout, and Light/Dark styling. |
| **WP4: Atomic Save & Loader Flow** | `StaffPbacMatrixPage.jsx`, `PbacConfirmModal.jsx` | Wire `handleConfirmSave` with `isSaving` loader, success toast notification, and `useAuthStore` sync. |
| **WP5: Edge Cases & Verification** | Full frontend | Handle staff selection switching warning, verify zero console errors, run `npm run build`. |

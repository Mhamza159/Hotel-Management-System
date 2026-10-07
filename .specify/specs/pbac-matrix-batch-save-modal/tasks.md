# Implementation Tasks: PBAC Permission Matrix Batch Save with Confirmation Modal & Loader

**Feature Name:** `pbac-matrix-batch-save-modal`  
**Related Plan:** [.specify/specs/pbac-matrix-batch-save-modal/plan.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/pbac-matrix-batch-save-modal/plan.md)  
**Related Spec:** [.specify/specs/pbac-matrix-batch-save-modal/spec.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/pbac-matrix-batch-save-modal/spec.md)  
**Status:** Completed ✅  
**Target Subsystems:** `frontend` (`StaffPbacMatrixPage.jsx`, `PbacConfirmModal.jsx`, `staff.service.js`)

---

## Task List Checklist

### Phase 1: In-Memory Draft State & Local Toggling (P1)

- [x] **Task 1.1: Local Draft Permissions State in `StaffPbacMatrixPage.jsx`**
  - **File:** `frontend/src/pages/admin/StaffPbacMatrixPage.jsx`
  - Added `draftPermissions` state array initialized whenever `selectedStaff` is set or loaded.
  - Refactored `handleTogglePermission` to mutate `draftPermissions` locally in state rather than triggering immediate `staffService.updatePermissions` network calls.
  - Bound switch checked values to `draftPermissions.includes(perm.key)`.

- [x] **Task 1.2: Diffing Engine & Dirty State Calculation**
  - **File:** `frontend/src/pages/admin/StaffPbacMatrixPage.jsx`
  - Implemented `useMemo` calculating:
    - `addedPermissions`: Array of permission keys in `draftPermissions` but not in `selectedStaff.permissions`.
    - `removedPermissions`: Array of permission keys in `selectedStaff.permissions` but not in `draftPermissions`.
    - `hasUnsavedChanges`: Boolean flag indicating if `added.length > 0 || removed.length > 0`.
  - Added visual "+ Added" and "- Removed" badges on modified switches.

---

### Phase 2: Sticky Save Action Bar Component (P1)

- [x] **Task 2.1: Implement Viewport-Bottom Sticky Action Bar**
  - **File:** `frontend/src/pages/admin/StaffPbacMatrixPage.jsx`
  - Rendered a floating glassmorphism dock fixed at the bottom of the viewport when `hasUnsavedChanges === true`.
  - Displayed alert icon and badge: `"{count} unsaved permission change(s) pending review"`.
  - Added **[Discard Changes]** button that resets `draftPermissions` back to `[...selectedStaff.permissions]`.
  - Added **[Save Permissions ({count})]** button that opens the confirmation modal.
  - Ensured styling adapts seamlessly in both Light and Dark mode using hotel tokens (`bg-surface`, `border-border`, `text-text`).

---

### Phase 3: Dedicated Confirmation Modal Component (P1 & P2)

- [x] **Task 3.1: Create `PbacConfirmModal.jsx` Component**
  - **File:** `frontend/src/components/admin/PbacConfirmModal.jsx`
  - Created Material UI Dialog with smooth backdrop blur, close button, and responsive sizing.
  - Rendered target user header: `"{staffMember.name} ({staffMember.role}) • {staffMember.email}"`.
  - Rendered **Newly Granted Permissions Group (+)** with emerald green pill tags (`+ [key]`).
  - Rendered **Revoked Permissions Group (-)** with rose red pill tags (`- [key]`).
  - Rendered security advisory notice reminding admin of immediate privilege effect.
  - Rendered **[Cancel]** and **[Confirm & Apply Permissions]** action buttons.

- [x] **Task 3.2: Loader & Processing State in Modal**
  - **File:** `frontend/src/components/admin/PbacConfirmModal.jsx`
  - Accepted `isSaving` prop.
  - When `isSaving === true`, rendered animated circular spinner inside the confirm button and disabled both Cancel and Confirm buttons to prevent duplicate requests.

---

### Phase 4: Atomic Save Flow & State Synchronization (P2)

- [x] **Task 4.1: Wire Batch Save Execution**
  - **File:** `frontend/src/pages/admin/StaffPbacMatrixPage.jsx`
  - Implemented `handleConfirmSave` handler:
    - Sets `isSaving = true`.
    - Dispatches single atomic API call `staffService.updatePermissions(selectedStaff._id, { role: selectedStaff.role, permissions: draftPermissions })`.
    - On success: updates `selectedStaff.permissions`, updates `staffList`, closes modal, and displays success alert.
    - Synchronizes `useAuthStore` if the updated staff member matches current logged-in user.
    - On error: displays alert message and leaves modal open for retry.

- [x] **Task 4.2: Guard Staff Switching with Unsaved Changes**
  - **File:** `frontend/src/pages/admin/StaffPbacMatrixPage.jsx`
  - When Super Admin clicks another staff member from the left sidebar while `hasUnsavedChanges === true`, prompted with confirmation alert to avoid cross-user state corruption.

---

### Phase 5: Verification & Quality Gate (P3)

- [x] **Task 5.1: Functional Testing**
  - Verified local toggle updates `draftPermissions` with zero network overhead.
  - Verified Discard cleanly rolls back to saved DB permissions.
  - Verified modal diff accurately maps added vs removed permissions.
  - Verified atomic save commits payload and closes modal on success.

- [x] **Task 5.2: Production Build Check**
  - Ran `npm run build` in `frontend` directory — Passed in 17.97s with zero errors (Exit code `0`).

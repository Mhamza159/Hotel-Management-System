# Phase 7 Plan: Admin Suite, PBAC Matrix & ⌘K Command Palette

**Phase:** 7 of 7  
**Directory:** `.planning/phases/07-admin-suite-pbac-matrix-and-command-palette/`  
**Related Specs:** [.planning/PROJECT.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/PROJECT.md) | [.planning/ROADMAP.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/ROADMAP.md)  
**Status:** Ready for Execution 🚀

---

## 1. Objective

Complete the Administrative Suite with a drag-and-drop Cloudinary room asset manager, build the strictly non-optimistic categorized PBAC Permission Matrix (where each switch calls the API individually and displays a loading state), integrate the staff console's signature interaction feature — the global ⌘K Command Palette, and verify zero regressions via a clean production build.

---

## 2. Target Files

- `frontend/src/pages/admin/AdminRoomsPage.jsx`: Room management, Cloudinary gallery, drag-drop uploader.
- `frontend/src/components/admin/RoomImageDropzone.jsx`: Drag-and-drop file upload zone.
- `frontend/src/pages/admin/StaffManagementPage.jsx`: Categorized PBAC permission matrix.
- `frontend/src/components/admin/PermissionMatrix.jsx`: Grouped switches with individual API dispatches and spinners.
- `frontend/src/components/staff/CommandPalette.jsx`: Global ⌘K / Ctrl+K interactive command modal.
- `frontend/src/pages/admin/AuditLogsPage.jsx`: High-density immutable audit log viewer.

---

## 3. Tasks Breakdown

### Task 7.1: Room Asset Management & Dropzone
- Build `RoomImageDropzone.jsx`:
  - Solid `--surface-2` (`#1B2433`) drag target with dashed `#3FD0C9`/40 border.
  - Multipart file drop support with upload progress indicator.
  - Image gallery displaying Cloudinary asset thumbnails with primary tag and delete trigger.

### Task 7.2: Build Categorized PBAC Matrix (`PermissionMatrix.jsx`)
- Group permissions into 5 distinct operational domains:
  1. **Bookings:** `MANAGE_BOOKINGS`, `CANCEL_BOOKING`, `VIEW_RESERVATIONS`
  2. **Front Desk:** `VIEW_DESK`, `CHECK_IN_GUEST`, `CHECK_OUT_GUEST`, `ISSUE_KEYCARD`
  3. **Payments:** `PROCESS_PAYMENTS`, `PROCESS_REFUNDS`, `APPLY_DISCOUNTS`
  4. **Rooms & Housekeeping:** `MANAGE_ROOMS`, `OVERRIDE_ROOM_STATUS`, `LOG_MAINTENANCE`
  5. **Oversight:** `VIEW_ANALYTICS`, `EXPORT_AUDIT_LOGS`, `MANAGE_STAFF`
- Invariant: **Strictly Non-Optimistic Updates:**
  - Flipping a toggle does NOT update local state immediately.
  - Toggle displays an inline loading spinner while sending `PATCH /api/admin/staff/:id/permissions`.
  - State only flips upon receiving HTTP 200 OK from server.
  - If request fails, error toast displays and switch remains in original state.

### Task 7.3: Implement Global ⌘K Command Palette (`CommandPalette.jsx`)
- Keyboard listener: `Ctrl+K` or `Cmd+K` opens the palette anywhere within `/desk/*` or `/admin/*`.
- Interactive search features:
  - Jump to Booking by reference (e.g. typing `BK-` searches active bookings).
  - Search Guests by name or phone.
  - Jump directly to Room numbers (e.g. typing `101` opens Room 101 status).
  - Quick action links: *"New Reservation"*, *"Daily Report"*, *"Audit Log"*, *"Check In Desk"*.
- Aesthetic: Solid `--surface` (`#131A26`) container with 1px border, aqua selection highlight (`bg-[#3FD0C9]/15`), Lucide keyboard badge.

### Task 7.4: Final Polish & Production Build Verification
- Execute full production build: `npm run build` in `frontend/`.
- Ensure zero lint errors, zero missing imports, and zero CSS token conflicts.
- Audit all pages to ensure no remaining cream/serif anti-patterns exist.

---

## 4. Verification Gates

1. Press `Cmd+K` / `Ctrl+K` in staff cockpit — command palette must open instantly and filter results accurately.
2. Toggle a PBAC permission — verify inline loading spinner appears and toggle updates only after API responds.
3. Upload an image in Room Management — verify Cloudinary URL displays in the gallery.
4. Run `npm run build` — must build with exit code 0.

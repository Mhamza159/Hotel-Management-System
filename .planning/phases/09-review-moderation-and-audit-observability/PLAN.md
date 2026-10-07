# Phase 9 Plan: Staff Review Moderation & Audit Trail Observability

**Phase:** 9 of 11 (Milestone 2: Phase 2)  
**Directory:** `.planning/phases/09-review-moderation-and-audit-observability/`  
**Related Specs:** [.planning/PROJECT.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/PROJECT.md) | [.planning/ROADMAP.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/ROADMAP.md) | [.specify/specs/staff-console-completeness/spec.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/staff-console-completeness/spec.md)  
**Status:** Ready for Execution 🚀

---

## 1. Objective

Wire real review moderation and system audit trail observability into the Super-Admin / Staff management console:
1. Deliver the **Staff Review Moderation Page** (`AdminReviewsPage.jsx`), fetching reviews via per-room endpoints (`GET /api/v1/rooms/:id/reviews`) with room selector, star filters, and soft-delete / moderation action (`DELETE /api/v1/reviews/:id`) guarded by `reviews:manage`.
2. Connect and polish the **Audit Trail Page** (`AuditLogsPage.jsx`), wiring directly to `GET /api/v1/admin/audit-logs` with server-side pagination, action-type filter (`auth_login`, `booking_create`, `permission_grant`, etc.), date-range picker, and expandable JSON metadata inspector.

---

## 2. Target Files

- `frontend/src/services/reviewService.js`: Per-room review fetcher & review soft-delete.
- `frontend/src/services/auditService.js`: Audit logs query with pagination & action filtering.
- `frontend/src/pages/admin/AdminReviewsPage.jsx`: Review moderation management page.
- `frontend/src/pages/admin/AuditLogsPage.jsx`: High-density tabular view for audit records with JSON inspector.
- `frontend/src/components/staff/StaffSidebar.jsx`: Add Reviews nav link guarded by `<Can permission="reviews:manage">`.

---

## 3. Tasks Breakdown

### Task 9.1: Build `reviewService.js` and `AdminReviewsPage.jsx`
- Backend API alignment:
  - `GET /api/v1/rooms/:id/reviews` (per-room review list).
  - `DELETE /api/v1/reviews/:id` (moderator delete/hide).
- `AdminReviewsPage.jsx` Features:
  - Room Selector (dropdown or tabs) to inspect reviews for specific rooms or all rooms sequentially.
  - Review Cards/Rows: Guest name, rating (1-5 stars with gold accent), review text, creation date.
  - "Moderate / Delete" button: Opens confirm dialog; on confirmation, dispatches `DELETE /api/v1/reviews/:id`.
  - Non-optimistic update: row shows loading state until 200 OK received, then removes from view with toast feedback.
  - PBAC: Nav item and page guarded by `<Can permission="reviews:manage">`.

### Task 9.2: Complete `auditService.js` and `AuditLogsPage.jsx`
- Backend API alignment:
  - `GET /api/v1/admin/audit-logs?page=1&limit=25&action=booking_create&startDate=...&endDate=...`.
- `AuditLogsPage.jsx` Features:
  - High-density MUI DataGrid or custom table using `#131A26` cards and `#1B2433` hover rows.
  - Columns: Timestamp (formatted local time), Action Type badge, Actor (Email & Role), Resource ID, IP Address, Details toggle.
  - Filter bar: Action dropdown (`all`, `auth`, `booking`, `permission`, `room`), Date range inputs.
  - JSON Metadata Inspector drawer or expandable row showing full audit payload formatted with syntax highlighting.
  - Server-side pagination controls (Next/Prev/Page size).
  - PBAC: Guarded by `<Can permission="system:audit">`.

---

## 4. Verification & Acceptance Criteria
- [ ] Navigating to `/admin/reviews` allows viewing and moderating room reviews with `reviews:manage`.
- [ ] Users without `reviews:manage` cannot see or access the Reviews link or page.
- [ ] `/admin/audit-logs` correctly queries backend audit logs, supports pagination, and renders expandable JSON metadata.
- [ ] Zero optimistic mutations: deletion and pagination show live spinners.
- [ ] `npm run build` exits 0 with zero lint/type errors.

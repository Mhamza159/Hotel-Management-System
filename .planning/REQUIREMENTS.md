# Scoped Requirements — Milestone 2: Staff & Super-Admin Console Completeness

**Milestone:** Staff & Super-Admin Console Completeness & PBAC UI Parity  
**Project Context:** [.planning/PROJECT.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/PROJECT.md)  
**Audited Specification:** [.specify/specs/staff-console-completeness/spec.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/staff-console-completeness/spec.md)  
**Technical Plan:** [.specify/specs/staff-console-completeness/plan.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/staff-console-completeness/plan.md)  
**Task Checklist:** [.specify/specs/staff-console-completeness/tasks.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/staff-console-completeness/tasks.md)

---

## 1. Front Desk & Walk-In Operations (FDK)
- **FDK-01 (Walk-In Booking Modal):** Front desk staff with `bookings:create` can create an instant walk-in reservation with room selector, guest details, nights count, payment method (`stripe_intent` or `cash`), and instant confirmation.
- **FDK-02 (Room Status Quick Selector):** Receptionists with `rooms:update` can update room housekeeping/maintenance status directly (`POST /api/v1/rooms/:id/status` -> `ready`, `cleaning`, `maintenance`).
- **FDK-03 (Keycard Reissue Action):** Front desk can trigger keycard re-issuance (`POST /api/v1/desk/keycard/issue`) with keycard count and replacement logs.

## 2. Review Moderation & Audit Observability (REV / AUD)
- **REV-01 (Room-Specific Review Moderation):** Admin/Staff with `reviews:manage` can inspect room reviews (`GET /api/v1/rooms/:id/reviews`) and execute soft-delete/moderation (`DELETE /api/v1/reviews/:id`) with confirm modal.
- **AUD-01 (System Audit Trail):** Full pagination, action-type filter (`auth_login`, `booking_create`, `permission_grant`, etc.), date range filtering, and expandable JSON metadata viewer wired to `GET /api/v1/admin/audit-logs`.

## 3. Dynamic PBAC Guarding & Matrix (PBAC)
- **PBAC-01 (Categorized Non-Optimistic Permission Matrix):** 20 permissions categorized into Bookings, Front Desk, Payments, Rooms, Oversight. Toggling shows spinner until server confirms 200 OK via `POST /api/v1/admin/staff/:id/permissions`.
- **PBAC-02 (Strict DOM Omission):** Any nav link, button, or widget for which the logged-in staff member lacks permissions is omitted completely from the DOM using `<Can>` wrapper.

## 4. AI Staff Assistant & Live Chat Drawer (CHAT)
- **CHAT-01 (Permanent Accessibility):** Chat floating trigger button is mounted globally in `App.jsx`, visible with high z-index (`z-50`), styled in harmony with active theme.
- **CHAT-02 (Staff vs Guest Routing):** When a staff member uses the chat, requests route to `POST /api/v1/chat/staff` with operational tools (occupancy, cleaning roster, pending cancellations).

# Phase 8 Plan: Front Desk API Parity & Walk-In Reservation Engine

**Phase:** 8 of 11 (Milestone 2: Phase 1)  
**Directory:** `.planning/phases/08-front-desk-api-parity-and-walk-in-engine/`  
**Related Specs:** [.planning/PROJECT.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/PROJECT.md) | [.planning/ROADMAP.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/ROADMAP.md) | [.specify/specs/staff-console-completeness/spec.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/staff-console-completeness/spec.md)  
**Status:** Ready for Execution 🚀

---

## 1. Objective

Wire all real front-desk operational endpoints into the receptionist console with complete backend API parity:
1. Deliver the **Walk-in Booking Modal** (`POST /api/v1/desk/walk-in`), allowing receptionists with `bookings:create` to book on-the-spot guests with room selector, stay dates, guest details, and payment method (`stripe_intent` vs `cash`).
2. Implement the **Quick Room Status Selector** (`POST /api/v1/rooms/:id/status`) on Front Desk room lists, allowing receptionists with `rooms:update` to immediately flag rooms as `ready`, `cleaning`, or `maintenance`.
3. Wire the **Keycard Reissue Action** (`POST /api/v1/desk/keycard/issue`) on `ArrivalsPage.jsx` and `InHousePage.jsx` with keycard counts and replacement confirmation.

---

## 2. Target Files

- `frontend/src/services/deskService.js`: Confirm methods `createWalkInReservation`, `updateRoomStatus`, and `issueKeycard` match backend endpoints.
- `frontend/src/components/desk/WalkInBookingModal.jsx`: Modal for on-the-spot guest reservation.
- `frontend/src/pages/desk/DeskDashboardPage.jsx`: Mount walk-in reservation button guarded by `<Can permission="bookings:create">`.
- `frontend/src/pages/desk/ArrivalsPage.jsx` & `InHousePage.jsx`: Keycard reissue trigger and room status selector.
- `frontend/src/components/common/Can.jsx`: Ensure non-permitted elements are omitted from the DOM.

---

## 3. Tasks Breakdown

### Task 8.1: Service Layer Endpoint Alignment (`deskService.js`)
- Verify endpoint contracts against backend:
  - `POST /api/v1/desk/walk-in` with `{ roomId, checkIn, checkOut, guestName, guestEmail, guestPhone, paymentMethod }`.
  - `POST /api/v1/rooms/:id/status` with `{ status }` (`ready` | `cleaning` | `maintenance`).
  - `POST /api/v1/desk/keycard/issue` with `{ bookingId, keycardsCount }`.

### Task 8.2: Build Walk-In Booking Modal (`WalkInBookingModal.jsx`)
- Visual Design: Solid Obsidian Dark `--surface` (`#131A26`) container, gold/aqua accents, Inter typography.
- Form controls:
  - Room dropdown (filtered to available/ready rooms).
  - Check-in & Check-out date pickers (native HTML5 `<input type="date">` styled with dark tokens).
  - Guest Full Name, Email, Phone number.
  - Payment Method toggle: `Credit/Debit Card (Stripe Intent)` or `Direct Cash at Desk`.
  - Live price calculation: (Room Base Price * Nights) with tax breakdown.
- Submission:
  - Loading spinner on submit button.
  - Upon success: Toast notification with `#bookingReference` + auto-refresh dashboard list.
  - PBAC: Guarded by `<Can permission="bookings:create">`.

### Task 8.3: Quick Room Status Selector
- Add inline status dropdown in room/arrivals table:
  - Options: `Ready` (green badge), `Cleaning` (amber badge), `Maintenance` (red badge).
  - Toggling immediately dispatches `POST /api/v1/rooms/:id/status`.
  - Zero optimistic updates: button/chip shows small spinner until 200 OK received.
  - PBAC: Guarded by `<Can permission="rooms:update">`.

### Task 8.4: Keycard Reissue Action
- In `ArrivalsPage.jsx` and `InHousePage.jsx`, add a "Reissue Keycard" button in row actions:
  - Opens confirm dialog with keycard count (default: 2).
  - Dispatches `POST /api/v1/desk/keycard/issue`.
  - PBAC: Guarded by `<Can permission="bookings:update">`.

---

## 4. Verification & Acceptance Criteria
- [ ] Walk-in reservation can be created end-to-end and appears in `DeskDashboardPage.jsx` and `ArrivalsPage.jsx`.
- [ ] Room status updates persist in backend and reflect across both Front Desk and Housekeeping views.
- [ ] Reissuing keycards sends request to backend and displays success notification.
- [ ] Unpermitted staff users cannot see the Walk-in button or room status selectors.
- [ ] `npm run build` exits 0 with zero lint/type errors.

# Implementation Tasks: Walk-In Guest Reservation Flow (Front Desk & PBAC Gated)

**Feature Name:** `walk-in-guest-reservation-flow`  
**Related Plan:** [.specify/specs/walk-in-guest-reservation-flow/plan.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/walk-in-guest-reservation-flow/plan.md)  
**Related Spec:** [.specify/specs/walk-in-guest-reservation-flow/spec.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/walk-in-guest-reservation-flow/spec.md)  
**Status:** Completed ✅  
**Target Subsystems:**
- `backend` (`desk.routes.js`, `desk.controller.js`, `desk.service.js`, `desk.validation.js`)
- `frontend` (`StaffSidebar.jsx`, `DeskDashboardPage.jsx`, `WalkInBookingDialog.jsx`, `WalkInBookingPage.jsx`, `App.jsx`, `desk.service.js`)

---

## Task List Checklist

### Phase 1: Backend Walk-In Engine & Security Layer (P1)

- [x] **Task 1.1: Validation Schema for Walk-In Bookings**
  - **File:** `backend/src/validations/desk.validation.js`
  - Created `createWalkInBookingSchema` verifying:
    - `guestName` (string, required, 2-100 chars)
    - `guestPhone` (string, required, 7-20 chars)
    - `guestEmail` (string, email, optional/allow null)
    - `guestIdDocument` (string, optional)
    - `roomIds` (array of ObjectIds, min 1, required)
    - `checkInDate` (ISO date, required)
    - `checkOutDate` (ISO date, required, greater than checkInDate)
    - `numberOfGuests` (integer, min 1, default 1)
    - `paymentMethod` (enum: 'cash', 'offline-card', 'pay_later', default 'cash')
    - `instantCheckIn` (boolean, default true)
    - `specialRequests` (string, optional, max 1000 chars)

- [x] **Task 1.2: Core Walk-In Booking Business Service**
  - **File:** `backend/src/services/desk.service.js`
  - Implemented `createWalkInBooking({ actorId, payload })`:
    - Auto-locate existing guest user by email or phone; create a new guest `User` (`role: 'user'`, `isWalkIn: true`) if not found.
    - Check for active booking collisions on chosen rooms for the requested date window.
    - Verify selected rooms are currently active and clean (`HOUSEKEEPING_STATUS.CLEAN`) when `instantCheckIn` is selected.
    - Calculate total stay nights and pricing breakdown.
    - Atomically create `Booking` record (`userId: guestUser._id`, `bookedByStaffId: actorId`, `rooms: [...]`).
    - If `paymentMethod` is `'cash'` or `'offline-card'`, create `Payment` record and set `paymentStatus: 'completed'`.
    - If `instantCheckIn === true`, allot rooms, set `status: 'checked-in'`, and update room `isOccupied: true`.
    - Record append-only Security Audit Log event (`action: 'desk:walk-in-booking'`).

- [x] **Task 1.3: Desk Controller & Express Route Integration**
  - **Files:** `backend/src/controllers/desk.controller.js`, `backend/src/routes/desk.routes.js`
  - Implemented `DeskController.createWalkInBooking(req, res, next)`.
  - Registered `POST /api/v1/desk/walk-in` route guarded by:
    - `authenticate`
    - `requirePermission(PERMISSIONS.BOOKINGS_CREATE)`
    - `validate(createWalkInBookingSchema)`

---

### Phase 2: Frontend API Client & PBAC Navigation Discovery (P1)

- [x] **Task 2.1: Extend Front Desk Client Service**
  - **File:** `frontend/src/services/desk.service.js`
  - Added `createWalkInBooking: (payload) => api.post('/desk/walk-in', payload)`.
  - Added `getCleanRooms: () => api.get('/rooms')` helper to fetch clean, available rooms.

- [x] **Task 2.2: PBAC Sidebar Discovery**
  - **File:** `frontend/src/components/staff/StaffSidebar.jsx`
  - In `NAVIGATION_SECTIONS['front-desk']`, added navigation entry:
    ```javascript
    {
      to: '/desk/walk-in',
      label: 'Walk-In Booking',
      icon: CalendarPlus,
      permission: PERMISSIONS.BOOKINGS_CREATE,
    }
    ```
  - Verified that when Super Admin toggles `bookings:create` in PBAC matrix, the link dynamically appears/disappears in the sidebar.

- [x] **Task 2.3: Route Protection & Registration**
  - **File:** `frontend/src/App.jsx`
  - Registered route `/desk/walk-in` wrapped in `<ProtectedRoute requiredPermission={PERMISSIONS.BOOKINGS_CREATE}>`.

- [x] **Task 2.4: Action Toolbar Button on Front Desk Dashboard**
  - **File:** `frontend/src/pages/desk/DeskDashboardPage.jsx`
  - In the operations toolbar alongside search and date filters, added a prominent **"+ New Walk-In Guest"** button.
  - Guarded button visibility strictly by `userPerms.includes(PERMISSIONS.BOOKINGS_CREATE) || isSuperAdmin`.
  - Wired button click to open `WalkInBookingDialog`.

---

### Phase 3: Interactive Walk-In Booking Dialog & Standalone Page (P1 & P2)

- [x] **Task 3.1: Build `WalkInBookingDialog.jsx` Component**
  - **File:** `frontend/src/components/staff/WalkInBookingDialog.jsx`
  - Created Material UI Dialog with Light/Dark mode luxury styling:
    - **Step 1 (Guest Identity):** Full Name, Contact Phone, Email, National ID/Passport.
    - **Step 2 (Stay Dates & Room Selection):** Check-in (default: today), Check-out (default: tomorrow), nights counter, clean room cards with category badges and price/night.
    - **Step 3 (Financial Settlement & Instant Check-In):** Cost summary (nights × price), payment mode radio group (Cash at Desk, POS Card Slip, Pay Later at Check-out), and **[X] Check-In Guest Immediately** toggle.
    - **Actions:** Cancel button and high-contrast "Confirm & Book Walk-In Guest" submit button with animated loader when `isSubmitting === true`.

- [x] **Task 3.2: Build `WalkInBookingPage.jsx` Standalone View**
  - **File:** `frontend/src/pages/desk/WalkInBookingPage.jsx`
  - Rendered the walk-in booking console within `StaffLayout` at `/desk/walk-in`.
  - Includes recent walk-in activity cards and quick action navigation.

- [x] **Task 3.3: Booking Confirmation Screen & Instant Invoice**
  - **File:** `frontend/src/components/staff/WalkInBookingDialog.jsx`
  - On successful booking response:
    - Displayed success banner with Booking Reference (`GH-XXXXX`).
    - Displayed keycard allotment confirmation if instant check-in was active.
    - Provided **[Download PDF Invoice]** button (calling `bookingService.downloadInvoice(booking._id)`).
    - Provided **[Done / Return to Front Desk]** button that auto-refreshes arrivals and in-house counters.

---

### Phase 4: Financial Settlement & Immediate Room Allotment (P2)

- [x] **Task 4.1: Cash & POS Card In-Person Settlement**
  - Walk-in cash or card selection creates a valid completed payment in the ledger without requiring third-party Stripe redirects.
  - Room pricing calculation accurately handles multi-night stays and multi-room bookings.

- [x] **Task 4.2: Instant Room Occupancy & Housekeeping Status Guard**
  - When instant check-in is toggled:
    - Room status changes to `isOccupied: true`.
    - Selected room must have `clean` status; if dirty or in maintenance, rejected with helpful error message.
    - Booking `actualCheckInTime` is timestamped with the current UTC time.

---

### Phase 5: Verification & Quality Gate (P3)

- [x] **Task 5.1: End-to-End Build & Compilation Test**
  - Ran `npm run build` in `frontend` directory — Passed with 0 compile errors across 3548 modules in 29.68s (Exit code `0`).

- [x] **Task 5.2: PBAC End-to-End Delegation Test**
  - When Super Admin revokes `bookings:create`, neither the sidebar tab nor the dashboard button appears for the Receptionist.
  - When Super Admin enables `bookings:create`, Receptionist can seamlessly complete a walk-in booking from end-to-end.


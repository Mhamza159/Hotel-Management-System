# Feature Specification: Walk-In Guest Reservation Flow (Front Desk & PBAC Gated)

**Feature Name:** `walk-in-guest-reservation-flow`  
**Status:** Draft / Ready for Plan 📋  
**Priority:** High (P1)  
**Author:** Antigravity AI  
**Scope:** Front Desk Operations (`DeskDashboardPage.jsx`, `StaffSidebar.jsx`, `WalkInBookingPage.jsx` / `WalkInBookingModal.jsx`), Desk Service & Controller (`desk.routes.js`, `desk.controller.js`, `desk.service.js`), and PBAC Permission Integration (`PERMISSIONS.BOOKINGS_CREATE`).

---

## 1. Executive Summary & Problem Statement

### 1.1 Problem Statement
1. **Feature Invisibility on Receptionist Dashboard:**
   - In the Grand Horizon Hotel Management System, the Super Administrator enables the `bookings:create` ("Create Reservations") permission for Receptionist staff via the PBAC Matrix.
   - However, when a Receptionist logs into the system, **no walk-in reservation button or link exists** on the Front Desk Dashboard (`/desk`) or in the navigation sidebar (`StaffSidebar.jsx`).
   - The Receptionist has no UI workflow to book rooms on behalf of walk-in guests who arrive at the physical hotel lobby.
2. **Guest Identity Mismatch for Staff Bookings:**
   - The existing consumer booking endpoint (`POST /api/v1/bookings`) binds the reservation directly to `req.user._id` (the authenticated user).
   - If a Receptionist attempted to use the guest booking flow, the reservation would mistakenly be attributed to the Receptionist's personal staff account rather than the actual walk-in guest.
3. **Missing Lobby Operations (Immediate Check-In & In-Person Payment):**
   - Walk-in guests standing at the front desk typically pay immediately (via Cash or POS Card) and expect their physical keycard right away.
   - A walk-in workflow must provide an atomic **"Immediate Check-In"** option that reserves the room, records the cash/card payment, allots the room number, and checks the guest in within a single streamlined operation.

### 1.2 Proposed Solution
Implement a complete end-to-end **Walk-In Guest Reservation System**:
1. **Dynamic PBAC Front Desk Discovery:**
   - **Sidebar Navigation:** Mount a new navigation item `{ to: '/desk/walk-in', label: 'Walk-In Booking', icon: CalendarPlus, permission: PERMISSIONS.BOOKINGS_CREATE }` under the Front Desk section in [`StaffSidebar.jsx`](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/frontend/src/components/staff/StaffSidebar.jsx).
   - **Desk Action Bar:** Display a prominent **"+ New Walk-In Guest"** CTA button in [`DeskDashboardPage.jsx`](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/frontend/src/pages/desk/DeskDashboardPage.jsx) whenever the staff member possesses `PERMISSIONS.BOOKINGS_CREATE` (or is Super Admin).
2. **Dedicated Walk-In Booking Interface:**
   - A multi-step or fast-action modal/page (`WalkInBookingDialog.jsx` & `/desk/walk-in`) featuring:
     - **Guest Information:** Full Name, Phone Number, Email (optional/receipt), ID/Passport #.
     - **Room & Stay Duration:** Real-time available clean room selector with date picker, room type filter, and live rate breakdown.
     - **Payment Collection:** Record Cash or POS Card Slip at creation time (or defer payment to check-out).
     - **Instant Check-In Option:** Checkbox to immediately mark booking as `checked-in` and allot the room keycard.
3. **Authoritative Backend API (`POST /api/v1/desk/walk-in`):**
   - Protected by `requirePermission(PERMISSIONS.BOOKINGS_CREATE)`.
   - Locates existing guest by phone/email or creates a dedicated guest user record (`role: 'user'`).
   - Atomically reserves available clean rooms with strict date collision checks.
   - Records in-person payment via `desk.service.js` if payment is tendered immediately.
   - Sets booking to `checked-in` and allots rooms if instant check-in is selected.
   - Logs an immutable security audit trail event (`action: 'desk:walk-in-booking'`).

---

## 2. Core Architectural Principles & Zero-Bloat Rules (Ponytail Ladder)

1. **YAGNI & Shortest Diff:**
   - Reuse existing `Room`, `Booking`, and `User` database models. Do not introduce redundant new database collections.
   - Reuse existing room availability calculation queries and pricing logic from `booking.service.js`.
2. **Pure PBAC Integration:**
   - Strictly gate all UI buttons and backend endpoints using the existing `PERMISSIONS.BOOKINGS_CREATE` token.
   - When Super Admin revokes `bookings:create`, the walk-in buttons and routes must instantly vanish from the Receptionist interface.
3. **Bilingual Documentation:**
   - Maintain rich bilingual (Urdu/Hinglish + English) comments across all touched and created files.
4. **Zero Placeholders:**
   - Full end-to-end functionality: guest creation, room allotment, live pricing, payment recording, and instant check-in.

---

## 3. Prioritized User Stories

### P1: Front Desk Walk-In Creation & Discovery
* **As a** Hotel Receptionist with `bookings:create` permission,  
* **I want** to see a "+ New Walk-In Guest" button on the Front Desk Dashboard and a "Walk-In Booking" tab in my sidebar,  
* **So that** I can easily initiate reservations for guests arriving in the hotel lobby.

### P1: Guest Onboarding & Room Selection
* **As a** Front Desk Staff member,  
* **I want** to input the guest's name, phone, and email, select check-in/out dates, and pick from currently available and clean rooms,  
* **So that** the guest is booked into a valid room without creating double-booking conflicts.

### P2: In-Person Payment & Immediate Check-In
* **As a** Receptionist handling a walk-in guest,  
* **I want** to record their cash or card payment and check them into their room immediately upon booking,  
* **So that** the guest gets their keycard in one single front desk interaction without needing two separate steps.

### P2: Instant Booking Confirmation & PDF Invoice
* **As a** Receptionist,  
* **I want** to view the generated booking reference code and be able to print or download their PDF invoice immediately,  
* **So that** I can hand a physical receipt to the guest.

### P3: Security Audit Attribution
* **As a** Super Administrator or Hotel Auditor,  
* **I want** walk-in bookings to log an immutable audit event recording the staff member who created it and the guest details,  
* **So that** front desk financial and inventory operations remain completely accountable.

---

## 4. Acceptance Criteria (Given / When / Then)

### Scenario 1: PBAC Visibility on Receptionist Dashboard
* **Given** a Receptionist user whose Super Admin has enabled `bookings:create`
* **When** the Receptionist navigates to `/desk` or views the sidebar
* **Then** the sidebar displays the "Walk-In Booking" item with calendar icon
* **And** the Front Desk Dashboard displays the "+ New Walk-In Guest" button
* **And** clicking either opens the Walk-In Booking workflow

### Scenario 2: Walk-In Creation with Instant Check-In & Cash Payment
* **Given** a walk-in guest arrives at the desk requesting a Deluxe Room for 2 nights
* **When** the Receptionist fills in Guest Name "Ahmed Khan", Phone "+923001234567", selects Room #204, chooses "Cash Payment", and toggles "Immediate Check-In"
* **Then** the system creates the guest record and reserves Room #204
* **And** records the cash payment as `completed`
* **And** marks the booking status as `checked-in` and Room #204 as `occupied`
* **And** returns a success confirmation with booking reference `GH-XXXXX`

### Scenario 3: Walk-In Creation for Future Date (Scheduled Arrival)
* **Given** a guest walks in to book a room starting 3 days from now
* **When** the Receptionist selects future check-in dates and unchecks "Immediate Check-In"
* **Then** the booking is created with status `confirmed`
* **And** appears in the Front Desk "Arrivals Scheduled" list for that future date

### Scenario 4: Unauthorized Access Prevention
* **Given** a staff user (e.g. Housekeeping) who lacks `bookings:create`
* **When** they view their dashboard or try to access `/desk/walk-in`
* **Then** no walk-in button is displayed
* **And** direct URL access to `/desk/walk-in` redirects to `/access-denied`

---

## 5. UI Blueprint

### 5.1 Front Desk Header CTA Button
```
+---------------------------------------------------------------------------------------------------------+
| GRAND HORIZON FRONT DESK FLIGHT-OPS                                                                     |
| Live guest arrivals, departures, room assignments, and payments                                         |
+---------------------------------------------------------------------------------------------------------+
| [ Arrivals Scheduled (4) ]   [ Departures Due (2) ]   [ Currently In-House (18) ]                       |
+---------------------------------------------------------------------------------------------------------+
| [ Arrivals ] [ Departures ] [ In-House ]  |  [Date: 2026-09-28] [Search...]  | [ + New Walk-In Guest ] |
+---------------------------------------------------------------------------------------------------------+
```

### 5.2 Walk-In Guest Booking Dialog / Page
```
+---------------------------------------------------------------------------------------------------------+
| 🏨 Walk-In Guest Reservation & Lobby Check-In                                                      [X] |
+---------------------------------------------------------------------------------------------------------+
| STEP 1: GUEST IDENTITY                                                                                 |
| Full Name: [ John Smith                  ]   Phone Number: [ +1 555 234 5678      ]                    |
| Email:     [ john.smith@example.com      ]   ID / Passport: [ A12345678            ]                    |
+---------------------------------------------------------------------------------------------------------+
| STEP 2: STAY DATES & SUITE SELECTION                                                                    |
| Check-In: [ 2026-09-28 ]   Check-Out: [ 2026-09-30 ] (2 Nights)   Guests: [ 2 ]                         |
| Room Category Filter: [ All Categories v ]                                                             |
| Select Clean Room:                                                                                      |
|   (o) Room #102 - Deluxe Suite ($150/night) • Status: Clean • Max Guests: 3                             |
|   ( ) Room #204 - Executive Suite ($220/night) • Status: Clean • Max Guests: 4                          |
+---------------------------------------------------------------------------------------------------------+
| STEP 3: FINANCIAL SETTLEMENT & LOBBY DISPOSITION                                                        |
| Total Stay Cost: $300.00                                                                                |
| Payment Mode:  (o) Cash at Desk     ( ) POS Card Slip     ( ) Defer Payment to Check-Out               |
|                                                                                                         |
| [X] Check-In Guest Immediately (Allot Room #102 & Issue Keycard Now)                                   |
+---------------------------------------------------------------------------------------------------------+
| [ Cancel ]                                                  [ 🚀 Confirm & Create Walk-In Booking ]   |
+---------------------------------------------------------------------------------------------------------+
```

---

## 6. Functional Requirements Checklist

### 6.1 Backend Enhancements
1. **Validation Schema (`backend/src/validations/desk.validation.js`):**
   - Add `createWalkInBookingSchema` validating:
     - `guestName` (string, required)
     - `guestPhone` (string, required)
     - `guestEmail` (string, email, optional/allow null)
     - `guestIdDocument` (string, optional)
     - `roomIds` (array of ObjectIds, min 1, required)
     - `checkInDate` (date ISO, required)
     - `checkOutDate` (date ISO, required, must be after checkInDate)
     - `numberOfGuests` (number, min 1, default 1)
     - `paymentMethod` (enum: 'cash', 'offline-card', 'pay_later', default 'cash')
     - `instantCheckIn` (boolean, default true)
     - `specialRequests` (string, optional)
2. **Desk Service (`backend/src/services/desk.service.js`):**
   - Implement `createWalkInBooking()`:
     - Look up existing guest by email or phone; create a new guest `User` if not found.
     - Validate that requested rooms exist, are active, and have no overlapping active bookings for the specified dates.
     - Validate rooms are clean (`HOUSEKEEPING_STATUS.CLEAN`) if instant check-in is requested.
     - Calculate total stay amount based on room nightly rates and duration.
     - Create `Booking` record with `userId: guestUser._id` and `bookedByStaffId: actorId`.
     - If payment is 'cash' or 'offline-card', record payment and mark `paymentStatus: 'completed'`.
     - If `instantCheckIn === true`, allot rooms, set `status: 'checked-in'`, and update room `isOccupied: true`.
     - Append Security Audit Log event `desk:walk-in-booking`.
3. **Desk Controller & Routes (`backend/src/controllers/desk.controller.js` & `backend/src/routes/desk.routes.js`):**
   - Add `POST /api/v1/desk/walk-in` route with `requirePermission(PERMISSIONS.BOOKINGS_CREATE)`.

### 6.2 Frontend Enhancements
1. **Staff Navigation Sidebar (`frontend/src/components/staff/StaffSidebar.jsx`):**
   - Add `{ to: '/desk/walk-in', label: 'Walk-In Booking', icon: CalendarPlus, permission: PERMISSIONS.BOOKINGS_CREATE }` under the Front Desk section.
2. **Front Desk Operations Dashboard (`frontend/src/pages/desk/DeskDashboardPage.jsx`):**
   - Add "+ New Walk-In Guest" button in the toolbar, guarded by `Can` or `userPerms.includes(PERMISSIONS.BOOKINGS_CREATE)`.
   - Open `WalkInBookingDialog` on click.
3. **Walk-In Booking Dialog & Standalone Page (`WalkInBookingDialog.jsx` & `WalkInBookingPage.jsx`):**
   - Step-by-step guest entry, date picker, room selector with live availability fetch, payment options, and instant check-in toggle.
4. **Route Registration (`frontend/src/App.jsx`):**
   - Register `/desk/walk-in` protected by `requiredPermission={PERMISSIONS.BOOKINGS_CREATE}`.
5. **Desk API Client Service (`frontend/src/services/desk.service.js`):**
   - Add `createWalkInBooking(data)` method calling `POST /api/v1/desk/walk-in`.

---

## 7. Verification & Testing Strategy
1. **Unit & API Testing:**
   - Verify non-permitted staff (e.g. Housekeeper) receives 403 Forbidden on `POST /api/v1/desk/walk-in`.
   - Verify Receptionist with `bookings:create` successfully books walk-in guest and receives 201 Created.
   - Verify overlap prevention blocks booking already-occupied rooms.
2. **End-to-End Build & Visual Verification:**
   - Run `npm run build` to guarantee 0 compile errors.
   - Test UI flow in browser: Super Admin enables permission → Receptionist logs in → Button appears → Booking succeeds → Guest appears in Arrivals or In-House list.

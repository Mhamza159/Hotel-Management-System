# Implementation Tasks: Receptionist-Owned Multi-Room Allotment, Dynamic Pricing, Dual-Gated Settlement & PDF Folio

**Feature Name:** `room-allocation-payment-checkin`  
**Related Plan:** [.specify/specs/room-allocation-payment-checkin/plan.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/room-allocation-payment-checkin/plan.md)  
**Related Spec:** [.specify/specs/room-allocation-payment-checkin/spec.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/room-allocation-payment-checkin/spec.md)  
**Status:** Completed ✅  
**Portal Scope:** **Front Desk Receptionist Portal (`/desk`)** — Guest does not pick physical rooms; Receptionist exercises full operational authority.  

---

## Task List Checklist

### Phase 1: Backend Data Model, Validations & Core Services (P1)

- [x] **Task 1.1: Enhance Booking Schema & Constants**
  - **File:** `my-app/src/models/Booking.js`, `my-app/src/config/constants.js`
  - Ensure `paidAmount` (Number, default 0) is persisted directly on `Booking`.
  - Add `'partially-paid'` to `PAYMENT_STATUS` in `constants.js` and `Booking.js`.
  - Add `isAllocated: { type: Boolean, default: false }` to `bookedRoomItemSchema`.

- [x] **Task 1.2: Implement Multi-Room Allotment Engine (`DeskService.allotRooms`)**
  - **File:** `my-app/src/services/desk.service.js`
  - Accept `allocations: [{ slotIndex, allocatedRoomId, pricingPolicy }]`.
  - Validate all allocated room IDs are clean (`housekeepingStatus === 'clean'`), active, and non-overlapping.
  - Ensure no duplicate physical rooms are allotted within the same multi-room reservation.
  - Release atomic reservation range locks on previously assigned rooms and acquire locks on newly assigned rooms.
  - Dynamically recalculate `booking.totalPrice` based on newly allotted room rates $\times$ nights.
  - Flag `booking.rooms[slotIndex].isAllocated = true` and save without changing status to `checked-in`.

- [x] **Task 1.3: Enforce Check-In Gatekeeping Guard (`DeskService.checkInGuest`)**
  - **File:** `my-app/src/services/desk.service.js`
  - Verify every room slot in `booking.rooms` has an allocated, clean room.
  - Enforce financial invariant: `booking.paidAmount > 0` (At least partial deposit or full payment required).
  - Throw 400 Bad Request if `paidAmount === 0`.
  - Transition `booking.status -> 'checked-in'`.

- [x] **Task 1.4: Enhance Desk Payment Intake (`DeskService.recordPayment`)**
  - **File:** `my-app/src/services/desk.service.js`
  - Accept `paymentType: 'partial' | 'full' | 'settlement'`.
  - Recalculate total completed payments and update `booking.paidAmount`.
  - Set `booking.paymentStatus = 'completed'` if `totalPaid >= booking.totalPrice`, otherwise `'partially-paid'`.

- [x] **Task 1.5: Enforce Strict Check-Out Lock on Outstanding Balance**
  - **File:** `my-app/src/services/desk.service.js`
  - In `checkOutGuest`, verify `effectiveTotal - totalPaid <= 0`.
  - Reject departure if `outstandingBalance > 0` with explicit 400 error stating remaining dues.
  - On zero balance, complete checkout, flip rooms to `dirty`, and accrue loyalty points.

- [x] **Task 1.6: Add Multi-Room Allotment Route & Joi Validation**
  - **File:** `my-app/src/routes/desk.routes.js`, `my-app/src/validations/desk.validation.js`, `my-app/src/controllers/desk.controller.js`
  - Define `deskAllotRoomsSchema` in `desk.validation.js`.
  - Wire `PATCH /api/v1/desk/bookings/:id/allot-rooms` to `DeskController.allotRooms`.

- [x] **Task 1.7: Upgrade PDF Folio & Invoice Generation (`InvoiceService`)**
  - **File:** `my-app/src/services/invoice.service.js`
  - Format multi-room table with physical `Room #[number] ([TYPE] SUITE)` for all allocated rooms.
  - Display itemized payment history with payment methods (Cash / POS Card).
  - Render high-contrast settlement pill: `PAID IN FULL ($0.00 DUE)` (Green) or `PARTIALLY PAID - OUTSTANDING DUE AT CHECKOUT: $XXX.XX` (Amber).
  - Add Guest Signature line and Front Desk Officer stamp area.

- [x] **Task 1.8: Backend Integration & Regression Test Verification**
  - **File:** `my-app/tests/integration/desk.test.js`
  - Test multi-room slot allotment.
  - Test check-in rejection with 400 when `paidAmount === 0`.
  - Test check-in success after partial payment.
  - Test checkout rejection with 400 when partial balance remains unpaid.
  - Test checkout success after remaining balance is settled.

---

### Phase 2: Frontend Client Services & Dialog Components (P1)

- [x] **Task 2.1: Update Client Desk Service**
  - **File:** `client/src/services/desk.service.js`
  - Add `allotRooms(id, payload)` calling `PATCH /desk/bookings/:id/allot-rooms`.
  - Update `recordPayment(id, payload)` to pass `paymentType`.

- [x] **Task 2.2: Refactor `AllotRoomDialog.jsx` for Multi-Room Slot Allocation**
  - **File:** `client/src/components/staff/AllotRoomDialog.jsx`
  - Support multi-room reservations: Render `Room 1 of N`, `Room 2 of N`... tabs or slot cards.
  - Show clean matching suites first, followed by alternative suites.
  - Prevent selecting the same physical room for multiple slots.
  - Live preview of dynamic price adjustments: `"New Total: $X (Adjustment: +$Y)"`.
  - On submit, call `deskService.allotRooms` and notify receptionist to collect payment.

- [x] **Task 2.3: Upgrade `RecordPaymentDialog.jsx` with Partial & Full Payment Toggle**
  - **File:** `client/src/components/staff/RecordPaymentDialog.jsx`
  - Add toggle buttons: `[Pay in Full: $X]` | `[Partial Deposit: Custom $]`.
  - Display transparent ledger: Total Accommodation Bill, Paid to Date, Balance Due at Departure.
  - Submit payment and refresh front desk state.

---

### Phase 3: Front Desk Dashboard State Gating & PDF Folio Integration (P1)

- [x] **Task 3.1: Implement Arrivals Sequential Action Gating**
  - **File:** `client/src/pages/desk/DeskDashboardPage.jsx`
  - Gate 1: If rooms not allocated, display `[Allot Rooms]` button.
  - Gate 2: If rooms allocated & `paidAmount === 0`, render `[Check In]` button as **Disabled / Locked 🔒** with tooltip, and render active `[Collect Payment]` button.
  - Gate 3: If rooms allocated & `paidAmount > 0` (partial or full), unlock `[Check In & Issue Keys]` button (Active Emerald ✅).
  - Add quick action `[Print PDF Folio]` to download registration card.

- [x] **Task 3.2: Implement Departures Strict Check-Out Lock**
  - **File:** `client/src/pages/desk/DeskDashboardPage.jsx`
  - In Departures tab, evaluate `remainingDues = effectiveTotal - totalPaid`.
  - If `remainingDues > 0`:
    - Render `[Check Out]` as **Disabled / Locked 🔒**.
    - Render prominent `[Settle Balance ($X)]` button in warning amber/orange.
  - If `remainingDues === 0`:
    - Unlock `[Check Out Guest]` button (Active Red).

- [x] **Task 3.3: Connect PDF Folio Download Action**
  - **File:** `client/src/pages/desk/DeskDashboardPage.jsx`
  - Connect `[Print PDF Folio]` button to `bookingService.downloadInvoice(booking._id, booking.bookingReference)`.

---

### Phase 4: Build Verification, Regression Testing & Sign-off (P1)

- [x] **Task 4.1: Frontend Production Build Validation**
  - Run `npm run build` in `client` to verify 0 bundling or JSX syntax errors. (Passed: built in 12.84s)

- [x] **Task 4.2: Automated Integration & Unit Test Verification**
  - Run `npm test -- tests/integration/desk.test.js` in `my-app` and verify all tests pass. (Passed: 11/11 tests)
  - Run all unit test suites in `my-app` to guarantee 0 regressions across models, cron, and PBAC. (Passed: 10/10 auth, all model & middleware unit tests)

- [x] **Task 4.3: End-to-End Operational Walkthrough & Final Polish**
  - Verify complete workflow from multi-room allocation, partial payment, check-in, departure balance lock, full settlement, check-out, and PDF printing.

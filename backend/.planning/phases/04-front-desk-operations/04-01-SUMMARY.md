# Plan 04-01 Summary: Front Desk Operations, PBAC Actions & Staff Payments

**Status**: Complete  
**Wave**: 1  
**Duration**: 15m  

---

## What was built:

1. **Payment Model (`src/models/Payment.js`)**:
   - Stores immutable financial transactions with explicit `receivedByStaffId` staff attribution.
   - Enums: `paymentMethod` (cash, offline-card, stripe), `status` (pending, completed, failed, refunded).
   - Compound indexes for cashier drawer reconciliation and booking financial statements.
   - Rich bilingual line-by-line documentation.

2. **Desk Operations Service (`src/services/desk.service.js`)**:
   - `checkInGuest`: Validates confirmed reservation status, transitions booking to `checked-in`.
   - `checkOutGuest`: Validates checked-in status, strictly blocks checkout if guest has an unpaid balance (`outstandingBalance > 0`), updates booking to `checked-out`, and automatically triggers physical rooms to `housekeepingStatus: 'dirty'`.
   - `recordInPersonPayment`: Validates PBAC permissions (`payments:recordCash` vs `payments:recordCard`), stamps `receivedByStaffId`, computes total paid balance, and transitions booking status to `completed` upon full settlement.
   - `getOperationalOverview`: Paginated dashboard for daily arrivals, departures, and in-house guests.

3. **Controllers & Routes**:
   - `DeskController` (`src/controllers/desk.controller.js`) and `desk.routes.js`.
   - Granular PBAC gates:
     - `PATCH /api/v1/desk/bookings/:id/check-in` -> `requirePermission('checkin:manage')`
     - `PATCH /api/v1/desk/bookings/:id/check-out` -> `requirePermission('checkout:manage')`
     - `POST /api/v1/desk/bookings/:id/payments` -> `requireAnyPermission(['payments:recordCash', 'payments:recordCard'])`
     - `GET /api/v1/desk/bookings` -> `requirePermission('bookings:view')`
   - Mounted at `/api/v1/desk` in `src/app.js`.

4. **Integration Verification & Postman Collection**:
   - `tests/integration/desk.test.js`: 8/8 comprehensive integration tests covering check-in, check-out, unpaid checkout blocks, room dirty transition, cash/card attribution, and guest PBAC 403 rejections.
   - Updated `postman/Hotel_Management_System.postman_collection.json` with dedicated "Front Desk Operations" folder containing all 4 endpoints.

5. **Full Suite Integrity**:
   - All 13 Test Suites passed (70 tests total), 0 failures.

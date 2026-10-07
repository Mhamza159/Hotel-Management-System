# Implementation Tasks: Audit Log Payment Inspector & Manager Analytics Payment ID Search

**Feature Name:** `audit-payment-inspector-and-analytics-search`  
**Related Plan:** [.specify/specs/audit-payment-inspector-and-analytics-search/plan.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/audit-payment-inspector-and-analytics-search/plan.md)  
**Related Spec:** [.specify/specs/audit-payment-inspector-and-analytics-search/spec.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/audit-payment-inspector-and-analytics-search/spec.md)  
**Status:** Completed ✅  
**Target Subsystems:**
- `backend` (`analytics.routes.js`, `analytics.controller.js`, `desk.service.js`)
- `frontend` (`AuditPayloadModal.jsx`, `AdminAnalyticsPage.jsx`, `admin.service.js`)

---

## Task List Checklist

### Phase 1: Backend Search API & Audit Payload Enrichment (P1)

- [x] **Task 1.1: Backend Payment Search Endpoint**
  - **Files:** `backend/src/controllers/analytics.controller.js`, `backend/src/routes/analytics.routes.js`, `backend/src/services/analytics.service.js`
  - Implement `AnalyticsController.searchPayment`:
    - Handles query parameter matching MongoDB ObjectId `_id`, `transactionReference`, or `bookingReference`.
    - Deeply populates `userId` (Guest), `receivedByStaffId` (Staff), and `bookingId` (Suites & Dates).
    - Fetches associated `AuditLog` records for this payment.
    - Returns 200 OK with `{ payment, timeline }`.
  - Register route `GET /api/v1/admin/analytics/payments/search` guarded by `authenticate` and `requirePermission(PERMISSIONS.ANALYTICS_VIEW)`.

- [x] **Task 1.2: Enrich Payment Audit Logs in Desk Service**
  - **File:** `backend/src/services/desk.service.js`
  - In `recordInPersonPayment`:
    - Enrich `AuditService.logAction` `afterState` to capture `guestName`, `guestPhone`, `guestEmail`, `receivedByStaffName`, `receivedByStaffRole`, `currency`, and `notes`.

---

### Phase 2: Frontend API Client & Audit Modal Payment Inspector (P1 & P2)

- [x] **Task 2.1: Add `searchPayment` Method to `admin.service.js`**
  - **File:** `frontend/src/services/admin.service.js`
  - Add `searchPayment: (query) => api.get('/admin/analytics/payments/search', { params: { query } })`.

- [x] **Task 2.2: Implement Financial Payment Audit Card in `AuditPayloadModal.jsx`**
  - **File:** `frontend/src/components/admin/AuditPayloadModal.jsx`
  - In `targetInfo`: Add `log.targetType === 'Payment'` handler displaying formatted amount, payment provider, and currency.
  - In Friendly Summary: Add `paymentDetails` condition:
    - Render Amount Hero Banner with status pill and provider.
    - Render **Payer Card** ("Kisne Pay Ki") with guest details.
    - Render **Receiver Card** ("Kisne Receive Ki") with staff member details and role badge.
    - Render Linked Reservation and Room details.
    - Render Transaction reference and cashier notes.

---

### Phase 3: Manager Analytics Payment Search Console UI (P1 & P2)

- [x] **Task 3.1: Build Payment Search & Audit Console in `AdminAnalyticsPage.jsx`**
  - **File:** `frontend/src/pages/admin/AdminAnalyticsPage.jsx`
  - Add Payment Search Bar accepting Payment ID, Booking Ref, or POS Slip.
  - Render Transaction Hero Card displaying Payer, Receiver, Amount, Provider, and Booking details.
  - Render Associated Audit Timeline showing date, action, actor, and IP address.
  - Interactive "Inspect Payload" button linked to `AuditPayloadModal`.
  - Add friendly error handling when no records match.

---

### Phase 4: Quality Gate & Verification (P3)

- [x] **Task 4.1: Production Build Verification**
  - Run `npm run build` in `frontend` directory and ensure 0 compile errors (Vite build passed with 0 errors).

- [x] **Task 4.2: End-to-End Test Execution**
  - Verified payment inspection in Audit Log table and payment search in Manager Analytics.

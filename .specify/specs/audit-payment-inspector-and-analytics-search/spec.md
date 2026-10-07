# Feature Specification: Audit Log Payment Inspector & Manager Analytics Payment ID Search

**Feature Name:** `audit-payment-inspector-and-analytics-search`  
**Status:** Draft / Ready for Plan 📋  
**Priority:** High (P1)  
**Author:** Antigravity AI  
**Scope:** 
1. **Security Audit Trail:** [`AuditPayloadModal.jsx`](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/frontend/src/components/admin/AuditPayloadModal.jsx), [`desk.service.js`](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/backend/src/services/desk.service.js)
2. **Manager Analytics:** [`AdminAnalyticsPage.jsx`](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/frontend/src/pages/admin/AdminAnalyticsPage.jsx), [`analytics.routes.js`](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/backend/src/routes/analytics.routes.js), [`analytics.controller.js`](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/backend/src/controllers/analytics.controller.js), [`admin.service.js`](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/frontend/src/services/admin.service.js)

---

## 1. Executive Summary & Problem Statement

### 1.1 Problem Statement
1. **Generic / Opaque Payment Inspection in Audit Logs:**
   - In [`AuditPayloadModal.jsx`](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/frontend/src/components/admin/AuditPayloadModal.jsx), while permission mutations have human-readable diffs, when an auditor or manager inspects a **Payment** record (`targetType: 'Payment'`), the system shows generic text ("Payment Record", raw database IDs) and falls back to a raw JSON view.
   - Non-technical hotel managers and auditors cannot immediately see the critical financial audit answers:
     - **Kisne pay ki? (Payer/Guest Identity):** Guest name, contact phone, and email.
     - **Kitni ki? (Financial Breakdown):** Tendered amount, currency, payment provider/method (Cash, POS Slip, Stripe).
     - **Kisne receive ki? (Cashier/Staff Attribution):** Front Desk staff member name, role (Receptionist, Super Admin), and staff ID.
     - **Kis booking ke aewaz ki? (Linked Reservation):** Booking reference and suite numbers.
2. **Missing Payment ID Lookup in Manager Analytics:**
   - In **Managerial Analytics & KPIs** ([`AdminAnalyticsPage.jsx`](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/frontend/src/pages/admin/AdminAnalyticsPage.jsx)), executives have high-level macro charts (Revenue, ADR, RevPAR, Occupancy), but **no transaction search tool** exists.
   - When a front desk cashier or manager has a Payment ID (generated in audit logs or on printed receipts) or a Booking Reference, they cannot search for that payment in Manager Analytics to view its complete payment history, cashier attribution, and audit timeline.

### 1.2 Proposed Solution
Implement a two-fold financial transparency and search suite:
1. **Human-Friendly Payment Audit Inspector (`AuditPayloadModal.jsx`):**
   - When `log.targetType === 'Payment'` or action is payment-related:
     - **Hero Financial Amount Banner:** Large emerald amount badge (e.g. `$350.00 USD`), Payment Provider badge (Cash at Desk / POS Card Slip / Stripe), and Status (Completed / Pending / Refunded).
     - **Two-Column Attribution Cards:**
       - **Payer Card (Guest):** Guest Full Name, Contact Phone, Email, and Account ID.
       - **Receiver Card (Staff):** Staff Member Name, Role Badge (Receptionist, Super Admin), and Staff Email.
     - **Linked Reservation & Suite:** Booking reference code (`GH-XXXXX`), Room numbers, and Stay dates.
     - **Transaction Reference & Cashier Notes:** POS slip number, receipt identifier, and front desk remarks.
2. **Manager Analytics Payment Search Console (`AdminAnalyticsPage.jsx`):**
   - Add a high-visibility **"Payment Transaction & Audit Lookup"** card in Manager Analytics.
   - Provide a search bar accepting:
     - **Payment ID** (MongoDB ObjectId, e.g. `6aba6aed171e374120f238af`)
     - **Booking Reference** (e.g. `BK-M2K8P9-7F3A` or `GH-XXXXX`)
     - **POS Transaction Slip / Reference**
   - Display a comprehensive transaction audit result containing full guest and cashier identities, linked reservation details, and chronological audit log entries associated with the payment.
3. **Backend Query & Search Endpoint:**
   - Add `GET /api/v1/admin/analytics/payments/search?query=...` in [`analytics.routes.js`](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/backend/src/routes/analytics.routes.js), returning populated payment data and linked audit records.

---

## 2. Core Architectural Principles & Zero-Bloat Rules (Ponytail Ladder)

1. **YAGNI & Native Model Reuse:**
   - Reuse existing `Payment`, `Booking`, `User`, and `AuditLog` collections. No new database tables.
2. **Deep Population & Snapshot Resilience:**
   - Both populated live references and historical snapshots in `beforeState` / `afterState` will be supported, ensuring older logs remain fully readable.
3. **Strict PBAC Protection:**
   - Both the audit modal and the analytics payment search are strictly guarded by `PERMISSIONS.AUDIT_VIEW` and `PERMISSIONS.ANALYTICS_VIEW`.
4. **Bilingual Documentation:**
   - All touched files will feature rich bilingual (Urdu/Hinglish + English) comments explaining financial audit logic and role attribution.

---

## 3. Prioritized User Stories

### P1: Human-Readable Payment Audit Inspector (Non-Coder View)
* **As a** Hotel General Manager or Compliance Auditor,  
* **I want** to click "Inspect" on any payment audit event and see exactly who paid the money, how much was paid, and which receptionist received the cash/card,  
* **So that** I do not have to decipher raw JSON brackets or missing staff references.

### P1: Manager Analytics Payment ID Search
* **As a** Hotel Operations Manager,  
* **I want** to paste a Payment ID or Booking Reference into a search bar on the Manager Analytics page,  
* **So that** I immediately retrieve the complete payment record, cashier staff attribution, and associated audit trail.

### P2: Linked Reservation & Suite Context
* **As an** Auditor reviewing a disputed transaction,  
* **I want** to see the associated booking reference, guest stay dates, and room numbers directly in the payment summary,  
* **So that** I have full contextual evidence without navigating between multiple pages.

### P3: Direct Copy & PDF Receipt Export
* **As an** Executive,  
* **I want** one-click buttons to copy the transaction reference or download the tax invoice,  
* **So that** I can expedite guest inquiries and accounting audits.

---

## 4. Acceptance Criteria (Given / When / Then)

### Scenario 1: Inspecting Cash Payment in Security Audit Log
* **Given** an audit log for action `payment:record-cash` with target `Payment`
* **When** the user clicks "Inspect" in the Audit Trail table
* **Then** the modal defaults to the "Friendly Summary" view
* **And** displays the amount in bold emerald green (`$250.00 USD`)
* **And** displays Payer section: "Ahmed Khan • +923001234567"
* **And** displays Receiver section: "Sara Receptionist (receptionist) • sara@grandhorizon.com"
* **And** displays the associated booking reference `BK-XXXXX`

### Scenario 2: Searching Payment by ID in Manager Analytics
* **Given** a manager is on the `/admin/analytics` page
* **When** they paste a Payment ID `6aba6aed171e374120f238af` into the Payment Search bar and press Enter/Search
* **Then** the system queries `GET /api/v1/admin/analytics/payments/search`
* **And** displays the payment card with amount, status, guest name, cashier name, and date
* **And** lists all associated audit log events for that payment

### Scenario 3: Searching Payment by Booking Reference
* **Given** a guest reference `GH-84729`
* **When** searched in the Manager Analytics search bar
* **Then** all payments associated with that booking reference are returned and displayed

### Scenario 4: Non-Existent Payment Search
* **Given** an invalid or non-existent payment ID
* **When** searched in the search bar
* **Then** a friendly alert "No payment records found matching this identifier" is displayed without crashing the page

---

## 5. UI Blueprints

### 5.1 Audit Modal: Financial Payment Inspector Card
```
+---------------------------------------------------------------------------------------------------------+
| 🛡️ Audit Trail Event: payment:record-cash                                                          [X] |
| Recorded on Sep 28, 2026, 6:14 PM • IP: 127.0.0.1                                                       |
+---------------------------------------------------------------------------------------------------------+
| [ACTOR (AUTHORIZED STAFF)]                       [TARGET ENTITY]                                        |
| Sara Receptionist (receptionist)                 $250.00 USD • [ CASH - COMPLETED ]                     |
| sara@hotel.com                                   Payment ID: 6aba6aed171e374120f238af                   |
+---------------------------------------------------------------------------------------------------------+
| [ 📊 Friendly Summary (Default) ]                  [ 💻 Developer JSON ]                                |
+---------------------------------------------------------------------------------------------------------+
| 💵 FINANCIAL TRANSACTION SUMMARY                                                                        |
| +-----------------------------------------------------------------------------------------------------+ |
| |  TOTAL PAID: $250.00 USD       |  METHOD: Cash at Desk  |  STATUS: Completed (Settled)              | |
| +-----------------------------------------------------------------------------------------------------+ |
|                                                                                                         |
| 👤 KISNE PAY KI? (PAYER / GUEST)                 🏢 KISNE RECEIVE KI? (COLLECTOR / STAFF)               |
| +---------------------------------------------+  +----------------------------------------------------+ |
| | Name: Ahmed Khan                            |  | Name: Sara Receptionist                            | |
| | Phone: +92 300 1234567                      |  | Role: [ RECEPTIONIST ]                             | |
| | Email: ahmed.khan@example.com               |  | Email: sara@hotel.com                              | |
| | Guest ID: 66f543210987654321098766          |  | Staff ID: 6aba6aed171e374120f238a5                 | |
| +---------------------------------------------+  +----------------------------------------------------+ |
|                                                                                                         |
| 🏨 LINKED RESERVATION & STAY DETAILS                                                                    |
| Booking Ref: GH-84729  •  Suites: Deluxe Suite #204  •  Dates: Sep 28, 2026 -> Sep 30, 2026 (2 Nights) |
| Notes / POS Slip: Cash collected at front desk lobby check-in counter                                   |
+---------------------------------------------------------------------------------------------------------+
|                                                                                           [ Close ]     |
+---------------------------------------------------------------------------------------------------------+
```

### 5.2 Manager Analytics: Payment Search Console
```
+---------------------------------------------------------------------------------------------------------+
| 💳 PAYMENT TRANSACTION & AUDIT SEARCH                                                                   |
| Investigate individual payment records by Payment ObjectId, Booking Ref, or POS slip number             |
| [ Search Payment ID (e.g. 6aba...) or Booking Ref (e.g. GH-84729)...                ] [ 🔍 Search ]     |
+---------------------------------------------------------------------------------------------------------+
| MATCHING TRANSACTION RECORD:                                                                            |
| Payment ID: 6aba6aed171e374120f238af  •  Date: Sep 28, 2026, 6:14 PM                                   |
| Amount: $250.00 USD  •  Method: Cash at Desk  •  Status: [ COMPLETED ]                                  |
| Payer (Guest): Ahmed Khan (+92 300 1234567)                                                             |
| Collector (Staff): Sara Receptionist (receptionist)                                                     |
| Booking Reference: GH-84729 (Suite #204)                                                                |
|                                                                                                         |
| 📜 IMMUTABLE AUDIT TIMELINE FOR THIS PAYMENT:                                                           |
| • 2026-09-28 18:14:05 - payment:record-cash by Sara Receptionist (IP: 127.0.0.1)                        |
| • 2026-09-28 18:14:00 - desk:walk-in-booking by Sara Receptionist (Booking Created)                     |
+---------------------------------------------------------------------------------------------------------+
```

---

## 6. Functional Requirements Checklist

### 6.1 Security Audit Modal Enhancements (`AuditPayloadModal.jsx`)
1. In `targetInfo`: Add `log.targetType === 'Payment'` handler displaying formatted amount, payment provider, and currency.
2. In Friendly Summary: Add `isPaymentAction` condition:
   - Render Amount Hero Banner with status pill and provider.
   - Render **Payer Card** ("Kisne Pay Ki") with guest details.
   - Render **Receiver Card** ("Kisne Receive Ki") with staff member details and role badge.
   - Render Linked Reservation and Room details.
   - Render Transaction reference and cashier notes.
3. In `backend/src/services/desk.service.js`: Enrich `AuditService.logAction` in `recordInPersonPayment` and `createWalkInBooking` with complete guest and staff identity snapshots.

### 6.2 Manager Analytics Payment Search (`AdminAnalyticsPage.jsx` & Backend API)
1. **Backend Route & Controller:**
   - Add `GET /api/v1/admin/analytics/payments/search?query=...` in `analytics.routes.js`.
   - Implement `AnalyticsController.searchPayment`:
     - Checks if query is valid ObjectId (searches by `_id`), or searches by `transactionReference`, or finds booking by `bookingReference` and returns its payments.
     - Deep populates `userId`, `receivedByStaffId`, `bookingId`.
     - Queries `AuditLog` collection for events matching `targetId: payment._id` or `bookingId`.
     - Returns `{ payment, auditLogs }`.
2. **Frontend Admin Service (`admin.service.js`):**
   - Add `searchPaymentAudit(query)` calling the new endpoint.
3. **Manager Analytics UI Component (`AdminAnalyticsPage.jsx`):**
   - Add Payment Audit Search Card with input, search button, loading state, and error handling.
   - Render detailed transaction card and collapsible audit log timeline.

---

## 7. Verification & Testing Strategy
1. **Build & Lint Verification:** Run `npm run build` to confirm 0 compilation errors across all modules.
2. **Audit Modal Test:** Inspect a `payment:record-cash` audit log and verify Payer, Receiver, Amount, and Booking details display clearly.
3. **Analytics Search Test:** Copy a Payment ID, paste it into the Manager Analytics search bar, and verify the full payment details and audit history are returned.

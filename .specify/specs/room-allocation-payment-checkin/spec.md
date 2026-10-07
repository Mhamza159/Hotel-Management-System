# Feature Specification: Receptionist-Owned Multi-Room Allocation, Dynamic Pricing, Dual-Gated Settlement & PDF Folio

**Feature Name:** `room-allocation-payment-checkin`  
**Status:** Approved & Implemented ✅  
**Priority:** High (P1)  
**Author:** Antigravity AI  
**Portal Scope:** **Front Desk Receptionist Portal (`/desk`)** — Guest does not pick physical rooms; Receptionist exercises full operational authority.  

---

## 1. Executive Summary & Core Architectural Principle

### 1.1 Separation of Responsibilities (Guest vs Receptionist)
In this modern hotel management architecture, there is a strict separation between what a **Guest** sees and what the **Receptionist** controls:

1. **Guest Side (Online Booking Portal):**
   - The guest only browses and reserves a **Room Category / Type** (e.g., *Deluxe Suite*, *Executive Suite*) and number of units/guests.
   - **Guest DOES NOT see or select physical room numbers (e.g., #201, #202).**
   - The reservation enters the system with status `confirmed` (unallocated physical unit slots).

2. **Receptionist Side (Front Desk Flight-Ops Portal `/desk`):**
   - **100% of room allocation, pricing recalculation, payment collection, check-in, and check-out happen exclusively on the Receptionist Dashboard.**
   - **Step 1 (Physical Allocation):** Receptionist opens the booking in the Arrivals tab, reviews available clean physical rooms (matching suites first, followed by alternative suites), and assigns specific physical units (e.g., adjacent rooms for families, high floor, etc.).
   - **Step 2 (Dynamic Pricing):** The system automatically recalculates the total accommodation bill based on the exact physical units assigned $\times$ stay nights.
   - **Step 3 (Payment Collection Button Unlocked):** Once rooms are allocated, the `[Collect Payment]` button becomes active. The `[Check In]` button remains **Strictly Locked 🔒**.
   - **Step 4 (Flexible Settlement):** Receptionist clicks `[Collect Payment]`, selecting either **Full Payment** or **Partial Advance Deposit**, collects Cash or Card, and records it with logged-in receptionist staff attribution.
   - **Step 5 (Check-In & Keys):** Upon recording verified payment (`paidAmount > 0`), the `[Check In & Issue Keys]` button unlocks (Active Emerald ✅). Receptionist checks in the guest, issues physical keycards, and prints the official **PDF Registration Folio**.
   - **Step 6 (Departure Lock for Partial Dues):** At check-out, if the guest paid partially, the `[Check Out]` button is **Strictly Locked 🔒** on the receptionist's screen until the receptionist collects the remaining dues via `[Settle Balance ($X)]`.

---

### 1.2 Receptionist Sequential Workflow Diagram

```mermaid
graph TD
    subgraph ReceptionistPortal [Receptionist Dashboard / Desk Portal (/desk)]
        A[Guest Arrives at Counter<br/>Booking is Confirmed] --> B[1. Click 'Allot Rooms'<br/>Select Clean Physical Rooms per Slot]
        B --> C[2. Dynamic Price Recalculation<br/>Total Bill Updated from Assigned Rates]
        C --> D[3. Payment Button Shows<br/>Check-In Button Locked 🔒]
        D --> E[4. Click 'Collect Payment'<br/>Options: Full Payment or Partial Deposit]
        E --> F[5. Record Payment at Desk<br/>Cash / POS Card with Staff Attribution]
        F --> G[6. Check-In Button UNLOCKS ✅<br/>Click 'Check In & Issue Keys']
        G --> H[7. Print Official PDF Folio<br/>Physical Room #s, Ledger & Signatures]
        
        I[Guest Departure / Check-Out] --> J{Outstanding Dues Remaining?}
        J -- Yes (Partial Paid) --> K[Check-Out Button BLOCKED 🔒<br/>Click 'Settle Balance ($X)']
        K --> L[Collect Remaining Cash/Card at Desk]
        L --> J
        J -- No ($0 Due) --> M[Check-Out Button UNLOCKED<br/>Rooms Auto-Flip to Dirty for Housekeeping]
    end
```

---

## 2. Core User Stories & Personas

### Primary Persona: Front Desk Receptionist (Front Desk Officer)
- Owns the physical room assignment, rate audits, in-person cash drawer/POS terminal, check-in key issuance, and final departure settlement.

---

### Priority 1 (P1): Receptionist-Owned Sequential Operations

#### **Story 1.1: Physical Room Allocation from Receptionist Console**
> **As a** Front Desk Receptionist,  
> **I want to** click "Allot Rooms" on any incoming arrival to view clean matching category rooms and clean alternative rooms,  
> **So that** I can assign the best available physical rooms to the guest based on their requirements (adjacent, floor, view).

#### **Story 1.2: Multi-Room Slot Allocation for Group Bookings**
> **As a** Front Desk Receptionist,  
> **I want to** allocate each room slot individually when a guest books multiple rooms (e.g. Slot 1 of 2: Room #204, Slot 2 of 2: Room #205),  
> **So that** no physical room is double-assigned and all rooms are guaranteed clean and ready.

#### **Story 1.3: Dynamic Bill Recalculation Upon Allotment**
> **As a** Front Desk Receptionist,  
> **I want** the system to automatically recalculate the total booking price when I allocate alternative or upgraded rooms,  
> **So that** the exact room rates are reflected before collecting payment.

#### **Story 1.4: Payment Intake Before Check-In (Full vs Partial)**
> **As a** Front Desk Receptionist,  
> **I want to** see the "Collect Payment" button appear once rooms are allocated, with options for **Full Settlement** or **Partial Advance Deposit**,  
> **So that** I can collect payment at the counter in cash or card before handing over keys.

#### **Story 1.5: Locked Check-In Button until Payment is Recorded**
> **As a** Front Desk Manager,  
> **I want** the "Check In" button to be strictly disabled/locked on the receptionist dashboard until at least a partial deposit or full payment is recorded in the system,  
> **So that** staff cannot check in any guest or hand out keys without financial settlement.

#### **Story 1.6: Strict Check-Out Lock on Partial Balance Dues**
> **As a** Front Desk Receptionist & Auditor,  
> **I want** the "Check Out" button in the Departures tab to remain locked if the guest only paid partially, displaying an active "Settle Balance ($X)" button,  
> **So that** guests cannot leave the hotel without settling their full balance.

#### **Story 1.7: Printable PDF Registration Folio on Receptionist Desk**
> **As a** Front Desk Receptionist,  
> **I want** a "Print PDF Folio" button to generate an official hotel registration card and tax invoice containing all physical room numbers, itemized nightly rates, payments recorded, remaining balance, and signature blocks,  
> **So that** I can print it for the guest at check-in or check-out.

---

## 3. Detailed Acceptance Criteria (Given / When / Then)

### Scenario 1: Receptionist Allots Rooms & Dynamic Price Updates
- **Given** an arriving booking for 2 rooms with status `confirmed` (unallocated),
- **When** the receptionist views the booking on `/desk` (Arrivals tab),
- **Then** the primary action button is **`[Allot Rooms]`** (Gold),
- **When** the receptionist clicks **`[Allot Rooms]`**,
- **Then** the modal displays:
  - `Slot 1: Deluxe Suite` $\to$ lists clean Deluxe rooms (e.g. #201, #202) and alternatives.
  - `Slot 2: Deluxe Suite` $\to$ lists remaining clean rooms, preventing duplicate selection of #201.
  - Live ledger: `Original: $400 → New Total: $440 (Adjustment: +$40)`.
- **When** the receptionist clicks **`[Confirm Allotment]`**,
- **Then** the physical rooms are locked to this booking, `totalPrice` is dynamically updated to `$440`, and `isAllocated` is set to `true`.

---

### Scenario 2: Payment Gatekeeping on Receptionist Dashboard
- **Given** the booking has physical rooms allotted (`isAllocated = true`) and `$0` paid,
- **When** the receptionist views the booking on `/desk`,
- **Then** the **`[Check In]`** button is **LOCKED / DISABLED 🔒** with tooltip:
  *"Check-in locked: Must collect at least a partial deposit or full payment before issuing room keys"*,
- **And** an active button **`[Collect Payment]`** (Teal/Emerald) is displayed.

---

### Scenario 3: Receptionist Records Partial Deposit or Full Payment
- **Given** the receptionist clicks **`[Collect Payment]`**,
- **When** the modal opens,
- **Then** two payment options are available:
  - **`[Pay in Full ($440.00)]`** $\to$ sets amount to $440.00.
  - **`[Partial Deposit ($)]`** $\to$ allows entering custom advance deposit (e.g., $200.00).
- **When** the receptionist chooses **`[Partial Deposit]`**, enters `$200.00`, selects `Cash`, and confirms,
- **Then** a `Payment` record is created with `receivedByStaffId` attributed to the receptionist,
- **And** `booking.paidAmount` becomes `$200.00`, `remainingBalance` becomes `$240.00`, and `paymentStatus` becomes `partially-paid`,
- **And** the **`[Check In & Issue Keys]`** button immediately UNLOCKS (Active Emerald ✅).

---

### Scenario 4: Receptionist Executes Check-In & Prints PDF Folio
- **Given** the booking has rooms allocated and `paidAmount > 0`,
- **When** the receptionist clicks **`[Check In & Issue Keys]`**,
- **Then** the booking status transitions to `checked-in`, and rooms transition to `occupied`,
- **When** the receptionist clicks **`[Print Official PDF Folio]`**,
- **Then** an official A4 PDF streams containing:
  - Physical room numbers: `Room #201 - DELUXE SUITE`, `Room #202 - DELUXE SUITE`.
  - Itemized rates, total accommodation bill ($440.00).
  - Payments log: `$200.00 Cash received at check-in`.
  - High-contrast settlement pill: `OUTSTANDING DUE: $240.00`.
  - Guest signature line and Front Desk Officer stamp area.

---

### Scenario 5: Strict Check-Out Lock on Receptionist Console
- **Given** a checked-in guest with an outstanding balance of `$240.00`,
- **When** the receptionist views the booking in the Departures tab on `/desk`,
- **Then** the **`[Check Out]`** button is **LOCKED / DISABLED 🔒** with tooltip:
  *"Check-out locked: Guest has outstanding balance of $240.00. Settle remaining dues first."*,
- **And** a prominent **`[Settle $240.00]`** button (Amber) is displayed,
- **When** the receptionist clicks **`[Settle $240.00]`** and records the remaining `$240.00` payment,
- **Then** `remainingDues` becomes `$0.00`, and the **`[Check Out]`** button immediately UNLOCKS (Active Red),
- **When** the receptionist clicks **`[Check Out]`**,
- **Then** status becomes `checked-out`, and both physical rooms automatically flip to `dirty` for housekeeping.

---

## 4. Receptionist Dashboard Action Matrix

### Arrivals View (`/desk` -> Arrivals Tab)
| Physical Rooms Allotted? | Total Paid | Remaining Balance | Check-In Button State | Receptionist Available Actions |
|---|---|---|---|---|
| **No** (Pending allocation) | Any | Any | **Hidden** | `[Allot Rooms]` (Gold) |
| **Yes** (Units assigned) | $0 | 100% | **LOCKED 🔒** (Disabled) | `[Collect Payment]` (Teal) |
| **Yes** (Units assigned) | > $0 (Partial) | > $0 | **UNLOCKED ✅** (Emerald) | `[Check In & Issue Keys]`, `[Print PDF Folio]` |
| **Yes** (Units assigned) | 100% (Full) | $0.00 | **UNLOCKED ✅** (Emerald) | `[Check In & Issue Keys]`, `[Print PDF Folio]` |

---

### Departures View (`/desk` -> Departures Tab)
| Status | Total Paid | Remaining Balance | Check-Out Button State | Receptionist Available Actions |
|---|---|---|---|---|
| **Checked-In** | Partial (< 100%) | > $0 | **LOCKED 🔒** (Disabled) | `[Settle Balance ($X)]` (Amber), `[Print PDF Folio]` |
| **Checked-In** | 100% (Full) | $0.00 | **UNLOCKED ✅** (Active Red) | `[Check Out Guest]`, `[Print Final PDF Invoice]` |

---

## 5. Security & Permission Guards (PBAC)
- All endpoints (`/api/v1/desk/*`) are strictly protected:
  - **`checkin:manage`**: Required for room allotment and checking in guests.
  - **`checkout:manage`**: Required for checking out guests.
  - **`payments:recordCash` / `payments:recordCard`**: Required for recording desk payments.
- Regular guests cannot call these endpoints (returns HTTP 403 Forbidden).

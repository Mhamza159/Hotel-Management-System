# Feature Specification: Human-Readable Audit Trail Payload Inspector & Generic Target Entity Attribution

**Feature Name:** `audit-log-human-readable-payload-inspector`  
**Status:** Draft / Ready for Plan 📋  
**Priority:** High (P1)  
**Author:** Antigravity AI  
**Scope:** Security Audit Trail (`AuditPayloadModal.jsx`, `AdminAuditLogsPage.jsx`), Audit Service (`audit.service.js`), and Auth Controller (`auth.controller.js`).

---

## 1. Executive Summary & Problem Statement

### 1.1 Problem Statement
Currently, when a Super Admin or Manager views an audit trail event in the **Security Audit Trail** modal (`AuditPayloadModal.jsx`):
1. **Opaque Target Entity Card:** The target entity simply says `User` with a cryptic MongoDB ObjectId (`ID: 6ab652755ac5487e5a7012dd`). It does **not** indicate which staff role was targeted (e.g. `receptionist`, `housekeeping`, `super-admin`), nor does it show the staff member's human name or email.
2. **Cryptic Raw JSON for Non-Coders:** Inspecting an audit event displays raw, dense JSON (`{ "_id": "...", "actorId": {...}, "beforeState": {...} }`). Non-technical hotel managers, auditors, and front desk supervisors cannot easily decipher raw code syntax, curly braces, and permission key arrays.
3. **No Visual Permission Diff:** When permissions are updated (`staff:permission-update`), the system does not visually highlight which specific permissions were **added** (granted) versus **removed** (revoked).

### 1.2 Proposed Solution
Transform the Audit Trail Inspector into a **Human-Readable & Non-Coder Friendly** diagnostic experience:
1. **Generic & Role-Attributed Target Entity Card:**
   - Display the specific target role with a colored badge (e.g. `Receptionist` in Aqua, `Housekeeping` in Emerald, `Super Admin` in Gold).
   - Display the Target Name and Email if available in the snapshot payload or populated reference.
   - For non-user entities (e.g. `Room`, `Booking`, `Payment`), show clear human labels (e.g. `Room Suite #304 (Deluxe)`, `Booking #GH-7841`, `Stripe Payment $450`).
2. **Human-Friendly Visual Summary (Default View):**
   - **Event Narrative Card:** Clear sentence explaining the event (e.g., *"Super Administrator updated permissions for Receptionist (Jane Doe) on Sept 28, 2026"*).
   - **Permission Changes Breakdown:**
     - **Newly Granted (+)**: Emerald green pill badges (`+ View Room Inventory (rooms:view)`).
     - **Revoked (-)**: Rose red pill badges (`- Audit Cancellations (bookings:cancel)`).
     - **Role Changes**: Visual pill transition (`receptionist → super-admin`).
     - **Status**: Account Active indicator.
3. **Dual View Tabs (Friendly Summary vs Developer JSON):**
   - **Tab 1: 📊 Friendly Summary (Default):** Clean visual cards, diff tags, formatted timestamps, and key-value tables. Zero raw JSON brackets.
   - **Tab 2: 💻 Developer JSON:** The raw, immutable payload for legal compliance, technical debugging, and export with a "Copy JSON" button.
4. **Backend Payload Enrichment:**
   - Ensure `auth.controller.js` captures `name`, `email`, and `role` in `beforeState` and `afterState`.

---

## 2. Core Architectural Principles & Zero-Bloat Rules

1. **Backward & Forward Compatibility:**
   - The inspector must gracefully handle both existing legacy logs (where `targetId` is a plain string ID and `beforeState` only has `{ role, permissions }`) and new enriched logs (with `{ name, email, role, permissions }`).
2. **Zero New External Dependencies:**
   - Leverage existing Material UI components, Tailwind CSS tokens, and Lucide icons already installed in the frontend.
3. **Dual Theme Accessibility (Light & Dark):**
   - The modal and badges must adhere to the hotel's luxury Light and Dark design tokens (`bg-surface`, `border-border`, `text-text`, `bg-ink`).
4. **Strict Immutability Preservation:**
   - UI formatting is purely representational. The underlying MongoDB audit record remains strictly append-only and cryptographically untouched.

---

## 3. Prioritized User Stories

### P1: Clear Target Entity Attribution with Role Badges
* **As a** Hotel General Manager or Auditor,  
* **I want** the Target Entity card to clearly show the target's role (e.g., Receptionist, Housekeeper, Admin) and name rather than just a raw "User" label and MongoDB ID,  
* **So that** I immediately understand who was affected by the administrative action.

### P1: Human-Readable Permission Delta Display
* **As a** Non-technical Hotel Administrator,  
* **I want** to see which permissions were added or revoked using clear green (+) and red (-) badges with English labels,  
* **So that** I don't have to decipher raw JSON arrays and permission code keys.

### P2: Segmented View Mode (Friendly Summary vs Raw JSON)
* **As an** Auditor or Developer,  
* **I want** to switch between a human-friendly visual summary and the raw JSON payload,  
* **So that** both non-coders and technical security engineers get the exact representation they need.

### P2: Non-User Entity Human Formatting (Rooms, Bookings, Payments)
* **As a** Hotel Staff Supervisor,  
* **I want** room mutations, booking check-ins, and payments to display formatted currency, room numbers, and booking references instead of database IDs,  
* **So that** audit reports are actionable for day-to-day operations.

---

## 4. Acceptance Criteria (Given / When / Then)

### Scenario 1: Inspecting Permission Update Event
* **Given** an audit log for action `staff:permission-update`
* **When** the Super Admin clicks "Inspect" on the audit log entry
* **Then** the Target Entity card displays the staff member's specific role badge (e.g., `RECEPTIONIST`)
* **And** the modal defaults to the "Friendly Summary" view
* **And** granted permissions are displayed as green pill tags (`+ View Room Inventory (rooms:view)`)
* **And** revoked permissions are displayed as red pill tags (`- Process Cancellations (bookings:cancel)`)

### Scenario 2: Switching to Developer JSON Tab
* **Given** the Audit Payload Modal is open on the Friendly Summary tab
* **When** the user clicks the "Developer JSON" tab
* **Then** the raw immutable JSON payload is displayed in a formatted code block
* **And** clicking "Copy JSON" copies the exact formatted JSON to the clipboard

### Scenario 3: Legacy Audit Log Fallback
* **Given** an older audit log where `name` is missing from `beforeState`
* **When** the modal is opened
* **Then** it derives the role from `beforeState.role` or `afterState.role`
* **And** it displays `Target: Receptionist User` with truncated ID without throwing undefined runtime errors

---

## 5. UI Blueprint

```
+-----------------------------------------------------------------------------------+
| 🛡️ Audit Trail Event: staff:permission-update                                [X] |
| Recorded on Sep 28, 2026, 5:48 PM • IP: ::1                                      |
+-----------------------------------------------------------------------------------+
| [ACTOR (AUTHORIZED STAFF)]             [TARGET ENTITY]                            |
| Super Administrator                    John Doe                                   |
| admin@hotel.com (super-admin)          john@hotel.com • [ RECEPTIONIST ]          |
|                                        ID: 6ab652755ac5487e5a7012dd               |
+-----------------------------------------------------------------------------------+
| [ 📊 Friendly Summary (Default) ]        [ 💻 Developer JSON ]                     |
+-----------------------------------------------------------------------------------+
| EVENT SUMMARY:                                                                    |
| Super Administrator updated access permissions for Receptionist (John Doe).       |
|                                                                                   |
| 🟢 GRANTED PERMISSIONS (+2):                                                      |
|   [+ View Room Inventory (rooms:view)]                                            |
|   [+ Housekeeping Board (housekeeping:update)]                                    |
|                                                                                   |
| 🔴 REVOKED PERMISSIONS (-1):                                                      |
|   [- Process Cancellations (bookings:cancel)]                                     |
|                                                                                   |
| ℹ️ ROLE: [ receptionist ] (Unchanged) • STATUS: [ Active ]                        |
+-----------------------------------------------------------------------------------+
|                                                                     [ Close ]     |
+-----------------------------------------------------------------------------------+
```

---

## 6. Functional Requirements Checklist

1. **`AuditPayloadModal.jsx`**:
   - Add segmented tab control: `Friendly Summary` (active by default) vs `Developer JSON`.
   - Update **Target Entity** card to parse role from `log.afterState?.role || log.beforeState?.role || log.targetType` with role-specific badge styling.
   - Build **Friendly Summary Engine**:
     - Compute added vs removed permissions diff if action is `staff:permission-update`.
     - Render readable permission labels instead of raw keys.
     - For `Room`, `Booking`, and `Payment` actions, render formatted attribute cards.
2. **`auth.controller.js`**:
   - Enrich `beforeState` and `afterState` in `updateUserPermissions` to include `{ name: user.name, email: user.email, role: user.role, permissions: user.permissions }`.
3. **Styling & Accessibility**:
   - Compatible with Light and Dark modes.
   - Copy JSON button in Developer tab.

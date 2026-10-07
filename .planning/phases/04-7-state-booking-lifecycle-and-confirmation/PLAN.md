# Phase 4 Plan: Checkout, My Bookings & 7-State Lifecycle

**Phase:** 4 of 7  
**Directory:** `.planning/phases/04-7-state-booking-lifecycle-and-confirmation/`  
**Related Specs:** [.planning/PROJECT.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/PROJECT.md) | [.planning/ROADMAP.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/ROADMAP.md)  
**Status:** Ready for Execution 🚀

---

## 1. Objective

Implement the application's signature celebratory motion: a deliberate SVG checkmark stroke draw and `#bookingReference` reveal animation upon successful reservation. Strictly enforce the real 7-state booking workflow UI across guest views, ensuring *"Cancellation requested — front desk will review"* warning badges and copy are displayed whenever status is `cancellation_requested`.

---

## 2. Target Files

- `frontend/src/pages/public/RoomDetailPage.jsx`: Confirmed booking modal celebratory motion.
- `frontend/src/components/common/CelebratoryConfirmation.jsx`: Dedicated celebratory animation component.
- `frontend/src/pages/guest/MyBookingsPage.jsx`: Re-skin cards, status badges, stay date chips, cancellation button actions.
- `frontend/src/components/guest/BookingStatusBadge.jsx`: Unified 7-state badge component.

---

## 3. Tasks Breakdown

### Task 4.1: Celebratory Booking Confirmation Animation
- In `CelebratoryConfirmation.jsx`:
  - Circular badge with animated SVG path checkmark drawing smoothly (`pathLength: [0, 1]`, duration 0.6s, easeInOut).
  - Headline in `Fraunces` serif: *"Reservation Confirmed"*.
  - Reference unveil: `#bookingReference` reveals with letter-spacing transition and gold glow (`#C9A15A`).
  - Solid `--surface` modal card with 1px border.
  - Quick action buttons: *"Download Invoice (PDF)"* and *"View My Bookings"*.

### Task 4.2: Enforce 7-State Workflow Badges (`BookingStatusBadge.jsx`)
Map every backend enum value to its exact semantic token and text:
- `pending_payment` -> Warning Pill (`bg-[#E8A33D]/15 text-[#E8A33D]`, "Payment Pending")
- `confirmed` -> Success Pill (`bg-[#3ECF8E]/15 text-[#3ECF8E]`, "Confirmed & Locked")
- `checked_in` -> Aqua Pill (`bg-[#3FD0C9]/15 text-[#3FD0C9]`, "Checked In (Key Issued)")
- `checked_out` -> Neutral Pill (`bg-[#8791A3]/15 text-[#8791A3]`, "Checked Out")
- `cancellation_requested` -> Warning Amber (`bg-[#E8A33D]/20 text-[#E8A33D] border border-[#E8A33D]/40`, "Cancellation Requested — Front Desk Will Review")
- `cancelled` -> Danger Pill (`bg-[#F2545B]/15 text-[#F2545B]`, "Cancelled")
- `refunded` -> Muted Purple/Blue Pill (`bg-indigo-500/15 text-indigo-400`, "Refund Processed")

### Task 4.3: Re-Skin `MyBookingsPage.jsx`
- Replace table/card backgrounds with solid `--surface` (`#131A26`) and 1px borders (`#2A3547`).
- Action buttons:
  - If status is `confirmed`: *"Request Cancellation"* button triggers policy dialog.
  - If status is `cancellation_requested`: Button is disabled and replaced by *"Review in Progress by Front Desk"*.
  - Never display status as *"Cancelled"* prematurely before staff approval.
- Tax Invoice button: Dispatches PDF download with direct feedback toast.

---

## 4. Verification Gates

1. Complete a test booking — verify the celebratory checkmark draw and reference reveal animation.
2. Request a cancellation on a confirmed booking — verify badge immediately switches to *"Cancellation Requested — Front Desk Will Review"* with warning amber styling.
3. Verify PDF download executes smoothly and saves the valid invoice.

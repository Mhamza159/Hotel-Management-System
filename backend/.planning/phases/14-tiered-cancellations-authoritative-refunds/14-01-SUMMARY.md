# Phase 14: Tiered Cancellations & Authoritative Refunds — Summary

**Phase**: 14-tiered-cancellations-authoritative-refunds  
**Plan**: 01  
**Status**: Complete ✅  
**Date**: 2026-09-25

---

## What Was Built

1. **Guest Cancellation Request Flow (`CancellationRequestModal.jsx`)**:
   - Transparent disclosure of the hotel's 3-tier refund policy before submission:
     - **Tier 1 (> 48h notice)**: 100% full refund
     - **Tier 2 (24–48h notice)**: 50% partial refund
     - **Tier 3 (< 24h notice)**: 0% non-refundable
   - Mandatory reason capture and validation.
   - Dispatches `POST /api/v1/bookings/:id/cancel-request`.
   - Adheres strictly to spec: shows "Cancellation requested — front desk will review" and never claims the reservation is cancelled prematurely.

2. **Authoritative Refund Review & Audit Dialog (`CancellationReviewDialog.jsx`)**:
   - Fetches live authoritative calculation from `GET /api/v1/desk/bookings/:id/cancellation-review`.
   - Displays real elapsed time since booking and request, exact remaining hours until check-in, advance paid, and applicable tier badge (`T1: Full Refund (100%)`, `T2: Partial Refund (50%)`, `T3: Non-Refundable (0%)`).
   - Displays calculated authoritative refund amount verbatim from backend.
   - Dual staff actions:
     - **Approve Cancellation**: Calls `PATCH /api/v1/desk/bookings/:id/cancel-approve` to void booking, issue refund, and atomically unlock rooms back into available inventory.
     - **Reject Request**: Requires mandatory `rejectionReason` text before enabling confirmation, calling `PATCH /api/v1/desk/bookings/:id/cancel-reject`.

3. **Front Desk Audit Queue Screen (`DeskCancellationsPage.jsx`)**:
   - Mounted at `/desk/cancellations` under `StaffLayout`.
   - Retrieves live pending requests via `deskService.getCancellationRequests()`.
   - Displays booking reference, guest contact, check-in date, submission timestamp, and guest reason.
   - One-click "Audit & Review" opens the authoritative calculation modal.

4. **Routing & PBAC Integration (`App.jsx`)**:
   - Mounted `/desk/cancellations` protected for Receptionist and Super-Admin roles.
   - Accessible via dynamic PBAC sidebar link with `<Can permission="bookings:view">`.

---

## Verification

- `npm run build`: Production build succeeded in 11.87s (2971 modules transformed, 0 errors).
- All endpoints tested against `my-app/src/routes/desk.routes.js` and `my-app/src/routes/booking.routes.js`.

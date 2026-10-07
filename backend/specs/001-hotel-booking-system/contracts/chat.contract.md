# API Contract: AI Chat Assistant with Confirmation Gates

**Base URL**: `/api/chat`

---

## 1. Guest Assistant Endpoint
- **Method / Route**: `POST /api/chat/user`
- **Auth**: Bearer JWT (`role: user`)
- **Permitted Tools**:
  - `checkAvailability({ checkIn, checkOut, roomType })`
  - `getRoomDetails({ roomType })`
  - `getMyBookings()`
- **Behavior**: Strictly read-only queries scoped to the caller's `user.id`.

---

## 2. Staff Assistant Endpoint
- **Method / Route**: `POST /api/chat/staff`
- **Auth**: Bearer JWT (`role: receptionist` or `super-admin`)
- **Permitted Tools**:
  - `getBookingStatus({ bookingReference })`
  - `getBookingsForDateRange({ from, to })`
  - `getOccupancyStats()`
- **Behavior**: Read-only operational metrics and status lookups.

---

## 3. Super-Admin Assistant Endpoint
- **Method / Route**: `POST /api/chat/admin`
- **Auth**: Bearer JWT (`role: super-admin`)
- **Permitted Tools**:
  - Read tools (same as staff)
  - `prepareBookingCancellation({ bookingReference, reason })`
- **Confirmation Gate Protocol**:
  - Write actions are NEVER executed automatically by the LLM.
  - When the user asks the model to cancel a booking, the API returns a confirmation challenge:
    ```json
    {
      "success": true,
      "requiresConfirmation": true,
      "pendingAction": {
        "action": "cancelBooking",
        "bookingReference": "BK-782190",
        "confirmationToken": "sign_jwt_token_payload_xyz"
      },
      "message": "Are you sure you want to cancel booking BK-782190? This action cannot be undone."
    }
    ```
  - The admin must submit a secondary confirmation call with `confirmationToken` before any database write occurs.

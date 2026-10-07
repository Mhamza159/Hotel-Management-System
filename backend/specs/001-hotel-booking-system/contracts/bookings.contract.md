# API Contract: Bookings & Reservations

**Base URL**: `/api/bookings`

---

## 1. Create Booking (Atomic & Idempotent)
- **Method / Route**: `POST /api/bookings`
- **Auth**: Bearer JWT (`user`, `receptionist`, or `super-admin`)
- **Headers**:
  - `Idempotency-Key`: `uuidv4-string` (required)
- **Request Body**:
  ```json
  {
    "roomIds": ["651f8a7e2b10a9001b92a201", "651f8a7e2b10a9001b92a202"],
    "checkInDate": "2026-10-01",
    "checkOutDate": "2026-10-05",
    "numberOfGuests": 3,
    "specialRequests": "Quiet room on high floor",
    "couponCode": "SUMMER10",
    "useLoyaltyPoints": 50,
    "paymentMethod": "pay-at-desk"
  }
  ```
- **Responses**:
  - `201 Created`:
    ```json
    {
      "success": true,
      "data": {
        "booking": {
          "id": "651f9b102c11b8001c93b301",
          "bookingReference": "BK-782190",
          "rooms": [
            { "roomId": "651f8a7e2b10a9001b92a201", "pricePerNight": 150 },
            { "roomId": "651f8a7e2b10a9001b92a202", "pricePerNight": 150 }
          ],
          "checkInDate": "2026-10-01T00:00:00.000Z",
          "checkOutDate": "2026-10-05T00:00:00.000Z",
          "totalPrice": 1150,
          "status": "confirmed",
          "paymentStatus": "unpaid"
        }
      }
    }
    ```
  - `409 Conflict`: One or more selected rooms are no longer available for the requested date span (Double-booking prevented).
  - `400 Bad Request`: Validation failure (invalid dates, checkIn >= checkOut, zero rooms).

---

## 2. Guest Self-Service Cancellation
- **Method / Route**: `PATCH /api/bookings/:id/cancel`
- **Auth**: Bearer JWT (Owner of the booking OR user with `bookings:cancel` OR `super-admin`)
- **Request Body**:
  ```json
  {
    "reason": "Change of travel plans"
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Booking cancelled successfully.",
      "data": {
        "bookingId": "651f9b102c11b8001c93b301",
        "status": "cancelled",
        "appliedTier": "100%",
        "refundAmount": 1150,
        "refundStatus": "initiated"
      }
    }
    ```
  - `400 Bad Request`: Booking is already completed, checked in, or cancelled.
  - `403 Forbidden`: Unauthorized user attempting to cancel another guest's booking.

---

## 3. Front Desk Status Toggles
- **PATCH `/api/bookings/:id/check-in`**:
  - Requires `checkin:manage` or `super-admin`.
  - Marks booking `checked-in`, marks assigned rooms occupied.
- **PATCH `/api/bookings/:id/check-out`**:
  - Requires `checkin:manage` or `super-admin`.
  - Marks booking `checked-out` / `completed`, transitions assigned rooms to `dirty`.

---

## 4. Booking Queries
- **GET `/api/bookings/my`**: List logged-in user's bookings.
- **GET `/api/admin/bookings`**: List all bookings with date, room, status, and guest filters. Requires `bookings:view` or `super-admin`.
- **GET `/api/bookings/:id/invoice`**: Generate and stream PDF invoice (pdfkit).

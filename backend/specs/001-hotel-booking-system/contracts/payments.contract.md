# API Contract: Payments & In-Person Desk Checkout

**Base URL**: `/api/payments` & `/api/bookings/:id`

---

## 1. Create Online Payment Intent (Stripe)
- **Method / Route**: `POST /api/payments/create-intent`
- **Auth**: Bearer JWT
- **Headers**:
  - `Idempotency-Key`: `uuidv4-string`
- **Request Body**:
  ```json
  {
    "bookingId": "651f9b102c11b8001c93b301"
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "data": {
        "clientSecret": "pi_3N4abc_secret_xyz",
        "amount": 115000,
        "currency": "usd"
      }
    }
    ```

---

## 2. Payment Webhook (Stripe / Razorpay)
- **Method / Route**: `POST /api/payments/webhook`
- **Auth**: Public (Cryptographic signature verification via `stripe-signature` header)
- **Payload**: Raw Stripe webhook payload (`payment_intent.succeeded`).
- **Processing**: Transitions `Booking.paymentStatus` to `'paid'`, sends confirmation email and PDF receipt.

---

## 3. Record In-Person Desk Payment (Cash / Offline Card)
- **Method / Route**: `POST /api/bookings/:id/record-payment`
- **Auth**: Bearer JWT (Requires `payments:recordCash` for cash, `payments:recordCard` for offline card, or `super-admin`)
- **Request Body**:
  ```json
  {
    "amount": 1150,
    "provider": "cash",
    "notes": "Physical cash collected in Front Desk Drawer A - Receipt #4410"
  }
  ```
- **Responses**:
  - `201 Created`:
    ```json
    {
      "success": true,
      "message": "Payment recorded successfully.",
      "data": {
        "payment": {
          "id": "651fa1003d12c9001d94c401",
          "bookingId": "651f9b102c11b8001c93b301",
          "amount": 1150,
          "provider": "cash",
          "status": "succeeded",
          "receivedByStaffId": "651f8a7e2b10a9001b92a150",
          "notes": "Physical cash collected in Front Desk Drawer A - Receipt #4410"
        },
        "booking": {
          "id": "651f9b102c11b8001c93b301",
          "paymentStatus": "paid"
        }
      }
    }
    ```
  - `400 Bad Request`: Payment amount exceeds outstanding balance.
  - `403 Forbidden`: User lacks appropriate `payments:recordCash` or `payments:recordCard` permission.

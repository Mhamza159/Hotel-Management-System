# 🏨 Grand Horizon Hotel Management System
## Master Frontend Technical Specification & AI Blueprint
> **Purpose:** This specification is an exhaustive, production-grade technical contract designed specifically for AI code generation agents (Claude 3.7/Sonnet, GPT-4o, Cursor, Gemini) and frontend engineering teams to build the complete, pixel-perfect frontend application (React, Next.js, Vite, Tailwind CSS, Shadcn UI) with 100% backend parity and zero missing features.

---

## 📑 Table of Contents
1. [System Architecture & API Conventions](#1-system-architecture--api-conventions)
2. [User Personas, Roles & Dynamic PBAC Matrix](#2-user-personas-roles--dynamic-pbac-matrix)
3. [Global Enums & Data Constants](#3-global-enums--data-constants)
4. [Complete API Endpoints Specification](#4-complete-api-endpoints-specification)
   - [4.1 Module 1: Authentication & Password Recovery](#41-module-1-authentication--password-recovery)
   - [4.2 Module 2: Staff & PBAC Administration](#42-module-2-staff--pbac-administration)
   - [4.3 Module 3: Public Room Discovery & Catalog](#43-module-3-public-room-discovery--catalog)
   - [4.4 Module 4: Room & Inventory Management (Admin/Housekeeping)](#44-module-4-room--inventory-management-adminhousekeeping)
   - [4.5 Module 5: Guest Booking & Checkout Flow](#45-module-5-guest-booking--checkout-flow)
   - [4.6 Module 6: Front Desk Operations](#46-module-6-front-desk-operations)
   - [4.7 Module 7: Tiered Cancellations & Authoritative Refunds](#47-module-7-tiered-cancellations--authoritative-refunds)
   - [4.8 Module 8: Guest Loyalty, Reviews, Wishlists & Waitlists](#48-module-8-guest-loyalty-reviews-wishlists--waitlists)
   - [4.9 Module 9: Managerial Analytics & Audit Intelligence](#49-module-9-managerial-analytics--audit-intelligence)
   - [4.10 Module 10: Multi-Role AI Concierge & Chat Assistant](#410-module-10-multi-role-ai-concierge--chat-assistant)
5. [Frontend Application Architecture & Page Routing](#5-frontend-application-architecture--page-routing)
6. [UI Components, Layouts & Screen State Requirements](#6-ui-components-layouts--screen-state-requirements)
7. [Network Layer, Token Refresh & Idempotency Blueprint](#7-network-layer-token-refresh--idempotency-blueprint)

---

## 1. System Architecture & API Conventions

### 1.1 Base Configuration
- **Backend Base URL:** `http://localhost:5000`
- **API Prefix:** `/api/v1`
- **Interactive OpenAPI Documentation:** `http://localhost:5000/api-docs`
- **Health Check Endpoint:** `GET /health` (Response: `{ status: "ok", timestamp: string, uptime: number }`)

### 1.2 Authentication & Security Headers
- **Access Token:** Sent via HTTP header `Authorization: Bearer <accessToken>`.
- **JWT Expiry & Refresh:** Access tokens expire in 15 minutes; Refresh tokens expire in 7 days.
- **Network Mutation Guard:** Mutations on reservations support or require the `Idempotency-Key` header (UUID v4 string) to prevent double billing on network retry.

### 1.3 Uniform API Envelopes

#### Standard Success Response (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful description",
  "data": { ... }
}
```

#### Standard Error Response (`400`, `401`, `403`, `404`, `409`, `500`)
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Human-readable error explanation",
  "errors": [
    "Validation error item 1",
    "Validation error item 2"
  ]
}
```

---

## 2. User Personas, Roles & Dynamic PBAC Matrix

The system implements **Permission-Based Access Control (PBAC)** with dynamic permission overrides stored on individual user records.

### 2.1 User Roles (`ROLES`)
| Role Key | Name | Primary Responsibility |
| :--- | :--- | :--- |
| `user` | **Guest** | Browses rooms, books stays, manages personal bookings, reviews, wishlists, waitlists. |
| `receptionist` | **Front Desk** | Checks guests in/out, records cash/card payments, inspects arrivals/departures, handles cancellations. |
| `housekeeping` | **Housekeeping** | Updates room cleanliness statuses (`clean`, `dirty`, `cleaning`, `maintenance`). |
| `super-admin` | **Super Admin** | Full root bypass. Manages staff permissions, creates/edits rooms, views analytics, audits, and global bookings. |

### 2.2 Granular Permissions (`PERMISSIONS`)
```javascript
{
  ROOMS_CREATE: "rooms:create",
  ROOMS_UPDATE: "rooms:update",
  ROOMS_DELETE: "rooms:delete",
  ROOMS_VIEW: "rooms:view",
  ROOMS_PRICE_UPDATE: "rooms:priceUpdate",
  BOOKINGS_CREATE: "bookings:create",
  BOOKINGS_VIEW: "bookings:view",
  BOOKINGS_CONFIRM: "bookings:confirm",
  BOOKINGS_CANCEL: "bookings:cancel",
  CHECKIN_MANAGE: "checkin:manage",
  CHECKOUT_MANAGE: "checkout:manage",
  HOUSEKEEPING_UPDATE: "housekeeping:update",
  PAYMENTS_RECORD_CASH: "payments:recordCash",
  PAYMENTS_RECORD_CARD: "payments:recordCard",
  PAYMENTS_REFUND: "payments:refund",
  STAFF_MANAGE: "staff:manage",
  ANALYTICS_VIEW: "analytics:view",
  AUDIT_VIEW: "audit:view",
  COUPONS_MANAGE: "coupons:manage",
  WAITLIST_MANAGE: "waitlist:manage"
}
```

> **Crucial Frontend Rule:** A user has access to a protected screen or button if:
> 1. `user.role === "super-admin"` (Implicit bypass to all features), **OR**
> 2. `user.permissions.includes(requiredPermission)`.

---

## 3. Global Enums & Data Constants

### 3.1 Booking Status (`BOOKING_STATUS`)
- `pending`: Reservation created, awaiting initial payment or confirmation.
- `confirmed`: Room reserved and guaranteed.
- `checked-in`: Guest physically verified and handed keys.
- `checked-out`: Stay completed, room transferred to Housekeeping (`dirty`).
- `cancellation-requested`: Guest submitted cancellation; pending desk audit.
- `cancelled`: Reservation voided, inventory released.
- `completed`: Final settlement archived.

### 3.2 Payment Status (`PAYMENT_STATUS`)
- `pending`: Zero or incomplete payment recorded.
- `completed`: Full balance cleared.
- `failed`: Transaction rejected.
- `refunded`: Refund processed according to cancellation policy.

### 3.3 Payment Providers & Methods (`PAYMENT_PROVIDERS`)
- `cash`: Physical paper currency collected at front desk.
- `offline-card`: Physical POS card terminal swipe at front desk.
- `stripe`: Online payment gateway (Deferred / Placeholder).

### 3.4 Room Types (`ROOM_TYPES`)
- `single`: Single occupancy, 1 bed.
- `double`: Double occupancy, 1-2 beds.
- `deluxe`: Premium amenities and space.
- `suite`: Executive parlor and luxury suite.
- `presidential`: Ultra-luxury top-tier suite.

### 3.5 Housekeeping Statuses (`HOUSEKEEPING_STATUS`)
- `clean`: Inspected and ready for guest check-in.
- `dirty`: Checked out or requires servicing.
- `cleaning`: Housekeeping staff currently working in room.
- `maintenance`: Physical repairs or service out-of-order.

### 3.6 Tiered Cancellation Refund Windows (`REFUND_TIERS`)
- **Tier 1 (Full 100% Refund):** Cancelled `>= 48 hours` before check-in time.
- **Tier 2 (Partial 50% Refund):** Cancelled `>= 24 hours` and `< 48 hours` before check-in.
- **Tier 3 (Zero 0% Refund):** Cancelled `< 24 hours` before check-in (or post-check-in).

---

## 4. Complete API Endpoints Specification

### 4.1 Module 1: Authentication & Password Recovery

#### `POST /api/v1/auth/register`
- **Access:** Public (Rate Limited)
- **Request Body:**
  ```json
  {
    "name": "John Doe",
    "email": "guest@example.com",
    "password": "Password123!",
    "phone": "+1234567890"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "User registered successfully",
    "data": {
      "user": {
        "_id": "67...",
        "name": "John Doe",
        "email": "guest@example.com",
        "role": "user",
        "permissions": ["bookings:create", "bookings:view"]
      },
      "tokens": {
        "accessToken": "eyJhbGciOi...",
        "refreshToken": "eyJhbGciOi..."
      }
    }
  }
  ```

#### `POST /api/v1/auth/login`
- **Access:** Public (Rate Limited)
- **Request Body:**
  ```json
  {
    "email": "guest@example.com",
    "password": "Password123!"
  }
  ```
- **Response (200 OK):** Same structure as Register (`user` + `tokens`).

#### `POST /api/v1/auth/refresh-token`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "refreshToken": "eyJhbGciOi..."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
  ```

#### `GET /api/v1/auth/me`
- **Access:** Authenticated (`Bearer <token>`)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "_id": "67...",
        "name": "John Doe",
        "email": "guest@example.com",
        "role": "user",
        "permissions": ["bookings:create", "bookings:view"],
        "loyaltyPoints": 250,
        "isActive": true
      }
    }
  }
  ```

#### `POST /api/v1/auth/forgot-password`
- **Access:** Public (Rate Limited)
- **Request Body:**
  ```json
  {
    "email": "guest@example.com"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "If that email is registered, a password reset token has been sent."
  }
  ```

#### `POST /api/v1/auth/reset-password`
- **Access:** Public
- **Query or Body:** `token` (64-character hex string)
- **Request Body:**
  ```json
  {
    "token": "4a82b9...",
    "password": "NewSecurePassword123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Password has been reset successfully. Please log in with your new password."
  }
  ```

---

### 4.2 Module 2: Staff & PBAC Administration

#### `GET /api/v1/auth/permissions`
- **Access:** Requires `staff:manage` or `super-admin`
- **Description:** Returns all available system roles, permissions list, and default template configurations for constructing the permissions matrix UI.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "roles": ["user", "receptionist", "housekeeping", "super-admin"],
      "permissions": ["rooms:create", "rooms:update", "..."],
      "defaultRoleTemplates": {
        "receptionist": ["checkin:manage", "checkout:manage", "..."]
      }
    }
  }
  ```

#### `GET /api/v1/auth/staff`
- **Access:** Requires `staff:manage` or `super-admin`
- **Description:** Returns a list of all staff accounts (`receptionist`, `housekeeping`, `super-admin`).

#### `POST /api/v1/auth/staff`
- **Access:** Requires `staff:manage` or `super-admin`
- **Request Body:**
  ```json
  {
    "name": "Jane Receptionist",
    "email": "jane@hotel.com",
    "password": "TempStaffPassword123!",
    "role": "receptionist",
    "phone": "+1987654321",
    "permissions": ["checkin:manage", "checkout:manage", "payments:recordCash"]
  }
  ```

#### `PATCH /api/v1/auth/users/:id/permissions`
- **Access:** Requires `staff:manage` or `super-admin`
- **Request Body:**
  ```json
  {
    "role": "receptionist",
    "permissions": ["checkin:manage", "checkout:manage", "analytics:view"]
  }
  ```

---

### 4.3 Module 3: Public Room Discovery & Catalog

#### `GET /api/v1/rooms/available`
- **Access:** Public
- **Query Parameters:**
  - `checkInDate` (Required, YYYY-MM-DD)
  - `checkOutDate` (Required, YYYY-MM-DD, must be > checkInDate)
  - `type` (Optional: `single`, `double`, `deluxe`, `suite`, `presidential`)
  - `capacity` (Optional: integer >= 1)
  - `minPrice` / `maxPrice` (Optional: numbers)
  - `page` / `limit` (Optional: default 1 and 10)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "rooms": [
        {
          "_id": "67...",
          "roomNumber": "101",
          "type": "deluxe",
          "pricePerNight": 150,
          "capacity": 2,
          "description": "Spacious sea-facing room with king bed",
          "amenities": ["WiFi", "Ocean View", "Mini-bar", "Balcony"],
          "images": [
            {
              "url": "https://res.cloudinary.com/.../room101.jpg",
              "publicId": "hotel/rooms/room101_1"
            }
          ],
          "housekeepingStatus": "clean",
          "isActive": true
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 14,
        "pages": 2
      }
    }
  }
  ```

#### `GET /api/v1/rooms/:id`
- **Access:** Public
- **Description:** Returns complete room metadata and photo gallery.

#### `GET /api/v1/rooms/:id/reviews`
- **Access:** Public
- **Query Parameters:** `page`, `limit`
- **Description:** Returns paginated guest reviews, ratings (1-5 stars), and review comments for a room.

---

### 4.4 Module 4: Room & Inventory Management (Admin/Housekeeping)

#### `GET /api/v1/rooms/admin/all`
- **Access:** Requires `rooms:view` or `super-admin`
- **Query Parameters:** `page`, `limit`, `type`, `housekeepingStatus`, `isActive`
- **Description:** Returns all rooms including dirty, cleaning, or inactive rooms for the management console.

#### `POST /api/v1/rooms`
- **Access:** Requires `rooms:create` or `super-admin`
- **Request Body:**
  ```json
  {
    "roomNumber": "304",
    "type": "suite",
    "pricePerNight": 320,
    "capacity": 4,
    "description": "Executive two-bedroom suite with private spa.",
    "amenities": ["WiFi", "Jacuzzi", "Living Room", "Espresso Machine"]
  }
  ```

#### `PATCH /api/v1/rooms/:id`
- **Access:** Requires `rooms:update` or `super-admin`
- **Request Body:** Any subset of room fields (`pricePerNight`, `capacity`, `type`, `amenities`, `isActive`, `description`).

#### `DELETE /api/v1/rooms/:id`
- **Access:** Requires `rooms:delete` or `super-admin`
- **Description:** Soft-deletes room (`isActive = false`). Backend automatically rejects if active future bookings exist for this room.

#### `PATCH /api/v1/rooms/:id/housekeeping`
- **Access:** Requires `housekeeping:update` or `super-admin`
- **Request Body:**
  ```json
  {
    "housekeepingStatus": "clean",
    "notes": "Deep sanitized, fresh linen provided."
  }
  ```

#### `POST /api/v1/rooms/:id/images`
- **Access:** Requires `rooms:update` or `super-admin`
- **Content-Type:** `multipart/form-data`
- **Payload:** File input field name `images` (Up to 5 images, jpg/jpeg/png/webp, max 5MB each). Uploads to Cloudinary.

#### `DELETE /api/v1/rooms/:id/images`
- **Access:** Requires `rooms:update` or `super-admin`
- **Request Body:**
  ```json
  {
    "publicId": "hotel/rooms/room304_2"
  }
  ```

---

### 4.5 Module 5: Guest Booking & Checkout Flow

#### `POST /api/v1/bookings`
- **Access:** Authenticated (`Bearer <token>`)
- **Headers:** `Idempotency-Key: <UUID-v4>` (Recommended to prevent duplicate reservation)
- **Request Body:**
  ```json
  {
    "rooms": [
      {
        "roomId": "67...",
        "pricePerNight": 150
      }
    ],
    "checkInDate": "2026-12-01",
    "checkOutDate": "2026-12-05",
    "numberOfGuests": 2,
    "specialRequests": "Late check-in, ground floor if possible",
    "paymentMethod": "cash"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Booking created successfully",
    "data": {
      "booking": {
        "_id": "67...",
        "bookingReference": "GRH-20261201-9872",
        "user": "67...",
        "rooms": ["67..."],
        "checkInDate": "2026-12-01T00:00:00.000Z",
        "checkOutDate": "2026-12-05T00:00:00.000Z",
        "numberOfNights": 4,
        "totalAmount": 600,
        "paidAmount": 0,
        "status": "pending",
        "paymentStatus": "pending"
      }
    }
  }
  ```

#### `GET /api/v1/bookings/my`
- **Access:** Authenticated (`Bearer <token>`)
- **Query Parameters:** `page`, `limit`
- **Description:** Returns paginated booking history for the logged-in guest.

#### `GET /api/v1/bookings/:id`
- **Access:** Authenticated (Guest who owns booking OR Staff with `bookings:view`)
- **Description:** Full booking details, room populated info, timeline, and invoice metadata.

#### `POST /api/v1/bookings/:id/cancel-request`
- **Access:** Authenticated (Guest who owns booking)
- **Request Body:**
  ```json
  {
    "reason": "Family emergency, unable to travel."
  }
  ```
- **Description:** Transitions booking status to `cancellation-requested` and sends it to the Front Desk audit queue.

#### `GET /api/v1/bookings/:id/invoice`
- **Access:** Authenticated (Guest owner or Staff)
- **Description:** Streams dynamically generated PDF tax invoice directly (`Content-Type: application/pdf`). Frontend can trigger browser download or render in PDF viewer.

---

### 4.6 Module 6: Front Desk Operations

#### `GET /api/v1/desk/bookings`
- **Access:** Requires `bookings:view` or `super-admin`
- **Query Parameters:**
  - `type`: `arrivals` (checkInDate == today), `departures` (checkOutDate == today), or `in-house` (status == checked-in)
  - `date`: Optional date filter (YYYY-MM-DD, defaults to current date)
  - `page` / `limit`
- **Response (200 OK):** Operational view of guests arriving, departing, or currently staying.

#### `PATCH /api/v1/desk/bookings/:id/check-in`
- **Access:** Requires `checkin:manage` or `super-admin`
- **Description:** Verifies guest identification and transitions status to `checked-in`. Validates room is clean.

#### `PATCH /api/v1/desk/bookings/:id/check-out`
- **Access:** Requires `checkout:manage` or `super-admin`
- **Description:** Checks out guest, sets booking status to `checked-out`, and automatically sets all associated rooms' housekeeping status to `dirty`.

#### `POST /api/v1/desk/bookings/:id/payments`
- **Access:** Requires `payments:recordCash` or `payments:recordCard`
- **Request Body:**
  ```json
  {
    "amount": 600,
    "paymentMethod": "cash",
    "reference": "Receipt #POS-48912"
  }
  ```
- **Description:** Records an in-person payment, updates `paidAmount`, and marks `paymentStatus = "completed"`.

---

### 4.7 Module 7: Tiered Cancellations & Authoritative Refunds

#### `GET /api/v1/desk/cancellation-requests`
- **Access:** Requires `bookings:view` or `super-admin`
- **Query Parameters:** `page`, `limit`
- **Description:** Returns all bookings currently in `cancellation-requested` status waiting for staff action.

#### `GET /api/v1/desk/bookings/:id/cancellation-review`
- **Access:** Requires `bookings:cancel` or `super-admin`
- **Description:** Authoritative refund calculation engine. Returns exact breakdown:
  ```json
  {
    "success": true,
    "data": {
      "bookingId": "67...",
      "bookingReference": "GRH-20261201-9872",
      "hoursUntilCheckIn": 52.4,
      "tier": "Tier 1: >= 48 hours (Full Refund)",
      "refundPercentage": 100,
      "totalPaid": 600,
      "refundAmount": 600,
      "cancellationFee": 0
    }
  }
  ```

#### `PATCH /api/v1/desk/bookings/:id/cancel-approve`
- **Access:** Requires `bookings:cancel` or `super-admin`
- **Description:** Approves cancellation, voids booking, records authoritative refund, and frees room inventory.

#### `PATCH /api/v1/desk/bookings/:id/cancel-reject`
- **Access:** Requires `bookings:cancel` or `super-admin`
- **Request Body:**
  ```json
  {
    "rejectionReason": "Non-refundable corporate promo rate conditions apply."
  }
  ```
- **Description:** Rejects cancellation request, restores booking to `confirmed`.

---

### 4.8 Module 8: Guest Loyalty, Reviews, Wishlists & Waitlists

#### `GET /api/v1/loyalty/balance`
- **Access:** Authenticated Guest
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "loyaltyPoints": 350,
      "tier": "Silver",
      "dollarValueEquivalent": 35.0
    }
  }
  ```

#### `POST /api/v1/reviews`
- **Access:** Authenticated Guest
- **Request Body:**
  ```json
  {
    "bookingId": "67...",
    "roomId": "67...",
    "rating": 5,
    "comment": "Outstanding service and breathtaking ocean view!"
  }
  ```
- **Rule:** User can only review a room they have actually stayed in (`checked-out`).

#### `DELETE /api/v1/reviews/:id`
- **Access:** Review Owner or `super-admin`

#### `GET /api/v1/wishlist`
- **Access:** Authenticated Guest
- **Description:** Returns list of saved rooms.

#### `POST /api/v1/wishlist/:roomId`
- **Access:** Authenticated Guest
- **Description:** Adds a room to the guest's saved wishlist.

#### `DELETE /api/v1/wishlist/:roomId`
- **Access:** Authenticated Guest
- **Description:** Removes room from wishlist.

#### `POST /api/v1/waitlist`
- **Access:** Authenticated Guest
- **Request Body:**
  ```json
  {
    "roomType": "deluxe",
    "desiredCheckIn": "2026-12-24",
    "desiredCheckOut": "2026-12-28",
    "guests": 2
  }
  ```
- **Description:** Subscribes guest to automated alert notifications when a sold-out room date becomes free.

#### `GET /api/v1/waitlist`
- **Access:** Authenticated Guest
- **Description:** Returns active waitlist entries for current user.

#### `DELETE /api/v1/waitlist/:id`
- **Access:** Authenticated Guest
- **Description:** Cancels waitlist notification subscription.

---

### 4.9 Module 9: Managerial Analytics & Audit Intelligence

#### `GET /api/v1/admin/bookings`
- **Access:** Requires `analytics:view` or `super-admin`
- **Query Parameters:**
  - `status`: `pending`, `confirmed`, `checked-in`, `checked-out`, `cancelled`
  - `paymentStatus`: `unpaid`, `partially_paid`, `paid`, `refunded`
  - `fromDate` & `toDate`: Date range filter
  - `search`: Matches bookingReference, guest name, email, or phone
  - `page` & `limit`: Pagination parameters
- **Description:** Global directory of every reservation in the hotel with multi-parameter filtering.

#### `GET /api/v1/admin/analytics/revenue`
- **Access:** Requires `analytics:view` or `super-admin`
- **Query Parameters:** `startDate`, `endDate`, `groupBy` (`day`, `week`, `month`)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "totalRevenue": 145200,
      "breakdown": [
        { "period": "2026-09-01", "revenue": 4800, "bookingsCount": 12 },
        { "period": "2026-09-02", "revenue": 5200, "bookingsCount": 14 }
      ]
    }
  }
  ```

#### `GET /api/v1/admin/analytics/occupancy`
- **Access:** Requires `analytics:view` or `super-admin`
- **Query Parameters:** `startDate`, `endDate`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "overallOccupancyRate": 82.5,
      "totalRooms": 50,
      "occupiedRooms": 41,
      "breakdownByType": {
        "deluxe": 90.0,
        "suite": 75.0,
        "single": 80.0
      }
    }
  }
  ```

#### `GET /api/v1/admin/audit-log`
- **Access:** Requires `audit:view` or `super-admin`
- **Query Parameters:** `action`, `performedBy`, `startDate`, `endDate`, `page`, `limit`
- **Description:** Read-only security audit trail tracking critical actions (cancellations, refunds, role updates, check-ins).

---

### 4.10 Module 10: Multi-Role AI Concierge & Chat Assistant

The system features an autonomous Gemini AI Assistant with 3 specialized role-aware personas:

#### 1. Guest Concierge (`POST /api/v1/chat/user`)
- **Access:** Authenticated Guest
- **Capabilities:** Hotel amenities FAQ, room recommendations, local travel advice, personal booking inquiries.
- **Request Body:**
  ```json
  {
    "message": "Do you have any sea-facing suites available this weekend?"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "reply": "We have 2 Presidential and 3 Deluxe Suites available! You can browse them directly in the rooms section."
    }
  }
  ```

#### 2. Staff AI Assistant (`POST /api/v1/chat/staff`)
- **Access:** Authenticated Staff (`receptionist`, `housekeeping`, `super-admin`)
- **Capabilities:** Quick occupancy summaries, cleaning queue queries, guest check-in lookup.

#### 3. Super-Admin AI Assistant (`POST /api/v1/chat/admin`)
- **Access:** `super-admin` only
- **Capabilities:** High-level administrative queries and dangerous mutations.
- **Two-Phase Confirmation Safety Mechanism:**
  - If the admin asks the AI to perform a high-impact operation (e.g. "Cancel booking GRH-1234" or "Change Room 101 status to maintenance"), the AI does **NOT** execute it immediately.
  - Instead, the AI returns a **dry-run preview** with `requiresConfirmation: true` and an `actionPayload`.
  - **Confirmation Execution:** The frontend prompts the admin with a confirmation modal, and upon approval sends `POST /api/v1/chat/admin/confirm`:
    ```json
    {
      "actionPayload": {
        "action": "CANCEL_BOOKING",
        "bookingId": "67...",
        "reason": "Administrative override"
      }
    }
    ```

---

## 5. Frontend Application Architecture & Page Routing

### 5.1 Route Map & Access Guards

```
/ (Root)
│
├── 🌐 Public Routes (No Auth Required)
│   ├── /                         -> Landing Page (Hero, Amenities, Featured Rooms, Reviews, Search Bar)
│   ├── /rooms                    -> Room Catalog & Availability Filter
│   ├── /rooms/:id                -> Single Room Details & Reviews
│   ├── /login                    -> Guest & Staff Unified Login
│   ├── /register                 -> Guest Registration
│   ├── /forgot-password          -> Request Password Reset Link
│   └── /reset-password           -> Set New Password with Token
│
├── 👤 Guest Protected Routes (Auth Required, Role: 'user')
│   ├── /dashboard                -> Guest Portal Home (Recent Bookings, Loyalty Points)
│   ├── /checkout                 -> Multi-step Booking Reservation & Confirmation
│   ├── /my-bookings              -> Guest Bookings List (Filter: Upcoming, Past, Cancelled)
│   ├── /my-bookings/:id          -> Booking Detail, PDF Invoice Download, Cancel Request Modal
│   ├── /wishlist                 -> Saved Rooms
│   ├── /waitlist                 -> Active Waitlist Subscriptions
│   └── /concierge                -> AI Guest Concierge Interactive Chat Drawer
│
├── 🛎️ Front Desk Routes (Auth Required, Perm: 'checkin:manage' | 'bookings:view')
│   ├── /desk                     -> Front Desk Ops Dashboard (Arrivals, Departures, In-House)
│   ├── /desk/check-in/:id        -> Check-in Inspection & Key Assignment
│   ├── /desk/check-out/:id       -> Check-out Clearance & Folio Summary
│   ├── /desk/payments/:id        -> In-Person Cash / POS Card Payment Modal
│   └── /desk/cancellations       -> Cancellation Review Queue & Refund Tier Breakdown
│
├── 🧹 Housekeeping Routes (Auth Required, Perm: 'housekeeping:update')
│   └── /housekeeping             -> Room Cleanliness Board (Kanban / Grid: Clean, Dirty, Cleaning, Maint)
│
└── 👑 Super-Admin Console (Auth Required, Role: 'super-admin' or 'analytics:view' / 'staff:manage')
    ├── /admin/analytics          -> Managerial Analytics (Revenue, Occupancy Charts)
    ├── /admin/bookings           -> Global Master Bookings Directory (Search, Filter, Export)
    ├── /admin/rooms              -> Room Inventory CRUD & Cloudinary Image Management
    ├── /admin/rooms/new          -> Create New Room
    ├── /admin/rooms/:id/edit     -> Edit Room Specifications
    ├── /admin/staff              -> Staff Directory & Create Staff Modal
    ├── /admin/staff/:id/pbac     -> Dynamic PBAC Permissions Matrix Grid
    ├── /admin/audit-log          -> Security Audit Trail Log Viewer
    └── /admin/ai-assistant       -> Admin AI Copilot with 2-Phase Confirmation Dialog
```

---

## 6. UI Components, Layouts & Screen State Requirements

### 6.1 Design Tokens & Theme Guidance
- **Aesthetic:** Luxury Modern Hospitality (Deep Navy `#0F172A`, Champagne Gold `#D97706` / `#F59E0B`, Crisp Slate `#F8FAFC`, Emerald `#10B981` for Confirmed, Rose `#EF4444` for Cancelled).
- **Typography:** `Inter` or `Plus Jakarta Sans` for clean data tables; `Playfair Display` or `Cinzel` for luxury hotel headings.
- **Glassmorphism:** Subtle backdrops (`backdrop-blur-md bg-white/80 dark:bg-slate-900/80`) on navigation bars and floating booking cards.

### 6.2 Key Screen Specifications

#### 1. Public Search Bar & Filter Bar
- **Inputs:** DateRangePicker (`checkInDate`, `checkOutDate`), Room Type dropdown, Guests count counter.
- **Behavior:** On submit, navigates to `/rooms?checkInDate=...&checkOutDate=...` and queries `/api/v1/rooms/available`.

#### 2. Room Card Component
- **Props:** Room object, onSelect, onWishlistToggle.
- **Visuals:** Image carousel, Badge for Room Type, Amenities pills, Price per night in bold, "Book Now" CTA, and Heart icon for wishlist.

#### 3. Front Desk Operational Dashboard
- **Tabs:** `Arrivals Today`, `Departures Today`, `Currently In-House`.
- **Row Actions:**
  - If status `confirmed` & today is arrival: `Check In` button.
  - If status `checked-in` & today is departure: `Check Out` button.
  - If `paymentStatus` is `pending`: `Record Payment` badge/button.

#### 4. Tiered Cancellation Modal
- Displays dynamic warning before submitting:
  - If `> 48 hrs`: "You are eligible for a 100% full refund."
  - If `24 - 48 hrs`: "You are eligible for a 50% partial refund."
  - If `< 24 hrs`: "Cancellation fee is 100%. No refund will be issued."
- Textarea for required cancellation reason.

#### 5. Dynamic PBAC Permissions Matrix (Admin)
- Table listing all staff members.
- Modal displaying checkbox grid of all 20 `PERMISSIONS` grouped by category (Rooms, Bookings, Desk, Payments, Staff).
- Instant toggle with optimistic UI updates.

#### 6. AI Assistant Drawer
- Accessible via floating button on bottom-right of the screen.
- Role-aware: Detects logged-in user role and routes chat to `/api/v1/chat/user`, `/staff`, or `/admin`.
- Handles action confirmation popups for Super-Admin requests.

---

## 7. Network Layer, Token Refresh & Idempotency Blueprint

### 7.1 Axios / Fetch Client Architecture
The frontend client must implement two interceptors:
1. **Request Interceptor:**
   - Injects `Authorization: Bearer <accessToken>` from state/localStorage.
   - For `POST /api/v1/bookings`, automatically generates and attaches `Idempotency-Key: uuidv4()`.
2. **Response Interceptor (Automatic 401 Silent Token Refresh):**
   - When any API call fails with `401 Unauthorized`:
   - Enqueue failing request.
   - Call `POST /api/v1/auth/refresh-token` with the stored `refreshToken`.
   - Update access token in memory and replay original requests.
   - If refresh fails, clear tokens and redirect user to `/login`.

### 7.2 Form Validations (Zod / Joi Parity)
- **Email:** Standard email format.
- **Password:** Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number.
- **Dates:** `checkOutDate` must strictly be greater than `checkInDate`. Past dates must be disabled in calendar pickers.
- **Phone:** E.164 standard or valid numeric string.
- **Room Capacity & Price:** Positive integers / decimals.

---

### 🏁 Ready for AI Code Generation
Feed this blueprint to your frontend AI prompt:
> *"Use the specifications, endpoints, data types, and UI hierarchy defined in `FRONTEND_SPECIFICATION.md` to construct the entire frontend application using Next.js / Vite, React, Tailwind CSS, and Lucide icons."*

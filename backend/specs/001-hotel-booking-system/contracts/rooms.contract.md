# API Contract: Room Inventory & Housekeeping

**Base URL**: `/api/rooms`

---

## 1. Search Room Availability
- **Method / Route**: `GET /api/rooms/availability`
- **Auth**: Public
- **Query Params**:
  - `checkIn`: `2026-10-01` (required, ISO date string)
  - `checkOut`: `2026-10-05` (required, ISO date string)
  - `type`: `deluxe` (optional, enum: single, double, deluxe, suite)
  - `capacity`: `2` (optional, number)
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "data": {
        "availableRooms": [
          {
            "id": "651f8a7e2b10a9001b92a201",
            "roomNumber": "101",
            "type": "deluxe",
            "capacity": 2,
            "pricePerNight": 150,
            "amenities": ["WiFi", "AC", "Balcony"],
            "images": [
              {
                "url": "https://res.cloudinary.com/hotel/room101.jpg",
                "publicId": "rooms/room101"
              }
            ]
          }
        ]
      }
    }
    ```

---

## 2. Room CRUD Operations
- **GET `/api/rooms`**: List rooms with filtering and pagination (`?page=1&limit=20&type=suite`).
- **GET `/api/rooms/:id`**: Room detail by ID.
- **POST `/api/rooms`**: Create room (Requires `rooms:create` or `super-admin`).
- **PATCH `/api/rooms/:id`**: Edit room details/rate (Requires `rooms:edit` or `super-admin`).
- **DELETE `/api/rooms/:id`**: Soft-delete room (Requires `rooms:delete` or `super-admin`).

---

## 3. Update Housekeeping Status
- **Method / Route**: `PATCH /api/rooms/:id/housekeeping`
- **Auth**: Bearer JWT (Requires `housekeeping:update` or `super-admin`)
- **Request Body**:
  ```json
  {
    "housekeepingStatus": "clean"
  }
  ```
- **Responses**:
  - `200 OK`: Returns updated room document.
  - `400 Bad Request`: Invalid status (must be `clean`, `dirty`, or `maintenance`).
  - `403 Forbidden`: User lacks `housekeeping:update` permission.

---

## 4. Media Asset Management
- **POST `/api/rooms/:id/images`**: Multipart upload (Cloudinary). Requires `rooms:edit` or `super-admin`.
- **DELETE `/api/rooms/:id/images/:imageId`**: Deletes asset from Cloudinary via `public_id` and removes DB reference. Requires `rooms:edit` or `super-admin`.

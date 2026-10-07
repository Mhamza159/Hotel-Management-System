# API Contract: Staff Governance, Audit Log & Analytics

**Base URL**: `/api/admin`

---

## 1. List Staff Accounts
- **Method / Route**: `GET /api/admin/staff`
- **Auth**: Bearer JWT (Super-Admin only)
- **Responses**:
  - `200 OK`: Returns array of staff users with their respective roles, active statuses, and `permissions` arrays.

---

## 2. Create Staff Account
- **Method / Route**: `POST /api/admin/staff`
- **Auth**: Bearer JWT (Super-Admin only)
- **Request Body**:
  ```json
  {
    "name": "Alex Receptionist",
    "email": "alex@hotel.com",
    "password": "TemporaryPassword123!",
    "role": "receptionist",
    "customPermissions": ["bookings:view", "bookings:confirm", "checkin:manage", "housekeeping:update", "payments:recordCash"]
  }
  ```
- **Responses**:
  - `201 Created`: Returns created user profile and dispatches activation email.

---

## 3. Update Granular Staff Permissions
- **Method / Route**: `PATCH /api/admin/staff/:id/permissions`
- **Auth**: Bearer JWT (Super-Admin only)
- **Request Body**:
  ```json
  {
    "permissions": [
      "bookings:view",
      "bookings:confirm",
      "checkin:manage",
      "housekeeping:update",
      "payments:recordCash",
      "payments:recordCard",
      "bookings:cancel"
    ]
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Staff permissions updated.",
      "data": {
        "userId": "651f8a7e2b10a9001b92a150",
        "permissions": [
          "bookings:view",
          "bookings:confirm",
          "checkin:manage",
          "housekeeping:update",
          "payments:recordCash",
          "payments:recordCard",
          "bookings:cancel"
        ]
      }
    }
    ```
- **Side Effect**: Appends change record to `AuditLog` capturing before/after permission state.

---

## 4. Deactivate Staff Account
- **Method / Route**: `PATCH /api/admin/staff/:id/deactivate`
- **Auth**: Bearer JWT (Super-Admin only)
- **Behavior**: Sets `isActive: false`. User's JWT access is immediately rejected on subsequent requests.

---

## 5. Analytics Queries
- **GET `/api/admin/analytics/revenue?from=2026-09-01&to=2026-09-30`**: Total revenue, ADR, RevPAR. (Requires `analytics:view` or `super-admin`).
- **GET `/api/admin/analytics/occupancy?date=2026-09-18`**: Current physical occupancy percentage.
- **GET `/api/admin/audit-log?page=1&limit=50`**: Full administrative audit trail. (Requires `audit:view` or `super-admin`).

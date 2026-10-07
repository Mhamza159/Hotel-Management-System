# Quickstart & Verification Guide: Hotel Booking and Management System

**Branch**: `001-hotel-booking-system` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## 1. Prerequisites

- **Node.js**: v20.x or higher (`node -v`)
- **npm**: v10.x or higher (`npm -v`)
- **MongoDB**: Local replica set instance or MongoDB Atlas connection string (`mongodb+srv://...`) supporting multi-document ACID transactions
- **Stripe Account**: Test mode API keys (`sk_test_...`)
- **Cloudinary**: Cloud name and API keys for room asset management

---

## 2. Environment Configuration

Create a `.env` file in the project root:

```ini
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/hotel_management?replicaSet=rs0
JWT_SECRET=super_secret_jwt_high_entropy_key_32bytes_minimum
JWT_REFRESH_SECRET=super_secret_refresh_jwt_key_32bytes_minimum
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...
CLOUDINARY_CLOUD_NAME=demo_cloud
CLOUDINARY_API_KEY=123456789
CLOUDINARY_API_SECRET=abcdef123456
FRONTEND_URL=http://localhost:3000
```

---

## 3. Installation & Database Setup

```bash
# 1. Install dependencies
npm install

# 2. Seed baseline super-admin and initial room types
npm run seed

# 3. Start local development server
npm run dev
```

The server boots on `http://localhost:5000` with the health check available at `GET http://localhost:5000/api/health`.

---

## 4. End-to-End Verification Scenarios

### Scenario A: Concurrency Safety & Double-Booking Prevention (Automated Jest Test)
Verify that simultaneous booking requests for the same room on overlapping dates result in exactly one success and one conflict rejection:

```bash
npm test tests/integration/booking-concurrency.test.js
```
*Expected Outcome*: 1 request completes with `201 Created` and an active reservation; concurrent overlapping requests fail with `409 Conflict`.

### Scenario B: Dynamic Permission Enforcement & Super-Admin Bypass
Verify that non-super-admin accounts cannot perform unauthorized mutations without the matching permission string:

```bash
npm test tests/unit/permission.test.js
```
*Expected Outcome*: Receptionist without `bookings:cancel` receives `403 Forbidden`; super-admin executes all routes without requiring explicit permission strings.

### Scenario C: Server-Side Authoritative Cancellation & Refund Tiers
Verify that refund calculations reject client amounts and compute strictly based on check-in proximity:

```bash
npm test tests/unit/refund.test.js
```
*Expected Outcome*: >48h returns 100% refund, 24-48h returns 50% refund, <24h returns 0% refund.

### Scenario D: Front Desk In-Person Payment Intake & Staff Attribution
Submit a desk payment using a staff account:

```bash
curl -X POST http://localhost:5000/api/bookings/{bookingId}/record-payment \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"amount": 150, "provider": "cash", "notes": "Cash collected in Desk Drawer"}'
```
*Expected Outcome*: `201 Created` returned; payment document records `receivedByStaffId` matching the authenticated staff user ID.

---

## 5. Next Steps

With the architecture blueprint, data model, contracts, and quickstart complete, run `/speckit-tasks` to generate the phased, test-driven task execution breakdown.

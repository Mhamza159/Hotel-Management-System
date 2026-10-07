# Data Model & State Architecture: Grand Horizon Hotel Frontend

**Feature**: `002-hotel-frontend-system`  
**Date**: 2026-09-25

---

## 1. Domain Entities & Type Definitions

```typescript
// Roles and Permissions
export type Role = "user" | "receptionist" | "housekeeping" | "super-admin";

export type Permission =
  | "rooms:create" | "rooms:update" | "rooms:delete" | "rooms:view" | "rooms:priceUpdate"
  | "bookings:create" | "bookings:view" | "bookings:confirm" | "bookings:cancel"
  | "checkin:manage" | "checkout:manage" | "housekeeping:update"
  | "payments:recordCash" | "payments:recordCard" | "payments:refund"
  | "staff:manage" | "analytics:view" | "audit:view" | "coupons:manage" | "waitlist:manage";

// User Session
export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  permissions: Permission[];
  loyaltyPoints?: number;
  isActive: boolean;
  createdAt: string;
}

// Room Model
export type RoomType = "single" | "double" | "deluxe" | "suite" | "presidential";
export type HousekeepingStatus = "clean" | "dirty" | "cleaning" | "maintenance";

export interface RoomImage {
  url: string;
  publicId: string;
}

export interface Room {
  _id: string;
  roomNumber: string;
  type: RoomType;
  pricePerNight: number;
  capacity: number;
  description: string;
  amenities: string[];
  images: RoomImage[];
  housekeepingStatus: HousekeepingStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Booking Model
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked-in"
  | "checked-out"
  | "cancellation-requested"
  | "cancelled"
  | "completed";

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type PaymentMethod = "cash" | "offline-card" | "stripe";

export interface Booking {
  _id: string;
  bookingReference: string;
  user: User | string;
  rooms: Room[] | string[];
  checkInDate: string;
  checkOutDate: string;
  numberOfNights: number;
  numberOfGuests: number;
  specialRequests?: string;
  totalAmount: number;
  paidAmount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  cancellation?: {
    reason: string;
    requestedAt: string;
    reviewedBy?: string;
    reviewedAt?: string;
    refundAmount?: number;
    rejectionReason?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Cancellation Authoritative Review
export interface CancellationReview {
  bookingId: string;
  bookingReference: string;
  hoursUntilCheckIn: number;
  tier: string;
  refundPercentage: number;
  totalPaid: number;
  refundAmount: number;
  cancellationFee: number;
}
```

---

## 2. Zustand Client State Stores

### `useAuthStore`
```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setAuth: (user: User, tokens: { accessToken: string; refreshToken: string }) => void;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}
```

### `useBookingDraftStore`
```typescript
interface BookingDraftState {
  selectedRooms: Room[];
  checkInDate: string | null;
  checkOutDate: string | null;
  numberOfGuests: number;
  specialRequests: string;
  paymentMethod: PaymentMethod;
  
  // Actions
  setDates: (checkIn: string, checkOut: string) => void;
  toggleRoom: (room: Room) => void;
  setGuests: (count: number) => void;
  setSpecialRequests: (notes: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  clearDraft: () => void;
}
```

---

## 3. TanStack Query Cache Structure

| Endpoint | Cache Key | Invalidation Trigger |
| :--- | :--- | :--- |
| `GET /api/v1/rooms/available` | `['rooms', 'available', params]` | Searching new dates, booking creation |
| `GET /api/v1/rooms/:id` | `['rooms', 'detail', id]` | Room specs or image updates |
| `GET /api/v1/bookings/my` | `['bookings', 'my', { page, limit }]` | New booking, cancel request |
| `GET /api/v1/desk/bookings` | `['desk', 'bookings', { type, date, page }]` | Check-in, check-out, record payment |
| `GET /api/v1/desk/cancellation-requests` | `['desk', 'cancellations', { page }]` | Approve cancellation, reject cancellation |
| `GET /api/v1/auth/staff` | `['admin', 'staff']` | Staff creation, role update |
| `GET /api/v1/admin/analytics/revenue` | `['admin', 'analytics', 'revenue', groupBy]` | Date range change |
| `GET /api/v1/admin/analytics/occupancy` | `['admin', 'analytics', 'occupancy']` | Check-in, check-out |

# Implementation Plan: Grand Horizon Hotel Frontend System

**Branch**: `002-hotel-frontend-system` | **Date**: 2026-09-25 | **Spec**: [Feature Specification](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/my-app/specs/002-hotel-frontend-system/spec.md)

**Input**: Feature specification from `specs/002-hotel-frontend-system/spec.md` and reconciled UX/Design spec from `hotel-booking-frontend-spec.md`.

---

## 1. Summary

The Grand Horizon Hotel Frontend System is an enterprise-grade luxury web application built with **React 18 + Vite**. It implements a dual-register visual architecture:
1. **Guest Portal (Calm Hospitality Luxury)**: Asymmetric layouts, Fraunces serif headings, Tailwind CSS with deep navy `#0A0F1A` and champagne gold `#C9A15A` accents, Framer Motion shared-element transition (`RoomCard` → `RoomDetail`), and responsive booking flows.
2. **Staff / Admin Operations Console (High-Density Operational Cockpit)**: Custom-themed Material UI v5 (Inter font, 8px corner radius, aqua `#3FD0C9` live accents, no default Material blue), `@mui/x-data-grid` for operational tables, `@mui/x-charts` for analytics, and a keyboard-driven ⌘K `<CommandPalette />`.

The application connects to the verified Node/Express backend (`http://localhost:5000/api/v1`), utilizing an Axios client with automated envelope unwrapping, silent 401 JWT refresh rotation, and UUID v4 `Idempotency-Key` injection on booking creation.

---

## 2. Technical Context

- **Language / Version**: TypeScript / Modern JavaScript (ES2022+), React 18.3+
- **Build Tool / Bundler**: Vite 5.x (fast HMR, optimized production chunks)
- **Routing**: `react-router-dom` v6 with nested layout guards (`GuestLayout`, `StaffLayout`, `AuthLayout`)
- **Server State Management**: `@tanstack/react-query` v5 (structured cache keys, stale-time invalidation, centralized API envelope unwrapper)
- **Client & Session State**: `zustand` (Auth session store, cart/booking-in-progress draft, UI modal/drawer controllers)
- **Form Management & Validation**: `react-hook-form` + `zod` + `@hookform/resolvers/zod`
- **Styling Architecture**:
  - Guest Side: Tailwind CSS v3 with custom tokens in `tailwind.config.js`
  - Staff Side: Emotion (`@emotion/react`, `@emotion/styled`) + Material UI v5 (`@mui/material`, `@mui/x-data-grid`, `@mui/x-charts`)
- **Motion & Micro-interactions**: `framer-motion` for shared layoutId morphs, keycard loader line sweep, and command palette animations
- **Icons**: `lucide-react` locked to single consistent stroke weight
- **Target Location**: `client/` at root workspace (`c:\Users\hamih\OneDrive\Desktop\AtoZ Coder\Advanced MERN\Hotel-Management-System\client`)
- **Backend API Server**: Express running at `http://localhost:5000/api/v1`

---

## 3. Architecture & Directory Structure

```text
client/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main.jsx                     # Entry point mounting QueryClientProvider, BrowserRouter, ThemeProvider
│   ├── App.jsx                      # App-level routing configuration & global toast/dialog providers
│   ├── index.css                    # Design tokens (--ink, --surface, --gold, --aqua) & Tailwind base
│   │
│   ├── assets/                      # Ambient SVG silhouettes, brand icons
│   │
│   ├── config/
│   │   ├── constants.js             # ROLES, PERMISSIONS, BOOKING_STATUS, REFUND_TIERS
│   │   └── muiTheme.js              # Custom dark theme for MUI v5 (Inter font, 8px radius, no default blue)
│   │
│   ├── services/
│   │   ├── api.js                   # Axios instance with 401 refresh queue & Idempotency-Key injection
│   │   ├── auth.service.js          # login, register, refreshToken, forgotPassword, resetPassword, getMe
│   │   ├── room.service.js          # getAvailableRooms, getRoomDetails, CRUD, housekeeping, image uploads
│   │   ├── booking.service.js       # createBooking, getMyBookings, getBookingById, requestCancellation, downloadInvoice
│   │   ├── desk.service.js          # getOverview, checkIn, checkOut, recordPayment, cancellation review/approve/reject
│   │   ├── engagement.service.js    # reviews, loyaltyBalance, wishlist, waitlist
│   │   ├── admin.service.js         # getAllBookings, revenueMetrics, occupancyMetrics, auditLogs, staff CRUD, pbac
│   │   └── chat.service.js          # guestChat, staffChat, adminChat, confirmAdminAction
│   │
│   ├── stores/
│   │   ├── useAuthStore.js          # user, tokens, role, permissions, login, logout
│   │   ├── useBookingDraftStore.js  # room selections, checkInDate, checkOutDate, guests
│   │   └── useUIStore.js            # command palette open/close, concierge drawer state
│   │
│   ├── hooks/
│   │   ├── useAuth.js               # Convenience hook wrapping auth store & permissions
│   │   ├── useRooms.js              # React Query hooks for room availability & catalog
│   │   ├── useBookings.js           # React Query hooks for guest & admin bookings
│   │   ├── useDesk.js               # React Query hooks for front desk operational tabs
│   │   └── usePermissions.js        # PBAC check helper (isSuperAdmin || hasPermission)
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Can.jsx              # PBAC render guard (renders nothing if permission missing)
│   │   │   ├── KeycardLoader.jsx    # Branded gold line sweep loading animation
│   │   │   ├── BookingStatusBadge.jsx # 7 distinct colored status badges
│   │   │   ├── EmptyState.jsx       # Directive copy with minimalist line-drawn key/bell motif
│   │   │   ├── Toast.jsx            # Action notification toaster
│   │   │   └── ProtectedRoute.jsx   # Role & permission guard component
│   │   │
│   │   ├── guest/
│   │   │   ├── Navbar.jsx           # Hospitality navigation with auth awareness
│   │   │   ├── Footer.jsx           # Brand footer
│   │   │   ├── SearchWidget.jsx     # Floating date & room filter card
│   │   │   ├── RoomCard.jsx         # Signature Framer Motion layoutId morph card
│   │   │   ├── PriceBreakdown.jsx   # Nightly rate calculation summary
│   │   │   ├── CancelRequestModal.jsx # Policy warning & cancellation request dialog
│   │   │   └── ChatDrawer.jsx       # Role-aware AI Concierge floating bubble & drawer
│   │   │
│   │   └── staff/
│   │       ├── StaffSidebar.jsx     # Dynamic PBAC navigation (invisible links when unpermitted)
│   │       ├── StaffHeader.jsx      # Console header with ⌘K prompt and staff profile
│   │       ├── CommandPalette.jsx   # ⌘K quick-jump search dialog
│   │       ├── CancellationReviewDialog.jsx # Authoritative refund tier inspector & approve/reject
│   │       ├── RecordPaymentDialog.jsx # In-person cash & POS card payment recorder
│   │       ├── AIConfirmDialog.jsx  # Admin two-phase action payload confirmation modal
│   │       └── PBACMatrixGrid.jsx   # Permission toggle matrix by functional categories
│   │
│   ├── layouts/
│   │   ├── GuestLayout.jsx          # Public & guest views (Navbar + Content + Footer + ChatDrawer)
│   │   ├── StaffLayout.jsx          # Operations view (MUI Theme + StaffSidebar + Content + ⌘K)
│   │   └── AuthLayout.jsx           # Clean centered auth card with ambient skyline SVG
│   │
│   └── pages/
│       ├── public/
│       │   ├── LandingPage.jsx      # Asymmetric hero, ambient SVG, featured rooms, search bar
│       │   ├── RoomCatalogPage.jsx  # Staggered availability grid, search filters
│       │   ├── RoomDetailPage.jsx   # Morphed hero, photo gallery, amenities, room reviews
│       │   ├── LoginPage.jsx        # Unified email/password login
│       │   ├── RegisterPage.jsx     # Guest registration
│       │   ├── ForgotPasswordPage.jsx # Request reset token
│       │   └── ResetPasswordPage.jsx  # Set new password via token
│       │
│       ├── guest/
│       │   ├── GuestDashboardPage.jsx # Recent bookings, loyalty points & tier badge
│       │   ├── CheckoutPage.jsx     # Multi-step reservation, special requests, payment method
│       │   ├── MyBookingsPage.jsx   # Tabbed bookings (upcoming/past/cancelled)
│       │   ├── BookingDetailPage.jsx# Room details, PDF invoice download, cancel request
│       │   ├── WishlistPage.jsx     # Saved rooms
│       │   ├── WaitlistPage.jsx     # Active date notification subscriptions
│       │   └── ConciergePage.jsx    # Full-page dedicated AI Concierge chat
│       │
│       ├── desk/
│       │   ├── DeskDashboardPage.jsx # Arrivals, Departures, In-House tabs (MUI DataGrid)
│       │   └── DeskCancellationsPage.jsx # Pending cancellation requests queue
│       │
│       ├── housekeeping/
│       │   └── HousekeepingBoardPage.jsx # Cleanliness board (Clean, Dirty, Cleaning, Maintenance)
│       │
│       └── admin/
│           ├── AdminAnalyticsPage.jsx # @mui/x-charts Revenue Line chart & Occupancy rate gauge
│           ├── AdminBookingsPage.jsx  # Master global bookings directory with multi-filters
│           ├── AdminRoomsPage.jsx     # Room CRUD, pricing updates, Cloudinary photo uploads
│           ├── AdminStaffPage.jsx     # Staff list & create staff modal
│           ├── AdminPBACPage.jsx      # Dynamic permission matrix editor per staff member
│           ├── AdminAuditLogPage.jsx  # Security audit trail data grid
│           └── AdminAICopilotPage.jsx # Admin copilot with 2-phase confirmation modal
```

---

## 4. Implementation Phasing Strategy

The frontend implementation is divided into **5 cohesive waves**:

### Wave 1: Foundation, Design Tokens & Auth Engine
- Set up Vite project in `client/` with Tailwind CSS and custom Material UI v5 theme.
- Configure Axios client with envelope unwrapper (`response.data.data`), 401 refresh rotation, and `Idempotency-Key` injection.
- Implement Zustand auth store and public auth pages (`/login`, `/register`, `/forgot-password`, `/reset-password`).
- Build core shared components: `<Can />`, `<KeycardLoader />`, `<BookingStatusBadge />`, `<Toast />`.

### Wave 2: Public Discovery, Catalog & Guest Booking
- Build `<LandingPage />` with asymmetric hero, ambient skyline SVG, and `<SearchWidget />`.
- Build `<RoomCatalogPage />` with date availability query (`GET /api/v1/rooms/available`) and staggered card reveal.
- Build `<RoomDetailPage />` with Framer Motion shared-element transition (`RoomCard` → Hero), gallery, and reviews.
- Build `<CheckoutPage />` with `POST /api/v1/bookings` mutation and gold keycard sweep loader.
- Build Guest Portal: `<GuestDashboardPage />`, `<MyBookingsPage />`, `<BookingDetailPage />`, PDF invoice download stream, `<WishlistPage />`, and `<WaitlistPage />`.

### Wave 3: Front Desk Operations & Tiered Cancellations
- Implement `<StaffLayout />` with dynamic `<StaffSidebar />` and custom MUI theme.
- Build `<DeskDashboardPage />` with Arrivals, Departures, and In-House tabs using MUI DataGrid.
- Implement quick-action handlers: Check-in (clean room check), Check-out (auto dirty room trigger), and `<RecordPaymentDialog />` (cash/offline-card).
- Build guest-side `<CancelRequestModal />` with 3-tier refund policy warning.
- Build staff-side `<DeskCancellationsPage />` and `<CancellationReviewDialog />` with authoritative backend calculation breakdown and approve/reject actions.

### Wave 4: Housekeeping & Administration (Rooms, Staff & PBAC)
- Build `<HousekeepingBoardPage />` with room status state transitions.
- Build `<AdminRoomsPage />` with room creation modal, specifications editing, soft deletion, and Cloudinary multi-image upload/delete.
- Build `<AdminStaffPage />` with staff directory and staff creation modal.
- Build `<AdminPBACPage />` with category-wise permission switches and synchronized role/permissions payload dispatch.

### Wave 5: Managerial Analytics, AI Assistants & Staff Command Palette
- Build `<AdminAnalyticsPage />` with `@mui/x-charts` revenue trend line and occupancy rate gauge.
- Build `<AdminBookingsPage />` with global search, status/payment filters, and date picker.
- Build `<AdminAuditLogPage />` for immutable security log inspection.
- Build Multi-Role AI Assistant: `<ChatDrawer />` (Guest & Staff) and `<AdminAICopilotPage />` with `<AIConfirmDialog />` for two-phase dry-run mutation execution.
- Build keyboard-driven `<CommandPalette />` (⌘K) for quick operational jumping.

---

## 5. Security & PBAC Enforcement Rules

1. **Invisible Over Disabled**:
   ```jsx
   // Correct PBAC Pattern:
   <Can permission={PERMISSIONS.PAYMENTS_RECORD_CASH}>
     <Button onClick={openPaymentModal}>Record Payment</Button>
   </Can>
   // If user lacks permission, nothing is rendered in the DOM.
   ```
2. **Super Admin Bypass**:
   Any user where `user.role === 'super-admin'` implicitly passes all `<Can />` checks.
3. **Protected Route Guards**:
   Routes check authentication and role/permission requirements; unauthorized attempts redirect to `/login` or display a 403 Forbidden alert without breaking the navigation frame.
4. **Token Security**:
   Tokens are stored in memory and synchronized via local storage for reload persistence; logout discards tokens immediately.

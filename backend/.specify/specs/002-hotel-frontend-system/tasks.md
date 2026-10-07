# Tasks: Grand Horizon Hotel Frontend System

**Input**: Design documents from `.specify/specs/002-hotel-frontend-system/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`).  
**Prerequisites**: Active Express backend running at `http://localhost:5000/api/v1`.  
**Target Directory**: `client/` at workspace root (`c:\Users\hamih\OneDrive\Desktop\AtoZ Coder\Advanced MERN\Hotel-Management-System\client`).

---

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Independent task that can run in parallel (distinct files).
- **[Story]**: Associated user story (US1 - US9) mapped from `spec.md`.

---

## Phase 1: Setup (Project Scaffold & Environment)

**Purpose**: Initialize the React 18 + Vite frontend application structure and core package dependencies.

- [ ] T001 Initialize React 18 + Vite project in `client/` with `package.json`, `index.html`, and `vite.config.js`.
- [ ] T002 Install core runtime dependencies in `client/`: `react`, `react-dom`, `react-router-dom@6`, `@tanstack/react-query@5`, `zustand@4`, `axios`, `framer-motion`, `lucide-react`, `react-hook-form`, `zod`, `@hookform/resolvers`.
- [ ] T003 Install styling dependencies in `client/`: `tailwindcss@3`, `postcss`, `autoprefixer`, `@mui/material@5`, `@mui/x-data-grid@7`, `@mui/x-charts@7`, `@emotion/react`, `@emotion/styled`.
- [ ] T004 [P] Configure `client/tailwind.config.js` with luxury tokens: `--ink: #0A0F1A`, `--surface: #131A26`, `--surface-2: #1B2433`, `--border: #2A3547`, `--text: #ECEFF3`, `--text-muted: #8791A3`, `--gold: #C9A15A`, `--aqua: #3FD0C9`, `--success: #3ECF8E`, `--danger: #F2545B`, `--warning: #E8A33D`.
- [ ] T005 [P] Configure `client/src/index.css` importing Google Fonts (`Fraunces` for luxury headings, `Inter` for UI & body) and CSS root variables.
- [ ] T006 [P] Create `client/.env` and `client/.env.example` specifying `VITE_API_BASE_URL=http://localhost:5000/api/v1`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core HTTP networking, silent token rotation, custom MUI theme, client stores, and PBAC guards.

- [ ] T007 Create `client/src/config/constants.js` freezing `ROLES`, `PERMISSIONS`, `BOOKING_STATUS`, `PAYMENT_STATUS`, `PAYMENT_PROVIDERS`, `REFUND_TIERS`, `ROOM_TYPES`, `HOUSEKEEPING_STATUS`.
- [ ] T008 Create `client/src/config/muiTheme.js` with custom dark theme for MUI v5: `Inter` font, 8px border radius, `--surface` backgrounds, live aqua `#3FD0C9` accents, completely eliminating stock Material blue.
- [ ] T009 Create `client/src/services/api.js` Axios instance implementing:
  - Automatic `Authorization: Bearer <accessToken>` header attachment.
  - Automatic `Idempotency-Key: crypto.randomUUID()` header on `POST /bookings`.
  - Centralized response unwrapper returning `response.data.data`.
  - Silent 401 JWT refresh queue calling `POST /api/v1/auth/refresh-token` with request replay.
- [ ] T010 [P] Create `client/src/stores/useAuthStore.js` Zustand store managing `user`, `role`, `permissions`, `accessToken`, `refreshToken`, `login()`, `logout()`, `updateUser()`, and localStorage hydration.
- [ ] T011 [P] Create `client/src/stores/useBookingDraftStore.js` Zustand store holding selected rooms, checkIn/checkOut dates, guests count, special requests, and payment method.
- [ ] T012 [P] Create `client/src/stores/useUIStore.js` Zustand store managing ⌘K Command Palette open/close and AI Concierge chat drawer open/close.
- [ ] T013 [P] Create `client/src/components/common/Can.jsx` PBAC guard component that evaluates `user.role === 'super-admin' || user.permissions.includes(permission)` and renders nothing (invisible, never disabled) when unauthorized.
- [ ] T014 [P] Create `client/src/components/common/KeycardLoader.jsx` branded loading indicator sweeping a thin gold line across the screen.
- [ ] T015 [P] Create `client/src/components/common/BookingStatusBadge.jsx` rendering 7 distinct colored badges for booking statuses.
- [ ] T016 [P] Create `client/src/components/common/EmptyState.jsx` with minimalist line-drawn key/bell icon and directive guidance copy.
- [ ] T017 [P] Create `client/src/components/common/Toast.jsx` notification alert component.
- [ ] T018 Create `client/src/components/common/ProtectedRoute.jsx` route guard enforcing authentication and PBAC permissions.

**Checkpoint**: Foundational layer complete. User story implementation unblocked.

---

## Phase 3: User Story 3 - Unified Authentication & Password Recovery (Priority: P1)

**Goal**: Full authentication lifecycle: registration, login, silent refresh, profile retrieval, and self-service password reset.

- [ ] T019 [US3] Create `client/src/services/auth.service.js` with `login`, `register`, `refreshToken`, `getMe`, `forgotPassword`, and `resetPassword` calls.
- [ ] T020 [P] [US3] Create `client/src/layouts/AuthLayout.jsx` centered layout with ambient hotel skyline SVG branding.
- [ ] T021 [US3] Implement `client/src/pages/public/LoginPage.jsx` with React Hook Form + Zod validation, error banners, and post-login role redirection (`/dashboard` for guests, `/desk` for front desk, `/housekeeping` for cleaners, `/admin/analytics` for admin).
- [ ] T022 [US3] Implement `client/src/pages/public/RegisterPage.jsx` with full name, email, password strength meter, and phone fields.
- [ ] T023 [US3] Implement `client/src/pages/public/ForgotPasswordPage.jsx` accepting email and displaying enumeration-safe success alert.
- [ ] T024 [US3] Implement `client/src/pages/public/ResetPasswordPage.jsx` extracting token from query param, validating new password, and redirecting to login.

---

## Phase 4: User Story 1 - Public Guest Discovery & Room Booking (Priority: P1) 🎯 MVP

**Goal**: Public marketing, date-based availability search, shared-element transition to room details, atomic checkout, and confirmation.

- [ ] T025 [US1] Create `client/src/services/room.service.js` with `getAvailableRooms`, `getRoomDetails`, and `getRoomReviews`.
- [ ] T026 [US1] Create `client/src/services/booking.service.js` with `createBooking`, `getMyBookings`, `getBookingById`, `requestCancellation`, and `downloadInvoice`.
- [ ] T027 [P] [US1] Create `client/src/layouts/GuestLayout.jsx` with luxury hospitality `<Navbar />`, `<Footer />`, and floating AI Concierge bubble.
- [ ] T028 [US1] Implement `client/src/components/guest/SearchWidget.jsx` floating date-range picker (check-in, check-out, room type, guest count) routing to `/rooms`.
- [ ] T029 [US1] Implement `client/src/pages/public/LandingPage.jsx` featuring asymmetric hero, ambient skyline SVG, featured suites, hotel amenities, and `<SearchWidget />`.
- [ ] T030 [US1] Implement `client/src/components/guest/RoomCard.jsx` with Framer Motion `layoutId="room-${room._id}"`, photo preview, amenity tags, price per night, and wishlist heart toggle.
- [ ] T031 [US1] Implement `client/src/pages/public/RoomCatalogPage.jsx` with TanStack Query fetching `GET /api/v1/rooms/available`, filter sidebar, and staggered 60ms card animations.
- [ ] T032 [US1] Implement `client/src/pages/public/RoomDetailPage.jsx` receiving morphed `layoutId` hero transition, Cloudinary photo gallery, full specs, and guest reviews.
- [ ] T033 [US1] Implement `client/src/components/guest/PriceBreakdown.jsx` calculating nights count, room subtotal, taxes, and total payable amount.
- [ ] T034 [US1] Implement `client/src/pages/guest/CheckoutPage.jsx` protected checkout flow: guest details, multi-room summary, special requests, payment method selector (cash / offline-card), `Idempotency-Key` trigger, and gold keycard sweep loader.
- [ ] T035 [US1] Implement booking confirmation screen displaying real `bookingReference`, stay dates, and direct CTA to view in `/my-bookings`.

---

## Phase 5: User Story 2 - Front Desk Operations & In-Person Payments (Priority: P1)

**Goal**: Operational flight board for receptionists: Arrivals, Departures, In-House, Check-in with clean room guard, Check-out with auto-dirty trigger, and cash/card POS payment recording.

- [ ] T036 [US2] Create `client/src/services/desk.service.js` with `getOverview`, `checkIn`, `checkOut`, `recordPayment`, `getCancellationRequests`, `getCancellationReview`, `approveCancellation`, and `rejectCancellation`.
- [ ] T037 [P] [US2] Create `client/src/layouts/StaffLayout.jsx` wrapped in MUI Dark Theme with responsive `<StaffSidebar />`, `<StaffHeader />`, and ⌘K trigger.
- [ ] T038 [US2] Implement `client/src/components/staff/StaffSidebar.jsx` with dynamic PBAC navigation (using `<Can />` so unauthorized links are completely omitted).
- [ ] T039 [US2] Implement `client/src/pages/desk/DeskDashboardPage.jsx` with 3 operational tabs:
  - Tab 1: Arrivals Today (`checkInDate == today`)
  - Tab 2: Departures Today (`checkOutDate == today`)
  - Tab 3: Currently In-House (`status == checked-in`)
  - Dense MUI DataGrid table with search and quick-action buttons.
- [ ] T040 [US2] Implement Check-In action handler: calls `PATCH /api/v1/desk/bookings/:id/check-in`; catches 400 if room is dirty and renders clear directive error message.
- [ ] T041 [US2] Implement Check-Out action handler: calls `PATCH /api/v1/desk/bookings/:id/check-out`; sets booking to `checked-out` and triggers auto-dirty room update.
- [ ] T042 [US2] Implement `client/src/components/staff/RecordPaymentDialog.jsx` modal for recording in-person cash or offline POS card payments via `POST /api/v1/desk/bookings/:id/payments`.

---

## Phase 6: User Story 4 - Staff-Audited Tiered Cancellations & Authoritative Refunds (Priority: P2)

**Goal**: Guest cancellation request with policy disclosures, front desk audit queue, authoritative refund tier breakdown, and approve/reject actions.

- [ ] T043 [US4] Implement `client/src/components/guest/CancelRequestModal.jsx` on `/my-bookings/:id` displaying dynamic 3-tier warnings (>=48h: 100%, 24-48h: 50%, <24h: 0%), mandatory reason textarea, and calling `POST /api/v1/bookings/:id/cancel-request`.
- [ ] T044 [US4] Update guest booking detail copy to strictly display "Cancellation requested — front desk will review" (never "Cancelled") while status is `cancellation-requested`.
- [ ] T045 [US4] Implement `client/src/pages/desk/DeskCancellationsPage.jsx` MUI DataGrid queue fetching `GET /api/v1/desk/cancellation-requests`.
- [ ] T046 [US4] Implement `client/src/components/staff/CancellationReviewDialog.jsx` modal fetching `GET /api/v1/desk/bookings/:id/cancellation-review` and displaying exact hours remaining, policy tier name, total paid, and authoritative refund amount.
- [ ] T047 [US4] Wire "Approve Cancellation" button to `PATCH /api/v1/desk/bookings/:id/cancel-approve` (voids booking, issues refund, frees room).
- [ ] T048 [US4] Wire "Reject Cancellation" button requiring mandatory `rejectionReason` textarea and calling `PATCH /api/v1/desk/bookings/:id/cancel-reject`.

---

## Phase 7: User Story 5 - Housekeeping Operations Board (Priority: P2)

**Goal**: Focused cleanliness board for housekeeping staff with state machine transitions (`clean`, `dirty`, `cleaning`, `maintenance`).

- [ ] T049 [US5] Implement `client/src/pages/housekeeping/HousekeepingBoardPage.jsx` displaying room cards grouped by status or filter tabs.
- [ ] T050 [US5] Implement state transition actions: "Start Cleaning" (`cleaning`), "Mark Clean" (`clean` with notes), and "Report Maintenance" (`maintenance`) calling `PATCH /api/v1/rooms/:id/housekeeping`.

---

## Phase 8: User Story 6 - Dynamic PBAC Staff Management Matrix (Priority: P2)

**Goal**: Super Admin staff directory, staff creation, and interactive category-wise permission matrix.

- [ ] T051 [US6] Create `client/src/services/admin.service.js` with `getAllBookings`, `getRevenueMetrics`, `getOccupancyMetrics`, `getAuditLogs`, `getStaffList`, `createStaff`, `getPermissionsMeta`, and `updateStaffPermissions`.
- [ ] T052 [US6] Implement `client/src/pages/admin/AdminStaffPage.jsx` with staff directory table and "Create New Staff" modal (role selection and initial permissions).
- [ ] T053 [US6] Implement `client/src/pages/admin/AdminPBACPage.jsx` (`/admin/staff/:id/pbac`) with split view:
  - Left panel: Staff list.
  - Right panel: Interactive toggle matrix of all 20 permissions grouped into categories (Rooms, Bookings, Desk, Payments, Staff/Admin).
- [ ] T054 [US6] Wire permission switches to dispatch both role and permissions array together via `PATCH /api/v1/auth/users/:id/permissions` with loading feedback.

---

## Phase 9: Guest Portal & Engagement Features (Priority: P2)

**Goal**: Guest dashboard, stay history, PDF Tax Invoice download, reviews, wishlists, and waitlists.

- [ ] T055 [US1] Create `client/src/services/engagement.service.js` with `getLoyaltyBalance`, `getWishlist`, `addToWishlist`, `removeFromWishlist`, `getWaitlist`, `joinWaitlist`, `cancelWaitlist`, `createReview`, and `deleteReview`.
- [ ] T056 [US1] Implement `client/src/pages/guest/GuestDashboardPage.jsx` showing recent reservations, loyalty points balance, and tier badge (`Silver`, `Gold`, `Platinum`).
- [ ] T057 [US1] Implement `client/src/pages/guest/MyBookingsPage.jsx` with filter tabs (`Upcoming`, `Past`, `Cancelled`).
- [ ] T058 [US1] Implement `client/src/pages/guest/BookingDetailPage.jsx` showing room details, price breakdown, cancellation request button, and "Download PDF Tax Invoice" button streaming `GET /api/v1/bookings/:id/invoice`.
- [ ] T059 [P] [US1] Implement `client/src/pages/guest/WishlistPage.jsx` showing saved rooms with remove and quick-book actions.
- [ ] T060 [P] [US1] Implement `client/src/pages/guest/WaitlistPage.jsx` showing active waitlist subscriptions with cancellation action.
- [ ] T061 [US1] Implement post-stay review submission modal on completed bookings calling `POST /api/v1/reviews`.

---

## Phase 10: User Story 7 - Managerial Analytics & Security Audit Intelligence (Priority: P3)

**Goal**: High-level revenue and occupancy trend charts, global master bookings table, and security audit log viewer.

- [ ] T062 [US7] Implement `client/src/pages/admin/AdminAnalyticsPage.jsx`:
  - Revenue Trend Line chart (`@mui/x-charts`) with `day | week | month` selector calling `GET /api/v1/admin/analytics/revenue`.
  - Occupancy Rate gauge & room-type breakdown calling `GET /api/v1/admin/analytics/occupancy`.
- [ ] T063 [US7] Implement `client/src/pages/admin/AdminBookingsPage.jsx` master directory using MUI DataGrid with search regex, status filter, payment status filter, and date pickers calling `GET /api/v1/admin/bookings`.
- [ ] T064 [US7] Implement `client/src/pages/admin/AdminAuditLogPage.jsx` displaying immutable security logs with action badges, actor, timestamp, and details calling `GET /api/v1/admin/audit-log`.
- [ ] T065 [US7] Implement `client/src/pages/admin/AdminRoomsPage.jsx` with room CRUD, specifications editor, soft-delete, and Cloudinary multi-image upload/delete.

---

## Phase 11: User Story 8 - Multi-Role AI Concierge & Copilot (Priority: P3)

**Goal**: Role-aware AI assistant: Guest concierge, staff operations helper, and admin copilot with two-phase dry-run mutation confirmation.

- [ ] T066 [US8] Create `client/src/services/chat.service.js` with `guestChat`, `staffChat`, `adminChat`, and `confirmAdminAction`.
- [ ] T067 [US8] Implement `client/src/components/guest/ChatDrawer.jsx` floating bubble and expandable chat drawer with luxury dark theme.
- [ ] T068 [US8] Implement `client/src/pages/guest/ConciergePage.jsx` full-page AI Concierge chat for travel advice, amenities FAQ, and booking recommendations.
- [ ] T069 [US8] Implement `client/src/pages/admin/AdminAICopilotPage.jsx` admin chat console.
- [ ] T070 [US8] Implement `client/src/components/staff/AIConfirmDialog.jsx` catching `requiresConfirmation: true` responses, displaying the dry-run `actionPayload`, and calling `POST /api/v1/chat/admin/confirm` upon explicit admin approval.

---

## Phase 12: User Story 9 - Staff Command Palette (⌘K) & Luxury Motion (Priority: P3)

**Goal**: Instant keyboard navigation via ⌘K for staff and polished micro-interactions.

- [ ] T071 [US9] Implement `client/src/components/staff/CommandPalette.jsx` listening to `Cmd+K` / `Ctrl+K` with fuzzy search across bookings, rooms, staff members, and direct actions.
- [ ] T072 [US9] Add magnetic cursor hover pull effect to primary CTA button on the landing page hero.
- [ ] T073 [US9] Verify Framer Motion shared-element transition between `RoomCard` and `RoomDetailPage` hero with zero layout jumps.

---

## Phase 13: Polish, End-to-End Verification & Production Build

**Purpose**: Route verification, cross-role testing, responsive layout checks, and production bundle build.

- [ ] T074 Configure `client/src/App.jsx` with full route tree (`Public`, `Guest`, `Desk`, `Housekeeping`, `Admin`) and 404 fallback page.
- [ ] T075 Verify end-to-end booking flow: Public search → Room detail morph → Checkout → Cash payment at desk → Check-in → Check-out → Auto-dirty room.
- [ ] T076 Verify cancellation flow: Guest request → Desk audit queue → Authoritative refund tier inspector → Approve/Reject.
- [ ] T077 Verify silent 401 token refresh rotation by triggering request with expired access token.
- [ ] T078 Run production build `npm run build` in `client/` and verify zero bundling or type errors.

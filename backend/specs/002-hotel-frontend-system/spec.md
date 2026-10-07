# Feature Specification: Grand Horizon Hotel Frontend System

**Feature Branch**: `002-hotel-frontend-system`  
**Created**: 2026-09-25  
**Status**: Ready for Plan  
**Input**: Comprehensive reconciliation of backend contract (`my-app/FRONTEND_SPECIFICATION.md`) and frontend UX/design specification (`hotel-booking-frontend-spec.md`).

---

## Executive Summary & Synthesis

This specification unifies the **authoritative backend API contract** (10 modules, 30+ endpoints, PBAC rules, 3-tier cancellation policy, and AI two-phase confirmation) with the **tailored luxury frontend design architecture** (React 18 + Vite, Tailwind CSS guest experience, themed Material UI v5 staff console, Framer Motion signature moments, and dual-register visual identity).

### Tech Stack Decisions
- **Core Runtime & Build**: React 18 + Vite
- **Routing**: React Router v6
- **Server State & Data Fetching**: TanStack Query (React Query v5) with centralized envelope unwrapping (`response.data.data`)
- **Client & Session State**: Zustand (Auth, UI drawers, cart/booking-in-progress)
- **Guest Styling**: Tailwind CSS with custom tokens (`--ink: #0A0F1A`, `--surface: #131A26`, `--gold: #C9A15A`, `--aqua: #3FD0C9`), Fraunces serif display typography, Inter body
- **Staff / Admin Console Styling**: Material UI (MUI v5) custom themed (Inter font, 8px radius, no default blue/purple), `@mui/x-data-grid`, `@mui/x-charts`
- **Animation**: Framer Motion for signature moments (RoomCard → Detail shared-element morph, Keycard loader sweep, staggered search results)
- **Forms & Validation**: React Hook Form + Zod
- **HTTP Client**: Axios with automatic `Idempotency-Key` injection on booking creation and silent 401 JWT refresh rotation

---

## User Scenarios & Testing

### User Story 1 - Public Guest Discovery & Seamless Room Booking (Priority: P1)

As a prospective hotel guest, I want to search for available rooms by check-in and check-out dates, inspect detailed amenities and photos with smooth transitions, and complete an atomic reservation with my chosen payment method so that my room is guaranteed without double-booking.

**Why this priority**: Core revenue-generating funnel and the primary value proposition of the hotel management platform.

**Independent Test**: Can be fully tested end-to-end by opening the landing page, selecting check-in/out dates, picking an available Deluxe Room, submitting the booking with an offline payment method, receiving a confirmed `bookingReference`, and viewing the booking in the guest portal.

**Acceptance Scenarios**:
1. **Given** a guest on the landing page, **When** they select check-in and check-out dates and click "Check Availability", **Then** the search queries `GET /api/v1/rooms/available` and reveals available rooms with a staggered 60ms animation.
2. **Given** an available room card, **When** the guest clicks the card, **Then** Framer Motion executes a shared-element transition (`layoutId`) seamlessly morphing the card into the hero of `/rooms/:id`.
3. **Given** a guest on `/checkout` with room selections, **When** they submit the form, **Then** an Axios interceptor attaches an `Idempotency-Key: <UUID-v4>` header, calls `POST /api/v1/bookings`, and triggers the branded gold keycard sweep loader.
4. **Given** a successful booking response, **When** the confirmation renders, **Then** the UI shows the generated `bookingReference` (e.g., `GRH-20261201-9872`), total amount, and provides direct links to download the PDF invoice and view the stay in `/my-bookings`.

---

### User Story 2 - Front Desk Operational Execution & In-Person Payments (Priority: P1)

As a hotel receptionist, I want an operational flight-board showing today's arrivals, departures, and in-house guests, with quick-action check-in, check-out, and cash/card payment recording so that front desk operations are fast, reliable, and error-free.

**Why this priority**: Operational backbone for hotel staff to manage guest physical arrivals and departures without delays.

**Independent Test**: Receptionist logs into `/desk`, views arrivals for today, executes a check-in (verifying room is clean), records a $600 cash payment, and processes a departure check-out (verifying room automatically flips to dirty for housekeeping).

**Acceptance Scenarios**:
1. **Given** a front desk user with `bookings:view` permission, **When** they navigate to `/desk`, **Then** the system fetches `GET /api/v1/desk/bookings?type=arrivals` using MUI DataGrid in a dense, dark layout.
2. **Given** a booking scheduled for today's check-in with a `clean` room, **When** the receptionist clicks "Check In", **Then** `PATCH /api/v1/desk/bookings/:id/check-in` executes and updates the status badge to `checked-in` (green).
3. **Given** a booking where the assigned room is `dirty` or `cleaning`, **When** the receptionist attempts check-in, **Then** the backend rejects with 400 and the UI displays a clear directive error message: "Cannot check in: Room requires cleaning by housekeeping first."
4. **Given** a guest paying cash or card at the desk, **When** receptionist submits the payment modal, **Then** `POST /api/v1/desk/bookings/:id/payments` records the amount, clears outstanding balance, and updates `paymentStatus` to `completed`.
5. **Given** an in-house guest departing, **When** receptionist clicks "Check Out", **Then** `PATCH /api/v1/desk/bookings/:id/check-out` sets booking to `checked-out` and room housekeeping status automatically changes to `dirty`.

---

### User Story 3 - Unified Authentication & Self-Service Password Recovery (Priority: P1)

As any user (Guest, Receptionist, Housekeeping, or Admin), I want to securely log in, stay authenticated across page reloads via silent token rotation, and recover my account via a password reset token if I forget my credentials.

**Why this priority**: Prerequisite for all role-gated capabilities, account protection, and credential recovery.

**Independent Test**: Register a new user, log in, verify access token storage in Zustand and silent refresh on 401, initiate `forgot-password`, receive the token, and complete `reset-password`.

**Acceptance Scenarios**:
1. **Given** an unregistered user, **When** they fill the registration form on `/register`, **Then** `POST /api/v1/auth/register` creates the user and signs them in immediately.
2. **Given** an expired 15-minute access token, **When** the user makes any authenticated API call, **Then** the Axios response interceptor catches the 401, calls `POST /api/v1/auth/refresh-token` with the refresh token, and replays the original request silently.
3. **Given** a user who forgot their password, **When** they submit their email at `/forgot-password`, **Then** `POST /api/v1/auth/forgot-password` returns a generic enumeration-safe success message.
4. **Given** a user with a valid reset token on `/reset-password?token=...`, **When** they submit a compliant new password, **Then** `POST /api/v1/auth/reset-password` updates credentials and routes them to `/login`.

---

### User Story 4 - Staff-Audited Tiered Cancellations & Authoritative Refunds (Priority: P2)

As a guest who needs to cancel, I want to submit a cancellation request with transparent refund eligibility warnings; and as front desk staff, I want an audit queue to inspect the authoritative refund breakdown and approve or reject the request.

**Why this priority**: Enforces hotel business policy, eliminates guest disputes, and ensures refunds are calculated authoritatively by the backend.

**Independent Test**: Guest submits cancel-request on a booking 50 hours before check-in. Front desk opens `/desk/cancellations`, sees Tier 1 (100% refund), clicks "Approve", and confirms booking is cancelled with room released.

**Acceptance Scenarios**:
1. **Given** a guest on `/my-bookings/:id`, **When** they open the "Cancel Booking" modal, **Then** the UI shows policy warnings: Tier 1 (>=48h: 100%), Tier 2 (24-48h: 50%), Tier 3 (<24h: 0%).
2. **Given** guest submits cancel reason, **When** `POST /api/v1/bookings/:id/cancel-request` succeeds, **Then** booking status updates to `cancellation-requested` and copy strictly states: "Cancellation requested — front desk will review" (never "Cancelled").
3. **Given** front desk staff on `/desk/cancellations`, **When** they click "Review" on a request, **Then** `GET /api/v1/desk/bookings/:id/cancellation-review` fetches the authoritative hours remaining, tier name, and exact refund amount.
4. **Given** cancellation review modal, **When** staff clicks "Approve Cancellation", **Then** `PATCH /api/v1/desk/bookings/:id/cancel-approve` voids reservation, issues refund, and releases room inventory.
5. **Given** staff clicks "Reject", **When** they enter a mandatory `rejectionReason`, **Then** `PATCH /api/v1/desk/bookings/:id/cancel-reject` restores booking to `confirmed`.

---

### User Story 5 - Housekeeping Operations & Cleanliness Board (Priority: P2)

As a housekeeping staff member, I want a focused board displaying room cleanliness statuses (`clean`, `dirty`, `cleaning`, `maintenance`) and quick transitions so I can prepare rooms for arriving guests.

**Why this priority**: Directly impacts front desk check-in availability and prevents guests from entering dirty rooms.

**Independent Test**: Housekeeper views `/housekeeping`, transitions Room 101 from `dirty` to `cleaning`, adds notes, and subsequently marks it `clean`.

**Acceptance Scenarios**:
1. **Given** a logged-in user with `housekeeping:update` permission, **When** they open `/housekeeping`, **Then** rooms are displayed in status columns or filterable cards with their current status and room type.
2. **Given** a room in `dirty` state, **When** staff selects "Start Cleaning", **Then** `PATCH /api/v1/rooms/:id/housekeeping` updates state to `cleaning`.
3. **Given** cleaning completion, **When** staff selects "Mark Clean" with optional notes, **Then** `PATCH /api/v1/rooms/:id/housekeeping` commits the clean state and front desk check-in is unblocked.

---

### User Story 6 - Dynamic PBAC Staff Management Matrix (Priority: P2)

As a Super Admin, I want to manage staff accounts and assign dynamic granular permissions via an interactive matrix so that staff members only access features authorized for their duties.

**Why this priority**: Required for enterprise security, multi-role separation, and fine-grained administrative control.

**Independent Test**: Super Admin creates a new receptionist on `/admin/staff`, navigates to `/admin/staff/:id/pbac`, toggles `payments:recordCash` off and `analytics:view` on, and verifies the staff member's interface updates accordingly.

**Acceptance Scenarios**:
1. **Given** Super Admin on `/admin/staff/:id/pbac`, **When** the page loads, **Then** left panel lists staff members from `GET /api/v1/auth/staff` and right panel groups permissions from `GET /api/v1/auth/permissions` into categories (Rooms, Bookings, Desk, Payments, Admin).
2. **Given** a permission toggle click, **When** the admin flips a switch, **Then** `PATCH /api/v1/auth/users/:id/permissions` sends both role and updated permissions array together with a brief loading state.
3. **Given** any staff UI element, **When** evaluated against current user's permissions, **Then** `<Can permission="...">` renders **nothing** (invisible, never disabled/greyed out) if permission is absent.

---

### User Story 7 - Managerial Analytics & Security Audit Intelligence (Priority: P3)

As a Hotel Manager or Super Admin, I want to visualize revenue trends, monitor occupancy rates, search the global master bookings directory, and review the security audit trail.

**Why this priority**: High-level managerial decision making, historical compliance, and performance oversight.

**Independent Test**: Super Admin opens `/admin/analytics`, changes revenue grouping to "month", views occupancy breakdown by room type, filters global bookings by date range, and inspects audit logs on `/admin/audit-log`.

**Acceptance Scenarios**:
1. **Given** user on `/admin/analytics`, **When** revenue component mounts, **Then** `GET /api/v1/admin/analytics/revenue?groupBy=day|week|month` renders `@mui/x-charts` Line chart.
2. **Given** user on `/admin/analytics`, **When** occupancy component mounts, **Then** `GET /api/v1/admin/analytics/occupancy` renders overall rate gauge and breakdown by room type (`single`, `double`, `deluxe`, `suite`, `presidential`).
3. **Given** user on `/admin/bookings`, **When** querying with status, paymentStatus, date range, or regex search, **Then** `GET /api/v1/admin/bookings` loads paginated master records in MUI DataGrid.
4. **Given** user on `/admin/audit-log`, **When** searching critical actions (cancellations, role changes, check-ins), **Then** `GET /api/v1/admin/audit-log` renders immutable security logs with timestamp, actor, and affected entities.

---

### User Story 8 - Multi-Role AI Concierge & Administrative Copilot (Priority: P3)

As any user, I want an AI assistant tailored to my role (guest travel concierge, staff operations helper, or admin copilot with two-phase mutation confirmation) to answer questions and accelerate workflows.

**Why this priority**: Elevates the user experience with modern conversational assistance while maintaining absolute safeguards against accidental administrative mutations.

**Independent Test**: Guest chats with concierge about sea-facing suites. Super Admin asks AI copilot to cancel a booking, inspects the dry-run `actionPayload` modal, and confirms execution.

**Acceptance Scenarios**:
1. **Given** a guest on `/concierge` or using `<ChatWidget />`, **When** sending a message, **Then** `POST /api/v1/chat/user` answers with hotel amenities, policies, and room advice.
2. **Given** staff user, **When** sending a message, **Then** `POST /api/v1/chat/staff` provides quick operational queries.
3. **Given** Super Admin asking AI to execute a high-impact action (e.g. cancel booking or mark room maintenance), **When** `POST /api/v1/chat/admin` responds with `requiresConfirmation: true` and `actionPayload`, **Then** the UI opens a confirmation modal detailing the action.
4. **Given** the confirmation modal, **When** Super Admin confirms, **Then** `POST /api/v1/chat/admin/confirm` executes the payload and returns the final status.

---

### User Story 9 - Staff Command Palette (⌘K) & Luxury Motion Orchestration (Priority: P3)

As a staff member or guest, I want fast keyboard navigation via ⌘K and smooth, purposeful animations that make the application feel premium and responsive.

**Why this priority**: Provides the "wow" factor for guests and rapid efficiency for operational power users without cluttering the screen.

**Independent Test**: Staff member presses ⌘K, searches for "Room 101" or "Arrivals", presses Enter, and immediately jumps to the target view.

**Acceptance Scenarios**:
1. **Given** a staff user on any console screen, **When** they press `Ctrl+K` or `Cmd+K`, **Then** the `<CommandPalette />` opens instantly with quick links to bookings, rooms, staff, and actions.
2. **Given** a guest on the landing page, **When** hovering over the primary CTA, **Then** a subtle magnetic pull effect tracks the cursor.
3. **Given** a payment or booking waiting state, **When** the mutation is in flight, **Then** the `<KeycardLoader />` sweeps a thin gold line across the screen.

---

## Edge Cases & Failure Handlers

1. **Double Booking Race Condition**: If two users attempt to book the exact same room simultaneously, the backend ACID transaction locks the room. The second user receives `409 Conflict`. The frontend must catch this, prevent any balance deduction, and prompt: "This room was just booked by another guest. Please select an alternate room."
2. **Network Drops During Booking**: Frontend attaches `Idempotency-Key: <UUID>`. On automatic or manual retry, backend detects the existing key and returns the original booking without double billing.
3. **Session Expiry During Multi-Step Form**: If the access token expires while filling a form, Axios automatically refreshes tokens via `/auth/refresh-token` without wiping the user's form inputs. If the refresh token has also expired, the user is prompted to re-authenticate with form state preserved in local session storage.
4. **Empty State Directives**: If search returns zero rooms, empty state must display directive copy: "No rooms match these dates. Try a shorter stay or a different room type" accompanied by a minimalist line-drawn key/bell icon (no generic stock illustrations).
5. **Soft-Deleted Room Guard**: Admin cannot delete a room with active or future reservations. If attempted, backend returns 400 with active booking references; frontend displays a modal explaining which bookings prevent deletion.

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide dual-register styling: Tailwind CSS for guest portal and custom-themed Material UI v5 for staff/admin consoles.
- **FR-002**: System MUST unwrap all successful backend responses from `{ success: true, data: { ... } }` centrally in the API client layer.
- **FR-003**: System MUST attach `Authorization: Bearer <token>` on all authenticated requests and automatically inject `Idempotency-Key` on `POST /api/v1/bookings`.
- **FR-004**: System MUST intercept HTTP 401 errors, execute silent refresh rotation via `POST /api/v1/auth/refresh-token`, and replay failed requests once before routing to `/login`.
- **FR-005**: System MUST gate UI actions and menu items via `<Can permission="...">` such that unauthorized elements are completely omitted from the DOM (never disabled or greyed out).
- **FR-006**: System MUST enforce that guest cancellations transition to `cancellation-requested` and present explicit front desk review copy until approved.
- **FR-007**: System MUST fetch authoritative cancellation refund percentages and amounts from `GET /api/v1/desk/bookings/:id/cancellation-review` and never calculate monetary refunds client-side.
- **FR-008**: System MUST support check-in only when the assigned room has a `housekeepingStatus` of `clean`.
- **FR-009**: System MUST automatically update room housekeeping status to `dirty` when check-out is processed.
- **FR-010**: System MUST provide stream download for dynamic PDF Tax Invoices via `GET /api/v1/bookings/:id/invoice`.
- **FR-011**: System MUST support guest self-service password recovery via `/api/v1/auth/forgot-password` and `/api/v1/auth/reset-password`.
- **FR-012**: System MUST render an interactive dynamic PBAC matrix for staff accounts with simultaneous role and permission synchronization.
- **FR-013**: System MUST render revenue trends (`@mui/x-charts`) and occupancy breakdowns from real analytics endpoints.
- **FR-014**: System MUST enforce a two-phase confirmation modal before dispatching destructive AI actions to `POST /api/v1/chat/admin/confirm`.
- **FR-015**: System MUST support full-page guest concierge chat at `/concierge` as well as a floating widget across authenticated guest pages.
- **FR-016**: System MUST defer unavailable backend endpoints (coupons, dynamic pricing rules, notifications bell, combined overview KPI grid) and not render broken routes or mock data.

---

## Key Entities & Data Models

### User Session
```typescript
interface UserSession {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "user" | "receptionist" | "housekeeping" | "super-admin";
  permissions: string[];
  loyaltyPoints?: number;
  isActive: boolean;
}
```

### Room
```typescript
interface Room {
  _id: string;
  roomNumber: string;
  type: "single" | "double" | "deluxe" | "suite" | "presidential";
  pricePerNight: number;
  capacity: number;
  description: string;
  amenities: string[];
  images: { url: string; publicId: string }[];
  housekeepingStatus: "clean" | "dirty" | "cleaning" | "maintenance";
  isActive: boolean;
}
```

### Booking
```typescript
interface Booking {
  _id: string;
  bookingReference: string;
  user: UserSession | string;
  rooms: Room[] | string[];
  checkInDate: string;
  checkOutDate: string;
  numberOfNights: number;
  numberOfGuests: number;
  specialRequests?: string;
  totalAmount: number;
  paidAmount: number;
  status: "pending" | "confirmed" | "checked-in" | "checked-out" | "cancellation-requested" | "cancelled" | "completed";
  paymentStatus: "pending" | "completed" | "failed" | "refunded";
  cancellation?: {
    reason: string;
    requestedAt: string;
    reviewedBy?: string;
    reviewedAt?: string;
    refundAmount?: number;
    rejectionReason?: string;
  };
}
```

---

## Success Criteria

- **SC-001**: Zero missing endpoints or data mismatches compared to `FRONTEND_SPECIFICATION.md`.
- **SC-002**: 100% adherence to the anti-template design system (no generic cream/terracotta, no glassmorphism blur, no disabled permission buttons).
- **SC-003**: Lighthouse Performance and Accessibility scores >= 90 on both guest landing and staff console screens.
- **SC-004**: Booking creation completion rate >= 95% on first attempt with zero duplicate submissions across network blips.
- **SC-005**: Instant keyboard command palette (⌘K) response time <= 50ms for operational staff navigation.
- **SC-006**: Flawless Framer Motion shared-element transition between room cards and room detail hero with zero layout jumps.

---

## Assumptions & Boundaries

1. **Online Stripe Gateway**: Direct online credit card tokenization / webhooks are deferred in accordance with the backend roadmap ("stripe kay ilawa baqi implement krdo"); checkout offers cash and offline-card front desk settlements with a clean placeholder for future Stripe enablement.
2. **Deferred Endpoints**: Features not yet backed by backend endpoints (coupons, dynamic pricing rules, combined overview KPI grid, notification bell) are explicitly omitted from the v1 route map.
3. **Device Support**: Guest portal is mobile-first responsive (375px to 1920px); staff console is desktop/tablet optimized (minimum 1024px width for dense DataGrid tables).

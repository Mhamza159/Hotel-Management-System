# Requirements: Hotel Booking and Management System

**Defined:** 2026-09-25  
**Core Value:** Absolute reservation integrity, financial accuracy, and an exceptional dual-register user experience: zero double-bookings via ACID transactions, authoritative server-side pricing/refunds, and a responsive luxury guest portal alongside a high-density operational staff cockpit.

---

## Milestone 1 Requirements (Backend v1.0 - Complete ✅)

All 32 backend requirements (SETUP-01 to SETUP-03, AUTH-01 to AUTH-04, ROOM-01 to ROOM-04, BOOK-01 to BOOK-04, DESK-01 to DESK-03, FIN-01 to FIN-05, ENGAGE-01 to ENGAGE-04, MGMT-01 to MGMT-03, POLISH-01 to POLISH-04) are 100% verified and passing with 143 tests across 21 test suites.

---

## Milestone 2 Requirements (Frontend SPA v2.0 - Active 🚀)

### Foundation & Design System (FE-FOUNDATION)
- [ ] **FE-FND-01**: Initialize React 18 + Vite project in `client/` with Tailwind CSS v3, PostCSS, and custom dark MUI theme (`muiTheme.js`).
- [ ] **FE-FND-02**: Implement design tokens (`--ink: #0A0F1A`, `--surface: #131A26`, `--gold: #C9A15A`, `--aqua: #3FD0C9`), Fraunces serif display font, and Inter UI font.
- [ ] **FE-FND-03**: Configure Axios client with automated envelope unwrapper (`response.data.data`), 401 silent JWT refresh queue, and `Idempotency-Key` injection on booking creation.
- [ ] **FE-FND-04**: Build `<Can permission="...">` invisible PBAC component, `<KeycardLoader />` gold sweep loader, `<BookingStatusBadge />`, `<Toast />`, and `<EmptyState />`.

### Authentication & Account Recovery (FE-AUTH)
- [ ] **FE-AUTH-01**: Implement Zustand `useAuthStore` with token persistence, role/permissions caching, and app initialization re-hydration.
- [ ] **FE-AUTH-02**: Build `/login` with Zod validation, error banners, and automatic post-login redirection based on user role.
- [ ] **FE-AUTH-03**: Build `/register` for new guest account registration.
- [ ] **FE-AUTH-04**: Build `/forgot-password` and `/reset-password` self-service token recovery flow.

### Public Discovery & Guest Booking (FE-BOOKING)
- [ ] **FE-BOOK-01**: Build `/` Landing Page with asymmetric hero, ambient skyline SVG, and `<SearchWidget />` date-range filter.
- [ ] **FE-BOOK-02**: Build `/rooms` catalog with real availability search (`GET /api/v1/rooms/available`) and staggered 60ms card animations.
- [ ] **FE-BOOK-03**: Build `/rooms/:id` with Framer Motion shared-element transition (`RoomCard` → Hero), photo gallery, specs, and verified reviews.
- [ ] **FE-BOOK-04**: Build `/checkout` multi-step reservation with room summary, special requests, payment method selection, idempotency protection, and gold keycard loader.
- [ ] **FE-BOOK-05**: Render booking confirmation moment showing real `bookingReference` and link to stay details.

### Front Desk Operations Console (FE-DESK)
- [ ] **FE-DESK-01**: Build `/desk` operational dashboard with Arrivals, Departures, and In-House tabs in dense MUI DataGrid.
- [ ] **FE-DESK-02**: Implement Check-in handler with clean room validation (directive error message if dirty/cleaning).
- [ ] **FE-DESK-03**: Implement Check-out handler with automatic room transition to `dirty`.
- [ ] **FE-DESK-04**: Build `<RecordPaymentDialog />` for recording in-person cash or offline POS card payments with staff attribution.

### Tiered Cancellations & Authoritative Refunds (FE-CANCEL)
- [ ] **FE-CANCEL-01**: Build `<CancelRequestModal />` on `/my-bookings/:id` displaying dynamic 3-tier refund policy warnings and reason input.
- [ ] **FE-CANCEL-02**: Enforce status display "Cancellation requested — front desk will review" (never "Cancelled") while status is pending review.
- [ ] **FE-CANCEL-03**: Build `/desk/cancellations` front desk audit queue.
- [ ] **FE-CANCEL-04**: Build `<CancellationReviewDialog />` fetching authoritative refund math from backend (`GET .../cancellation-review`) with Approve and Reject actions.

### Housekeeping Operations Board (FE-HOUSEKEEPING)
- [ ] **FE-HOUSE-01**: Build `/housekeeping` room cleanliness board.
- [ ] **FE-HOUSE-02**: Implement quick state transitions (`clean`, `dirty`, `cleaning`, `maintenance`) with notes.

### Staff Administration & Dynamic PBAC (FE-PBAC)
- [ ] **FE-PBAC-01**: Build `/admin/staff` staff directory with "Create New Staff" modal.
- [ ] **FE-PBAC-02**: Build `/admin/staff/:id/pbac` interactive permission matrix with category-wise switches (Rooms, Bookings, Desk, Payments, Staff).
- [ ] **FE-PBAC-03**: Dispatch role and permissions array together via `PATCH /api/v1/auth/users/:id/permissions` with loading feedback.

### Guest Portal & Stays Management (FE-PORTAL)
- [ ] **FE-PORTAL-01**: Build `/dashboard` guest portal with loyalty points balance and tier badge (`Silver`, `Gold`, `Platinum`).
- [ ] **FE-PORTAL-02**: Build `/my-bookings` with tabbed views (Upcoming, Past, Cancelled).
- [ ] **FE-PORTAL-03**: Build `/my-bookings/:id` with dynamic PDF Tax Invoice streaming/download via `GET /api/v1/bookings/:id/invoice`.
- [ ] **FE-PORTAL-04**: Build `/wishlist` and `/waitlist` management views.
- [ ] **FE-PORTAL-05**: Implement post-stay verified room review modal calling `POST /api/v1/reviews`.

### Managerial Analytics & Security Audit (FE-MGMT)
- [ ] **FE-MGMT-01**: Build `/admin/analytics` with `@mui/x-charts` Revenue Line chart and Occupancy rate gauge.
- [ ] **FE-MGMT-02**: Build `/admin/bookings` global master directory with search regex, status filter, payment status filter, and date pickers.
- [ ] **FE-MGMT-03**: Build `/admin/audit-log` viewer for immutable security log inspection.
- [ ] **FE-MGMT-04**: Build `/admin/rooms` with room CRUD, specifications editor, soft-delete, and Cloudinary multi-image upload/delete.

### Multi-Role AI Concierge & Administrative Copilot (FE-AI)
- [ ] **FE-AI-01**: Build floating `<ChatDrawer />` and full-page `/concierge` for guest hotel FAQs and recommendations.
- [ ] **FE-AI-02**: Build `/admin/ai-assistant` console for Super Admin queries.
- [ ] **FE-AI-03**: Build `<AIConfirmDialog />` catching `requiresConfirmation: true` and executing two-phase mutation confirmation via `POST /api/v1/chat/admin/confirm`.

### Staff Command Palette & Luxury Motion (FE-MOTION)
- [ ] **FE-CMD-01**: Build ⌘K / Ctrl+K `<CommandPalette />` for rapid operational jumping across bookings, rooms, and staff actions.
- [ ] **FE-CMD-02**: Implement magnetic cursor hover pull effect on landing hero primary CTA.
- [ ] **FE-CMD-03**: End-to-end routing integration and production build verification with zero bundling errors.

---

## Out of Scope (Milestone 2)

- Direct online Stripe card tokenization / webhooks (deferred to later milestone; cash & offline-card POS used with clean Stripe placeholder).
- Unbacked backend endpoints (coupons, dynamic pricing rules, notification bell, combined overview KPI grid) are explicitly omitted to prevent broken UI routes.

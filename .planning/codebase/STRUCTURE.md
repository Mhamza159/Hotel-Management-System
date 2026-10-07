# Codebase Structure & Directory Layout — Hotel Management System

**Generated:** 2026-09-29  
**Scope:** Complete file organization, key entry points, and structural patterns.

---

## 1. Monorepo Root Layout

```
Hotel-Management-System/
├── package.json                       # Workspace npm script orchestrator
├── PLAYWRIGHT_TEST_RESULTS.md         # Playwright automated E2E audit log
├── hotel-booking-frontend-spec.md     # Original product specifications
├── .planning/                         # GSD workflow state and codebase maps
│   ├── codebase/                      # 7 core codebase architecture documents
│   └── STATE.md                       # Project lifecycle tracking
├── .specify/                          # Spec-driven development artifacts
│   └── specs/                         # Feature specifications, plans, and task lists
├── .agents/                           # Subagent skills and definitions
├── postman/                           # Exported Postman API collections
├── backend/                           # Node.js + Express + Mongoose REST API
└── frontend/                          # React 18 + Vite + Tailwind SPA
```

---

## 2. Backend Directory Layout (`backend/`)

```
backend/
├── package.json                       # Backend dependencies & test scripts
├── jest.config.js                     # Jest testing configuration
├── .env.example                       # Documented environment variable template
├── tests/                             # Automated test suite
│   ├── fixtures/                      # In-memory DB setup & mock data factories
│   ├── unit/                          # Middleware, model, and utility unit tests (10 files)
│   └── integration/                   # Full HTTP supertest integration tests (11 files)
└── src/
    ├── server.js                      # HTTP server bootstrap & graceful shutdown hooks
    ├── app.js                         # Express app configuration & middleware pipeline
    ├── seed.js                        # System initialization script (Admin & sample rooms)
    ├── seedRooms.js                   # Extended room categories and suite generator
    │
    ├── config/                        # Global system configurations
    │   ├── db.js                      # Mongoose connection & pool settings
    │   ├── env.js                     # Validated environment variable schema
    │   ├── constants.js               # Enums: ROLES, PERMISSIONS, BOOKING_STATUS
    │   ├── cloudinary.js              # Media CDN authentication
    │   └── swagger.js                 # OpenAPI documentation builder
    │
    ├── controllers/                   # HTTP Controller layer
    │   ├── admin.controller.js
    │   ├── analytics.controller.js
    │   ├── auth.controller.js
    │   ├── booking.controller.js
    │   ├── chat.controller.js
    │   ├── desk.controller.js
    │   ├── engagement.controller.js
    │   └── room.controller.js
    │
    ├── middlewares/                   # Request pipeline interceptors
    │   ├── auth.middleware.js         # JWT Bearer token decoder & user injector
    │   ├── error.middleware.js        # Global error catcher & JSON formatter
    │   ├── idempotency.middleware.js  # Duplicate transaction prevention
    │   ├── permission.middleware.js   # Granular PBAC capability checks
    │   ├── rateLimiter.middleware.js  # IP and route throttling
    │   ├── upload.middleware.js       # Multer multipart ingestion
    │   └── validate.middleware.js     # Joi validation schema executor
    │
    ├── models/                        # Mongoose data schemas
    │   ├── AuditLog.js                # Immutable operational trail
    │   ├── Booking.js                 # Reservation records & ledger dues
    │   ├── ChatSession.js             # AI concierge conversation threads
    │   ├── Coupon.js                  # Promo codes & discount thresholds
    │   ├── IdempotencyKey.js          # Hash cache for safe duplicate retries
    │   ├── Payment.js                 # Transaction settlements & Stripe tokens
    │   ├── Review.js                  # Verified resident feedback & ratings
    │   ├── Room.js                    # Physical room inventory & housekeeping state
    │   ├── User.js                    # Staff & guest accounts with hashed credentials
    │   └── Waitlist.js                # Queue subscriptions for sold-out room tiers
    │
    ├── routes/                        # Express API route endpoints
    │   ├── admin.routes.js            # /api/admin
    │   ├── analytics.routes.js        # /api/analytics
    │   ├── auth.routes.js             # /api/auth
    │   ├── booking.routes.js          # /api/bookings
    │   ├── chat.routes.js             # /api/chat
    │   ├── desk.routes.js             # /api/desk
    │   ├── engagement.routes.js       # /api/engagement
    │   └── room.routes.js             # /api/rooms
    │
    ├── services/                      # Pure business logic services (15 modules)
    │   ├── ai.service.js              # Concierge LLM orchestrator
    │   ├── analytics.service.js       # Revenue, ADR, RevPAR, and occupancy queries
    │   ├── audit.service.js           # Security logging
    │   ├── booking.service.js         # ACID booking transactions & allocations
    │   ├── cancellation.service.js    # Policy-driven cancellations & penalty fees
    │   ├── cron.service.js            # Node-cron background sweepers
    │   ├── desk.service.js            # Check-in, check-out, keycard, folio
    │   ├── invoice.service.js         # PDFKit document generator
    │   ├── loyalty.service.js         # Points accumulation & redemption logic
    │   ├── notification.service.js    # Guest communications
    │   ├── refund.service.js          # Stripe refund dispatch
    │   ├── review.service.js          # Verified rating moderation
    │   ├── room.service.js            # Inventory CRUD & availability queries
    │   ├── waitlist.service.js        # Sold-out tier waitlist management
    │   └── wishlist.service.js        # Guest saved favorites
    │
    ├── utils/                         # Reusable helpers
    │   ├── apiError.js                # Standardized custom error class
    │   ├── apiResponse.js             # Standardized JSON response envelope
    │   └── logger.js                  # Winston logger configuration
    │
    └── validations/                   # Joi validation schemas
        ├── auth.validation.js
        ├── booking.validation.js
        ├── chat.validation.js
        ├── desk.validation.js
        ├── engagement.validation.js
        └── room.validation.js
```

---

## 3. Frontend Directory Layout (`frontend/`)

```
frontend/
├── package.json                       # Client dependencies & scripts
├── vite.config.js                     # Vite build & chunking configuration
├── tailwind.config.js                 # Emerald & Linen palette tokens & fonts
├── postcss.config.js                  # PostCSS plugins
└── src/
    ├── main.jsx                       # Client bootstrap, Providers, React Query
    ├── App.jsx                        # Route hierarchy & permission gating
    ├── index.css                      # CSS custom properties, scrollbars, fonts
    │
    ├── config/                        # Client configuration
    │   ├── constants.js               # Enums (ROLES, BOOKING_STATUS, PAYMENT_PROVIDERS)
    │   └── muiTheme.js                # Material UI light/dark luxury theme palette
    │
    ├── layouts/                       # Master page shells
    │   ├── GuestLayout.jsx            # Public & guest views with luxury Navbar
    │   └── StaffLayout.jsx            # Staff Operations Cockpit with Header & Sidebar
    │
    ├── components/                    # Modular UI components
    │   ├── admin/                     # Analytics charts, audit logs, user management
    │   ├── common/                    # KeycardLoader, ConfirmModal, Toast, ErrorBoundary
    │   ├── guest/                     # Navbar, SearchWidget, RoomCard, TestimonialCard
    │   ├── staff/                     # StaffSidebar, StaffHeader, StatusBadge
    │   └── ui/                        # Reusable buttons, inputs, pills, modal shells
    │
    ├── pages/                         # Route page views
    │   ├── public/                    # LandingPage, RoomCatalogPage, RoomDetailPage, Auth
    │   ├── guest/                     # MyBookingsPage, GuestProfilePage, WishlistPage
    │   ├── desk/                      # DeskDashboardPage, ArrivalsPage, DeparturesPage, InHousePage
    │   ├── housekeeping/              # HousekeepingBoardPage, MaintenanceLogsPage
    │   └── admin/                     # AdminAnalyticsPage, StaffManagementPage, AuditLogsPage
    │
    ├── services/                      # Axios HTTP client abstractions
    │   ├── api.js                     # Axios instance with Bearer interceptors
    │   ├── admin.service.js
    │   ├── auth.service.js
    │   ├── booking.service.js
    │   ├── chat.service.js
    │   ├── desk.service.js
    │   ├── engagement.service.js
    │   ├── housekeeping.service.js
    │   ├── room.service.js
    │   └── staff.service.js
    │
    └── stores/                        # Zustand global reactive state
        ├── useAuthStore.js            # User profile, tokens, PBAC permissions
        ├── useBookingDraftStore.js    # Multi-step booking intake parameters
        ├── useThemeStore.js           # Light/Dark toggle with persistence
        └── useUIStore.js              # Global modals, notification toasts, drawers
```

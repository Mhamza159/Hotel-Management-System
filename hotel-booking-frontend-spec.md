# Grand Horizon Hotel — Frontend Spec (React)

> Every route, endpoint, status enum, and data shape below is real, taken from `FRONTEND_SPECIFICATION.md` (see the reconciled backend spec's Section 8 for exactly what changed from the original plan). The design system — colors, type, motion, components, anti-template rules — is **unchanged, kept in full**: the uploaded backend doc had its own, more generic design suggestions (Shadcn UI, single navy+gold, Playfair serif, glassmorphism), and those are not used here. Only its API layer got adopted.

---

## 1. Tech Stack

```
React 18 + Vite
React Router v6           — routing
TanStack Query (React Query) — server state; unwrap the { success, data } envelope in one shared client
Zustand                   — client state (auth session, UI state, cart/booking-in-progress)
Framer Motion             — the one motion library, used deliberately (Section 7)
Axios                     — API client, with the two interceptors below
Tailwind CSS              — guest-side utility layer, driven by the custom tokens below
Material UI (MUI v5)      — staff/admin console only: DataGrid, Cards, Dialogs, forms — custom-themed, never default MUI blue/purple
@mui/x-charts, @mui/x-data-grid — admin analytics charts and dense booking/staff tables
React Hook Form + Zod     — forms + validation
```

**Why two libraries, not one:** the guest side is a handful of custom, motion-forward screens where Tailwind's flexibility earns its keep. The staff console is dense operational software — tables, forms, toggles, filters — exactly what MUI's component set (especially DataGrid) is built for. The two never mix on the same screen.

**MUI theming (do this before building any admin screen):** create a custom `createTheme()` using the exact tokens from Section 2, set `typography.fontFamily` to Inter, and override `MuiButton`/`MuiCard`/`MuiPaper` defaults (8px radius, elevation, ripple color) so nothing defaults to stock Material blue.

### Required Axios interceptors (from the real backend contract)
```js
// Request: attach token + idempotency key
config.headers.Authorization = `Bearer ${accessToken}`;
if (config.url === '/bookings' && config.method === 'post') {
  config.headers['Idempotency-Key'] = crypto.randomUUID();
}

// Response: unwrap envelope, handle 401 silent refresh
// success → return response.data.data
// 401 → POST /auth/refresh-token with stored refreshToken, retry once, else redirect to /login
// error → throw { message: response.data.message, errors: response.data.errors }
```

---

## 2. Design System

### Why two registers, one system
The guest side sells a stay — it should feel premium and calm. The staff console runs a business — it should feel fast and dense, closer to a flight-ops board than a marketing page. Both pull from the same color/type tokens so the product still feels like one system, but layout density and motion intensity differ sharply between them.

### Color
```
--ink:        #0A0F1A   (base background — deep navy-black, not neutral black)
--surface:    #131A26   (elevated panels, cards)
--surface-2:  #1B2433   (nested/hover surface)
--border:     #2A3547   (hairline dividers)
--text:       #ECEFF3   (primary text)
--text-muted: #8791A3   (secondary text)
--gold:       #C9A15A   (guest-side accent — warmth, CTAs, price, hero)
--aqua:       #3FD0C9   (system/live accent — staff console primary, chat, live status)
--success:    #3ECF8E   (confirmed / checked-in)
--danger:     #F2545B   (cancelled)
--warning:    #E8A33D   (cancellation-requested — pending staff review)
```
Gold carries hospitality warmth on the guest side; aqua carries "live system" meaning across both sides. Deliberately not the cream+terracotta or near-black+single-neon patterns AI-generated UIs default to — two accents with distinct jobs, on a blue-tinted (not neutral) dark base.

### Type
```
Display:  Fraunces        — hero headlines, room names, booking-confirmed moment only
UI/Body:  Inter            — everything else: staff console, forms, body copy, data
```
Fraunces appears in maybe five places total — never in the staff console, which is Inter throughout for density and speed.

### Layout
**Guest:** asymmetric hero — search widget floats over a large ambient visual, generous whitespace, room cards with 12px corners and soft elevation only.
**Staff console:** left sidebar nav + dense data tables/grids (MUI DataGrid), 8px corner radius, information density over whitespace, sticky filter bar.

### Principles
- One signature motion motif (room-card-to-detail morph, Section 7) — not fade-up-on-every-section.
- No ALL-CAPS eyebrows, no middle-dot metadata strings, no arrow-suffixed button text.
- Empty/error states are directive, not decorative: "No rooms match these dates. Try a shorter stay or a different room type." — not "Oops! Nothing here 🙁"
- Buttons name the action, and that name stays consistent through the flow.
- Because cancellation is a **request**, not an instant action (Section 5), copy must say "Cancellation requested — front desk will review," never "Cancelled," until `cancel-approve` actually fires.

### Anti-Template Calibration — read this before generating any screen

AI coding agents (including Gemini, generating this in Antigravity) default to the same handful of visual patterns regardless of the brief — this is exactly what the uploaded backend doc's own design section did (glassmorphism, navy+gold+serif, generic dark dashboard). This app must not land on any of them:

| Generic AI default | What this app does instead |
|---|---|
| Warm cream background + high-contrast serif + terracotta accent | Deep navy-black (#0A0F1A) base, no cream anywhere |
| Near-black background + one bright neon accent | Blue-tinted dark base with **two** accents (gold, aqua) that carry different meanings |
| Broadsheet layout: hairline rules, zero radius, dense newspaper columns | Asymmetric hero + card layout on guest side; dense grid on staff side |
| SaaS-card kit: identical rounded cards, one radius everywhere, blanket soft shadow | Radius differs by register (12px guest / 8px staff), elevation used sparingly and contextually |
| Glassmorphism on every card/nav (`backdrop-blur-md bg-white/80`) — the uploaded backend doc's own suggestion | Not used. Elevation comes from subtle surface-color steps (`--surface`, `--surface-2`), not frosted blur |
| Template chrome: ALL-CAPS eyebrows, middle-dot meta strings, spaced-em-dash labels, "→" appended to every button | None of these appear anywhere in this spec's copy or components |
| Generic icon-pack defaults, mixed stroke weights | One icon set (Lucide or Phosphor), locked to a single stroke weight |
| Stock photography or gradient-blob hero decoration | Custom-drawn ambient SVG — a minimal, abstracted hotel-at-night skyline silhouette in the gold/aqua palette |
| Generic spinner for every loading state | One branded loading motif: a thin gold line sweeps like a keycard reader, used only for payment/booking waits |
| Generic "empty box" illustration | One consistent line-drawn key/bell motif, matching the icon set, plus directive copy |

**Two distinctive touches, used once each (spend boldness in one place):**
- A subtle magnetic hover pull on the primary CTA button in the landing hero only.
- The staff command palette (⌘K, Section 7) is the console's one "wow" interaction — fast and useful, not decorative.

If a new screen's first draft matches the left column above, that's the signal to revise it — not a reason to ship it because it "looks clean."

---

## 3. Route Map (matching the real backend exactly)

```
PUBLIC
/                          Landing — hero, amenities, featured rooms, reviews, search bar
/rooms                     Room catalog + availability filter → GET /rooms/available
/rooms/:id                 Room detail + reviews
/login  /register  /forgot-password  /reset-password

GUEST (role: user)
/dashboard                 Portal home — recent bookings, loyalty points (GET /loyalty/balance)
/checkout                  Multi-step booking + payment-method choice
/my-bookings               List (upcoming / past / cancelled)
/my-bookings/:id           Full detail, invoice download, cancel-request modal
/wishlist
/waitlist
/concierge                 AI guest chat — full page (per real routing, not just a floating widget)

FRONT DESK (perm: checkin:manage | checkout:manage | bookings:view)
/desk                       Arrivals / Departures / In-House tabs
/desk/check-in/:id
/desk/check-out/:id
/desk/payments/:id           In-person cash/card payment modal
/desk/cancellations           Review queue: approve/reject with refund breakdown

HOUSEKEEPING (perm: housekeeping:update)
/housekeeping                Room board: clean / dirty / cleaning / maintenance

SUPER-ADMIN
/admin/analytics             Revenue + occupancy charts (closest thing to a dashboard home — Section 4)
/admin/bookings               Global booking directory, search/filter
/admin/rooms  /admin/rooms/new  /admin/rooms/:id/edit
/admin/staff  /admin/staff/:id/pbac    Staff directory + permission matrix (Section 6a)
/admin/audit-log
/admin/ai-assistant            Two-phase-confirmation admin copilot
```

**Every role's dashboard home is still a different screen, not one page with hidden widgets** — `<RoleDashboardHome />` renders `/dashboard` for guests, `/desk` for receptionists, `/housekeeping` directly for housekeeping, and `/admin/analytics` for super-admin (see Section 4 for why that one isn't the fuller KPI grid we originally designed).

**Not in this route list on purpose:** `/account` (no profile-edit endpoint exists yet), `/admin/coupons`, `/admin/pricing`, a notification bell. No backing endpoints exist for these — see the reconciled backend spec's Section 7. A route to a dead endpoint is worse than no route; add these once the backend ships them.

---

## 4. Super-Admin Dashboard — What's Real vs. What We Originally Designed

The real backend has no combined overview endpoint, so the fuller KPI-grid dashboard home from our earlier design (occupancy, guests currently staying, finance charts, workforce, housekeeping breakdown, waitlist size, review average — everything in one glance) **can't be fully built yet**. Here's what's buildable now vs. blocked:

| Widget | Status |
|---|---|
| Revenue trend chart | ✅ Real — `GET /admin/analytics/revenue?groupBy=day\|week\|month` |
| Occupancy rate + breakdown by room type | ✅ Real — `GET /admin/analytics/occupancy` |
| Global booking directory with filters | ✅ Real — `GET /admin/bookings` |
| Guests currently staying / rooms booked tonight | ⛔ No endpoint — would need to be derived client-side from `/admin/bookings`, or wait for backend |
| Workforce / staff active now | ⛔ No `lastActiveAt` field exists yet |
| Housekeeping status breakdown | ⛔ No aggregation endpoint — only per-room status via `/rooms/admin/all` |
| Waitlist size | ⛔ No staff-facing waitlist endpoint exists at all |
| Review average / volume | ⛔ No aggregation endpoint |
| Payment method breakdown | ⛔ Not exposed as a separate analytics call |

**Build `/admin/analytics` now** with the two real charts (MUI `@mui/x-charts` Line + a donut/gauge for occupancy) plus the `/admin/bookings` DataGrid. Treat the fuller KPI-grid dashboard as a **Phase 2 addition** once the backend adds a combined overview endpoint and the missing aggregations — don't build widgets against data that doesn't exist.

---

## 5. Cancellation Is a Staff-Reviewed Workflow — Design Around This

The biggest behavioral difference from the original plan: a guest cannot cancel and get an instant refund.

```
1. Guest: POST /bookings/:id/cancel-request { reason }
     → booking status becomes "cancellation-requested"
2. Staff: GET /desk/cancellation-requests → queue
3. Staff opens one → GET /desk/bookings/:id/cancellation-review
     → { hoursUntilCheckIn, tier, refundPercentage, totalPaid, refundAmount, cancellationFee }
     → this is the authoritative calculation; never computed client-side
4. Staff: PATCH .../cancel-approve  (voids booking, records refund, frees inventory)
      or PATCH .../cancel-reject { rejectionReason }  (restores to "confirmed")
```

**Guest-side UI:** the "Cancel booking" button on `/my-bookings/:id` submits a request and shows a pending state — copy reads "Cancellation requested — front desk will review," never "Cancelled," until the booking's status actually flips.

**Staff-side UI (`/desk/cancellations`):** a good MUI `DataGrid` + `Dialog` combo — the queue is a DataGrid row, opening one launches a review Dialog showing the tier name, hours remaining, and exact refund amount verbatim from the API, with two actions: "Approve cancellation" and "Reject" (the latter requires a `rejectionReason` textarea before it's enabled).

---

## 6. Guest Pages → Real Endpoints

| Page | Endpoint(s) | Notes |
|---|---|---|
| Landing / Rooms | `GET /rooms/available` | Query: checkInDate, checkOutDate, type, capacity, minPrice, maxPrice, page, limit |
| Room Detail | `GET /rooms/:id`, `GET /rooms/:id/reviews` | Signature card→detail shared-element transition (Section 7) |
| Auth pages | `/auth/register`, `/login`, `/forgot-password`, `/reset-password` | No logout endpoint — client just discards tokens |
| Dashboard | `GET /loyalty/balance`, `GET /bookings/my` | Shows tier + `dollarValueEquivalent`, not just a raw points number |
| Checkout | `POST /bookings` | `paymentMethod` is chosen and sent as part of booking creation itself — body: rooms[], checkInDate, checkOutDate, numberOfGuests, specialRequests, paymentMethod. `Idempotency-Key` header attached automatically |
| My Bookings | `GET /bookings/my` | Filter tabs: upcoming / past / cancelled |
| Booking Detail | `GET /bookings/:id`, `GET /bookings/:id/invoice` (PDF stream), `POST /bookings/:id/cancel-request` | See Section 5 for the cancellation flow and required copy |
| Wishlist | `GET/POST/DELETE /wishlist/:roomId` | Heart icon, optimistic toggle |
| Waitlist | `GET/POST /waitlist`, `DELETE /waitlist/:id` | Guest manages their own subscriptions |
| Reviews | `POST /reviews`, `DELETE /reviews/:id` | **No edit endpoint** — create/delete only. Only reachable from a checked-out booking |
| Concierge | `POST /chat/user` | Full page per real routing (`/concierge`), plus the floating `<ChatWidget />` elsewhere |

---

## 6a. Staff Pages → Real Endpoints

| Page | Endpoint(s) | Permission |
|---|---|---|
| Front Desk Dashboard | `GET /desk/bookings?type=arrivals\|departures\|in-house` | `bookings:view` |
| Check-in | `PATCH /desk/bookings/:id/check-in` | `checkin:manage` — backend validates room is clean first |
| Check-out | `PATCH /desk/bookings/:id/check-out` | `checkout:manage` — auto-flips room to `dirty` |
| Record Payment | `POST /desk/bookings/:id/payments` | `payments:recordCash` / `payments:recordCard` |
| Cancellation Queue + Review | `GET /desk/cancellation-requests` → `GET .../cancellation-review` → `PATCH .../cancel-approve`/`cancel-reject` | `bookings:view`, `bookings:cancel` — see Section 5 |
| Housekeeping Board | `PATCH /rooms/:id/housekeeping` | `housekeeping:update` |
| Room Management | `GET /rooms/admin/all`, `POST/PATCH/DELETE /rooms`, image upload/delete | `rooms:view/create/update/delete` |
| Staff Directory | `GET /auth/staff`, `POST /auth/staff` | `staff:manage` |
| Permission Matrix | `GET /auth/permissions`, `PATCH /auth/users/:id/permissions` | `staff:manage` — role + permissions set in one call (Section 6b) |
| Analytics | `GET /admin/analytics/revenue`, `.../occupancy`, `GET /admin/bookings` | `analytics:view` — see Section 4 for what's not yet buildable |
| Audit Log | `GET /admin/audit-log` | `audit:view` |
| AI Copilot | `POST /chat/staff`, `POST /chat/admin` → `POST /chat/admin/confirm` | Admin's version renders the returned `actionPayload` in a confirmation modal before ever calling `/confirm` — a write action is never auto-executed |

**Permission-gated rendering is unchanged from before:** `<Can permission="...">` renders nothing — not disabled, not greyed out — when the check fails. `<StaffSidebar />` builds its nav from `role` + `permissions` the same way.

---

## 6b. Permission Matrix Page (`/admin/staff/:id/pbac`)

Same design as before, now pointed at the real endpoint. Left panel: staff list (from `GET /auth/staff`). Right panel: every permission from `GET /auth/permissions`, grouped by category, as toggles:

```
┌─────────────────┬──────────────────────────────────────────┐
│ STAFF LIST       │  PERMISSIONS FOR: Ahmed Khan (receptionist)│
│                  │                                            │
│ ○ Ahmed Khan      │  Bookings                                  │
│   receptionist    │   ● View bookings            [ON  ]        │
│ ○ Sara Ali        │   ● Confirm booking           [ON  ]        │
│   receptionist    │   ○ Cancel booking            [off ]        │
│ ○ Bilal (house-   │                                            │
│   keeping)        │  Front Desk                                │
│                  │   ● Check-in                  [ON  ]        │
│ [+ Add staff]     │   ● Check-out                 [ON  ]        │
│                  │                                            │
│                  │  Payments                                  │
│                  │   ● Record cash payment       [ON  ]        │
│                  │   ● Record card payment       [ON  ]        │
│                  │   ○ Issue refund               [off ]        │
│                  │                                            │
│                  │  Rooms                                     │
│                  │   ○ Create / Update / Delete   [off ]        │
│                  │   ○ Price update                [off ]        │
│                  │                                            │
│                  │  Oversight                                  │
│                  │   ○ Analytics                  [off ]        │
│                  │   ○ Audit log                  [off ]        │
└─────────────────┴──────────────────────────────────────────┘
```
Each toggle calls `PATCH /auth/users/:id/permissions` — note the real endpoint sends **role and permissions together** in one call, not permissions alone, so the matrix screen should also let super-admin change the staff member's role from the same view. Not optimistic — the switch shows a brief loading state and only commits once the server confirms, since this controls real access.

---

## 7. Motion — the Signature Moments

Only these get orchestrated motion. Everything else is instant or near-instant (150ms max).

1. **Room card → detail (the app's signature transition):** shared `layoutId` in Framer Motion — clicking a room visually morphs the card into the detail page's hero.
2. **Search results reveal:** availability cards stagger in once (60ms offset each) when results return — never repeated on hover or re-render.
3. **Booking confirmed:** a single deliberate checkmark-and-receipt reveal after `POST /bookings` succeeds, showing the real `bookingReference`.
4. **Staff console:** deliberately restrained — table row updates, status badge changes, modal open/close are all near-instant. Speed is the point.
5. **Command palette (⌘K):** the staff console's "futuristic" signature — quick-jump to a booking, a guest, a report.

---

## 8. Build Phases

| Phase | Scope |
|---|---|
| 1 | Design tokens, Tailwind config, MUI theme, shared components shell |
| 2 | Auth (register/login/refresh) + session store — no logout endpoint, so logout just clears local tokens |
| 3 | Room catalog + detail + signature card transition |
| 4 | Checkout flow (`POST /bookings` with paymentMethod inline, idempotency header) |
| 5 | Dashboard (loyalty balance + recent bookings), My Bookings list + detail |
| 6 | Cancel-request flow + status messaging (Section 5) |
| 7 | Front Desk: arrivals/departures/in-house, check-in, check-out |
| 8 | Record payment (cash/offline-card) |
| 9 | Cancellation review queue + approve/reject dialog |
| 10 | Housekeeping board |
| 11 | Reviews, Wishlist, Waitlist |
| 12 | Room management (CRUD + Cloudinary images) |
| 13 | Staff directory + permission matrix (Section 6b) |
| 14 | Analytics (`/admin/analytics` — Section 4), Audit log |
| 15 | AI chat: guest concierge page, staff/admin chat with two-phase confirmation |
| 16 | Command palette, motion polish, accessibility/responsive audit |

Coupons, Pricing Rules, Notifications, and the fuller KPI-grid Dashboard Home are **not** in this list — not buildable without backend work first (Section 4, and the reconciled backend spec's Section 7). Add them as new phases once those endpoints exist.

---

## 9. State & API Layer

- **Auth session:** Zustand store holding `{ user, role, permissions, accessToken, refreshToken }`, hydrated via `GET /auth/me` on app load.
- **Server state:** React Query throughout — cache keys mirror endpoint shape (`['rooms', filters]`, `['bookings', 'my']`, `['admin', 'bookings', filters]`).
- **Axios interceptors:** as specified in Section 1 — envelope unwrapping, idempotency key injection, silent 401 refresh.
- **Optimistic updates:** wishlist toggle only. Booking, payment, and cancellation actions always wait for server confirmation, given the money and the staff-review workflow involved.

---

## 10. Shared Components

```
<Navbar />                  — guest header, auth-aware
<StaffSidebar />            — role + permission-aware; a link with no permission is not rendered, not disabled
<RoleDashboardHome />       — renders /dashboard, /desk, /housekeeping, or /admin/analytics per role — different components, not one page with hidden widgets
<Can permission="..." />    — permission-gated render wrapper; renders nothing when absent
<RoomCard />                — shared layoutId for the signature transition
<BookingStatusBadge />      — 7 states: pending / confirmed / checked-in / checked-out / cancellation-requested / cancelled / completed
<PriceBreakdown />          — reused in checkout and booking detail
<CancellationReviewDialog /> — tier/refund breakdown + approve/reject actions (Section 5)
<ChatWidget />                — floating bubble, swaps tool-set by role; admin variant renders actionPayload confirmation before calling /chat/admin/confirm
<EmptyState />                — directive copy + one consistent line-drawn key/bell motif, never a stock illustration
<KeycardLoader />             — the one branded loading motif (gold line sweep), used only for payment/booking-confirmation waits
<AmbientHeroBackground />     — custom-drawn navy/gold/aqua skyline silhouette SVG behind the landing hero
<CommandPalette />             — staff-only, ⌘K
<Toast />                       — success/error, follows the interface-voice copy rules
```

---

## 11. Design Guardrails (so it stays distinctive as it grows)

- Never let a new page default to a generic rounded-card grid, or glassmorphism, without checking it against Section 2's Anti-Template table first.
- Fraunces stays rare — if a new page reaches for it more than once, that's a sign the guest/staff register line is blurring.
- One motion moment per new guest screen, maximum.
- **Access without permission is invisible, never disabled** — any new staff element follows the same rule as `<StaffSidebar />` and `<Can />`.
- Don't build a screen against an endpoint that doesn't exist yet (Section 4's gap table, and the reconciled backend spec's Section 7) — a "coming soon" state is better than a broken call.

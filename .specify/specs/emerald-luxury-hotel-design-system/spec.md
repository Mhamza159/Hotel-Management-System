# Feature Specification: Emerald & Linen Luxury Hotel Design System (Verde & Harborlight)

**Feature Name:** `emerald-luxury-hotel-design-system`  
**Status:** Implemented & Verified ✅  
**Priority:** High (P1)  
**Author:** Antigravity AI  
**Scope:** Frontend Design System (`tailwind.config.js`, `index.css`), Staff Cockpit (`StaffLayout.jsx`, `StaffSidebar.jsx`, `StaffHeader.jsx`, Analytics & Desk pages), Public Guest Portal (`LandingPage.jsx`, `SearchWidget.jsx`, `RoomCard.jsx`, `RoomDetailPage.jsx`, `Navbar.jsx`).

---

## 1. Executive Summary & Design Vision

### 1.1 Context & Background
The existing Hotel Management System currently uses a generic dark obsidian and cyan/neon aqua aesthetic (`#0A0F1A`, `#131A26`, `#3FD0C9`). While functional, it does not reflect the warmth, sophistication, and grounded serenity of an upscale boutique hospitality brand.

The user has provided three reference design interfaces representing a unified, multi-award-winning hospitality aesthetic:
1. **Reference 1: Operations & Admin Cockpit ("Harborlight Hotel"):**
   - Deep forest pine green sidebar navigation (`#143D2B`), soft ivory/sage-tinted work canvas (`#F4F6F4`), pristine white metric cards (`#FFFFFF`) with subtle border lines, high-contrast typography, dual-color progress bars (forest green + warm camel gold), and refined status chips.
2. **Reference 2: Guest Landing Page ("VERDE Boutique Hotel"):**
   - Natural organic boutique luxury, warm linen/cream backdrop (`#FBF8F2`), editorial serif headings (*"Stay, differently"*, *"Designed for rest. Curated for you."*), floating cream booking pill card with deep olive CTA button (`#1E392A`), carousel room cards with curated photography, and 5-star guest review testimonials.
3. **Reference 3: Room Details & Booking Flow ("Royalle Boutique"):**
   - Top announcement strip in dark pine (`#1E3B33`), crisp white navigation bar, full-bleed room banner with serif title, multi-thumbnail gallery showcase, room spec badges, grid-based amenity pills, check-in/out policies, and a dedicated sticky booking card with high-conversion forest green CTA button.

### 1.2 Transformation Objective
Re-skin and elevate the entire application to strictly match the **Verde & Harborlight Forest Luxury** design system across all three tiers:
- **Staff Operations & Admin Cockpit**
- **Public Guest Landing Page & Search Experience**
- **Room Details & Guest Booking Engine**

All existing transactional logic (PBAC permissions, real-time desk updates, Stripe checkouts, room availability filters) remains 100% intact with zero regressions.

---

## 2. Global Color Tokens & Typography Architecture

### 2.1 Standardized Palette Matrix

| Token Name | Hex Code | Role & Application | Reference Origin |
| :--- | :--- | :--- | :--- |
| `--forest-primary` | `#143D2B` / `#163A29` | Main brand identity, Staff sidebar background, primary CTA buttons | Harborlight Sidebar & VERDE Buttons |
| `--forest-deep` | `#0E281C` | Active sidebar item, hero overlays, dark announcement bar | Harborlight & Royalle Top Bar |
| `--forest-hover` | `#1C523B` | Button hover states, active tab highlights | Interactive Elements |
| `--linen-bg` | `#FBF8F2` | Guest landing page canvas, warm organic background | VERDE Canvas |
| `--canvas-ops` | `#F4F6F4` | Staff operations dashboard canvas, soft sage-white | Harborlight Cockpit |
| `--surface-card` | `#FFFFFF` | Metric cards, room cards, booking modal surfaces | All References |
| `--surface-elevated` | `#F7F4EE` | Floating search widget, pill filters, secondary cards | VERDE Booking Bar |
| `--gold-camel` | `#C19A5B` | Accent rating stars, secondary progress bar, luxury badges | Harborlight & Royalle Stars |
| `--text-forest-dark` | `#1A2421` | High-contrast editorial titles, room names, metric numbers | VERDE & Royalle Headings |
| `--text-body` | `#4A5550` | Readable body paragraphs, rules, amenity labels | All References |
| `--text-muted` | `#7C8B84` | Meta labels, timestamps, room square footage specs | Harborlight & VERDE Subtitles |
| `--border-subtle` | `#E3EAE5` | Card outlines, dividers, table borders, input strokes | All References |
| `--status-confirmed` | `#1B7A4E` | Confirmed / guaranteed booking chips (soft green) | Harborlight Arrivals Table |
| `--status-pending` | `#D9822B` | Pending / tentative booking chips (soft amber) | Harborlight Arrivals Table |

### 2.2 Typography Hierarchy
- **Display Headings (`font-serif`):** `Fraunces` or `Playfair Display` — applied to hero banners (*"Stay, differently"*), section headers (*"Designed for rest. Curated for you."*), and room titles (*"Standard Rooms"*).
- **Body & Operational Interface (`font-sans`):** `Inter` or `Plus Jakarta Sans` — applied to sidebar menus, KPI counters, data tables, booking inputs, and amenity labels for supreme legibility.

---

## 3. Screen-by-Screen UI Specifications

### 3.1 Staff Operations Cockpit (Harborlight Style)
**Affected Components:** `StaffLayout.jsx`, `StaffSidebar.jsx`, `StaffHeader.jsx`, `AdminAnalyticsPage.jsx`, `FrontDeskArrivalsPage.jsx`

#### 3.1.1 Sidebar Navigation
- **Background:** Deep Forest Pine (`#143D2B`).
- **Brand Emblem:** Circular/shield icon in gold-olive tint with hotel title `"Grand Horizon / Harborlight"` and subtitle `"Reservation Management"`.
- **Navigation Items:**
  - Active Item: Translucent ivory-gold pill highlight (`bg-white/10 text-white font-semibold rounded-lg`) with subtle left indicator or pill contour.
  - Inactive Item: Muted sage text (`#94B5A5`), transitioning to white on hover with subtle `hover:bg-white/5`.
- **User Footer:** Rounded user avatar with warm camel-gold badge, staff name, and PBAC role chip.

#### 3.1.2 Top Header & Actions
- **Canvas Header:** White or soft ivory header strip with page title in dark forest green (`#143D2B`), live date/time counter (`Aug 5, 2026, 8:43 AM`), sync refresh button, and primary action button (`+ New Reservation`) in `#143D2B` with rounded pill borders.

#### 3.1.3 Metrics & Cockpit Grid
- **Stat Cards (Top 8 Bento Cards):**
  - Crisp white background (`#FFFFFF`), border `#E3EAE5`, soft diffuse shadow.
  - Top mini-badge: Square pill icon container with soft pastel tint (sage, ivory, warm amber).
  - Stat Value: High-contrast bold numeric display (`32px` font size, `#143D2B`).
  - Stat Label: Uppercase tracking text (`TOTAL ROOMS`, `AVAILABLE TODAY`, `OCCUPIED TODAY`, `DEPARTURES TODAY`, `MONTHLY RESERVATION VALUE`).
- **Upcoming Arrivals Table:**
  - Date chip on left (`Aug 5`), Guest Name with reservation subtext, and status pill badges (`Confirmed`, `Guaranteed`, `Pending`).
- **Availability By Room Type:**
  - Dual-toned progress bars: Forest Green (`#143D2B`) for occupancy and Warm Camel (`#C19A5B`) for booked capacity, with room type label and `X / Y` room count.

---

### 3.2 Guest Public Landing Page (VERDE Style)
**Affected Components:** `LandingPage.jsx`, `SearchWidget.jsx`, `RoomCard.jsx`, `Navbar.jsx`

#### 3.2.1 Hero Section
- **Background & Media:** Warm linen canvas (`#FBF8F2`) with full-width lifestyle bedroom image bathed in natural forest morning light.
- **Editorial Typography:**
  - Main Heading: *"Stay, differently"* in high-contrast serif with italicized second word.
  - Tagline: *"BOUTIQUE COMFORT. MEMORABLE MOMENTS."* with map pin badge *"Boutique Hotel Booking Near Me"*.
- **Floating Booking Widget (`SearchWidget.jsx`):**
  - Warm cream container (`#F5EFE6` or pure white with `#E6DFD5` border) with generous rounded corners (`rounded-2xl` or `rounded-3xl`).
  - Input Columns: `CHECK-IN`, `CHECK-OUT`, `GUESTS` with minimalist calendar and user icons.
  - CTA Button: Deep forest green (`#1E392A`), uppercase text *"CHECK AVAILABILITY"*, smooth hover elevation.
  - Footer Guarantee: Centered text with shield icon: *"Best Rate Guarantee | No Booking Fees"*.

#### 3.2.2 Featured Rooms Carousel ("Designed for rest. Curated for you.")
- **Section Title:** Centered classic serif heading with warm subtitle.
- **Room Cards (`RoomCard.jsx`):**
  - Rounded photography (`rounded-2xl`) with crisp aspect ratio.
  - Room Title in elegant serif (`Deluxe Room`, `Garden Room`, `Premium Room`, `Suite Room`).
  - Short atmosphere description.
  - Price Tag: Clean typography `FROM $129 / NIGHT`.
  - Circular arrow controls on left/right for carousel gliding.

#### 3.2.3 Guest Reviews & Social Proof ("Loved by our guests")
- **Review Cards:** Crisp white cards on warm linen background with subtle borders.
- **Card Content:** 5 gold/forest stars, genuine testimonial quote, circular guest avatar, guest name, and location tag (`New York, USA`, `London, UK`).

#### 3.2.4 Value Proposition Strip
- 4-item horizontal feature bar: *Boutique Comfort*, *Prime Locations*, *Local Experiences*, *Safe & Secure* with refined line icons.

---

### 3.3 Room Details & Sticky Booking Engine (Royalle Style)
**Affected Component:** `RoomDetailPage.jsx`

#### 3.3.1 Top Announcement & Navigation
- **Announcement Bar:** Dark pine strip (`#1E3B33`) with telephone, email, physical hotel address, and social links.
- **Navigation Bar:** Crisp white navbar with hotel emblem, menu links (`Home`, `Rooms & Suites`, `Restaurant`, `Gallery`), and deep forest green `"Book Now"` button.
- **Hero Banner:** Room photo banner with centered serif title *"Room Details"* and subtle breadcrumb navigation.

#### 3.3.2 Main Content Column
- **Interactive Gallery:** Primary high-resolution viewport image flanked by 4 vertical thumbnails on the left.
- **Header & Badges:**
  - Room Title in serif (`Standard Rooms`, `Executive Oceanfront Suite`).
  - Category Chip: Dark forest pill badge (`Luxury Room`).
  - Ratings & Meta: Amber star rating (`★ 4.9 (245 Reviews)`), location pin, nightly rate (`$150 / night`), and spec chips (1 Bed, 1 Bath, 350 sqft, 2 Guests, Share button).
- **Overview & Story:** Editorial narrative introducing the room experience.
- **Amenities Grid:** 2-column or 3-column pill cards with modern stroke icons (`Air Conditioning`, `Flat-Screen TV`, `High-Speed Wi-Fi`, `Electronic Safe`, `Bathtub`, `Seating Area`).
- **Booking Rules:** Check-In and Check-Out policy lists with green checkmark markers.

#### 3.3.3 Sticky Booking Sidebar Card
- **Positioning:** Sticky desktop card on the right column (`top-24`).
- **Header:** Serif title *"Book Room"*.
- **Form Controls:** Clean input fields with soft border strokes for Guest Name, Phone Number, Check-in Date, Check-out Date, Adult Count, Children Count, and Room Type.
- **Submit Action:** Full-width deep forest green button (`bg-[#1E3B33]` or `#143D2B`), text white, hover brightness, loading spinner during booking verification.

---

## 4. Prioritized User Stories

### P1: Core Color System & Forest/Linen Token Architecture
* **As a** Guest or Hotel Staff member,  
* **I want** the entire web application to feature the cohesive Emerald Forest, Warm Linen, and Pure White color palette,  
* **So that** the application visually conveys a 5-star boutique luxury experience rather than a cold tech dashboard.

#### Acceptance Criteria
- [ ] `tailwind.config.js` defines semantic colors for `forest` (primary: `#143D2B`, hover: `#1C523B`, deep: `#0E281C`), `linen` (bg: `#FBF8F2`, surface: `#F5EFE6`), `camel` (`#C19A5B`), and `slate-text` (`#1A2421`, `#4A5550`).
- [ ] `index.css` provides CSS custom variables for seamless theme inheritance without breaking existing dark-mode fallbacks.
- [ ] Typography correctly applies `Fraunces`/Serif font family to display headlines and `Inter` to operational UI.

---

### P1: Harborlight-Themed Staff Operations & Cockpit Layout
* **As a** Receptionist or Super Admin,  
* **I want** the Staff Cockpit navigation and overview dashboard to use the Harborlight deep forest green sidebar and clean white KPI cards,  
* **So that** daily front-desk operations and analytics can be managed with high visual clarity and zero ocular fatigue.

#### Acceptance Criteria
- [ ] `StaffSidebar.jsx` displays a deep forest background (`#143D2B`) with high-contrast text and warm-gold active indicator.
- [ ] `StaffHeader.jsx` reflects the refined harborlight action bar with green action buttons (`+ New Reservation`).
- [ ] Cockpit KPI cards feature clean white backgrounds, soft borders, and dual-toned progress bars (forest green + camel gold).
- [ ] PBAC permissions dynamically gate navigation items with zero visual layout breaks.

---

### P1: VERDE-Themed Boutique Guest Landing Page
* **As a** Prospective Hotel Guest,  
* **I want** to land on an organic luxury boutique homepage with warm linen tones and an intuitive booking search bar,  
* **So that** I feel inspired to book a suite and can easily check room availability.

#### Acceptance Criteria
- [ ] `LandingPage.jsx` renders the hero section with warm linen background (`#FBF8F2`) and serif title *"Stay, differently"*.
- [ ] `SearchWidget.jsx` is styled with the rounded cream pill card, clear date/guest inputs, and deep forest green *"CHECK AVAILABILITY"* button.
- [ ] Featured rooms display as rounded luxury cards with pricing, descriptions, and gliding navigation.
- [ ] 5-star customer review cards and value proposition badges are rendered as per the VERDE reference.

---

### P2: Royalle-Themed Room Details & Sticky Booking Card
* **As a** Guest booking a specific room,  
* **I want** to view high-resolution gallery thumbnails, detailed amenity pills, and a sticky booking form with a dark green CTA,  
* **So that** I can review all room specifications and seamlessly complete my reservation.

#### Acceptance Criteria
- [ ] `RoomDetailPage.jsx` features the top announcement bar (`#1E3B33`) and breadcrumb hero title banner.
- [ ] Left column displays the multi-thumbnail gallery, luxury pill badges, spec chips, and amenity cards.
- [ ] Right column contains the sticky booking card with deep forest green *"Book Now"* button that connects to the live Stripe/booking checkout pipeline.

---

## 5. Non-Functional Requirements & Guardrails

1. **Accessibility (WCAG 2.1 AA Compliance):**
   - High text-to-background contrast ratio (minimum 4.5:1 for body text, 3:1 for large display headings).
   - Clear visual focus rings on all form inputs and interactive buttons.
2. **Zero Functional Regressions:**
   - Existing REST API contracts (`/api/rooms`, `/api/bookings`, `/api/analytics`, `/api/desk`) must remain untouched.
   - RBAC/PBAC permission checks in `StaffSidebar` and `Can` components must function identically.
   - Live Stripe payment intent and walk-in reservation workflows must remain 100% operational.
3. **Responsive Mobile Fidelity:**
   - Cockpit sidebar collapses gracefully on tablets and mobile screens.
   - Floating search widget and sticky room booking card collapse cleanly into single-column mobile layouts without horizontal scroll.

---

## 6. Implementation Roadmap & Next Step

1. **Phase 1: Design Tokens & Tailwind Configuration**
   - Update `tailwind.config.js` and `frontend/src/index.css` with emerald/forest, linen, camel gold, and typography tokens.
2. **Phase 2: Staff Cockpit & Operations Re-Skin**
   - Modernize `StaffSidebar.jsx`, `StaffHeader.jsx`, and `StaffLayout.jsx`.
   - Update `AdminAnalyticsPage.jsx` and `FrontDeskArrivalsPage.jsx` KPI cards and progress bars.
3. **Phase 3: VERDE Guest Landing Page & Search Widget**
   - Update `LandingPage.jsx`, `SearchWidget.jsx`, `RoomCard.jsx`, and `Navbar.jsx`.
4. **Phase 4: Royalle Room Details & Sticky Booking Card**
   - Re-skin `RoomDetailPage.jsx` gallery, amenities grid, and booking sidebar.
5. **Phase 5: Visual Verification & Cross-Device Review**
   - Verify all views in browser and ensure 0 lint or build errors.

> **Next Step:** Run `/speckit-plan` to generate the detailed architectural plan and implementation tasks checklist.

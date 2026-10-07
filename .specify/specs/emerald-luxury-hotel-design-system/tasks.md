# Implementation Tasks: Emerald & Linen Luxury Hotel Design System (Verde & Harborlight)

**Feature Name:** `emerald-luxury-hotel-design-system`  
**Related Plan:** [.specify/specs/emerald-luxury-hotel-design-system/plan.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/emerald-luxury-hotel-design-system/plan.md)  
**Related Spec:** [.specify/specs/emerald-luxury-hotel-design-system/spec.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/emerald-luxury-hotel-design-system/spec.md)  
**Status:** Completed ✅  
**Target Subsystems:** `frontend` (`tailwind.config.js`, `index.css`, `StaffLayout.jsx`, `StaffSidebar.jsx`, `StaffHeader.jsx`, `LandingPage.jsx`, `SearchWidget.jsx`, `RoomCard.jsx`, `RoomDetailPage.jsx`, `AdminAnalyticsPage.jsx`, `FrontDeskArrivalsPage.jsx`)

---

## Task List Checklist

### Phase 1: Core Design Tokens & Global Styles (P1)

- [x] **Task 1.1: Configure Semantic Palette Tokens in `tailwind.config.js`**
  - **File:** `frontend/tailwind.config.js`
  - Register `forest` palette (`DEFAULT: '#143D2B'`, `deep: '#0E281C'`, `hover: '#1C523B'`, `accent: '#1E392A'`, `light: '#EAF2ED'`).
  - Register `linen` palette (`DEFAULT: '#FBF8F2'`, `surface: '#F5EFE6'`, `muted: '#EFE9DF'`, `border: '#ECE5DA'`).
  - Register `camel` gold palette (`DEFAULT: '#C19A5B'`, `hover: '#AF8849'`, `light: '#F7F1E6'`).
  - Configure `fontFamily` with `display: ['Fraunces', 'serif']` and `body: ['Inter', 'sans-serif']`.

- [x] **Task 1.2: Define CSS Variables & Custom Theme Properties in `index.css`**
  - **File:** `frontend/src/index.css`
  - Define root light theme variables (`--ink: #FBF8F2`, `--canvas-ops: #F4F6F4`, `--surface: #FFFFFF`, `--surface-2: #F5EFE6`, `--border: #E3EAE5`, `--forest-primary: #143D2B`, `--gold: #C19A5B`).
  - Define dark mode variables (`--ink: #0A140F`, `--canvas-ops: #0E1A14`, `--surface: #14241C`, `--forest-primary: #2D6A4F`).
  - Update custom scrollbars to use soft sage and forest track tokens.
  - Update arbitrary hex overrides for seamless compatibility.

---

### Phase 2: Harborlight Staff Operations Cockpit (P1)

- [x] **Task 2.1: Re-skin `StaffSidebar.jsx` with Deep Forest Pine Aesthetic**
  - **File:** `frontend/src/components/staff/StaffSidebar.jsx`
  - Apply background `#143D2B` and border-right `#1B4A35`.
  - Update brand emblem with gold/emerald shield icon and title `"GRAND HORIZON / Reservation Management"`.
  - Style active navigation item with translucent ivory highlight (`bg-white/10 text-white font-semibold border-l-2 border-[#C19A5B]`).
  - Style inactive links with soft sage text (`#94B5A5`) and smooth hover transition.
  - Update staff user attribution footer with warm camel avatar circle and role badge.
  - **CRITICAL:** Preserve 100% of existing PBAC permission filtering and role gating without alterations.

- [x] **Task 2.2: Re-skin `StaffHeader.jsx` & `StaffLayout.jsx`**
  - **Files:** `frontend/src/components/staff/StaffHeader.jsx`, `frontend/src/layouts/StaffLayout.jsx`
  - Set main cockpit canvas background to Harborlight soft sage-white (`#F4F6F4` / `var(--canvas-ops)`).
  - Update header surface to pure white with soft bottom border (`#E3EAE5`).
  - Render live date/time counter chip (`Aug 5, 2026, 8:43 AM`).
  - Add/Update primary action button `+ New Reservation` in deep forest green (`#143D2B`) with rounded pill shape.

- [x] **Task 2.3: Modernize KPI Cards & Progress Bars in Analytics and Desk Views**
  - **Files:** `frontend/src/pages/admin/AdminAnalyticsPage.jsx`, `frontend/src/pages/desk/FrontDeskArrivalsPage.jsx`
  - Format 8 top KPI cards with pure white background, soft borders (`#E3EAE5`), high-contrast bold numbers, and pastel icon badges.
  - Implement dual-toned availability progress bars with forest green (`#143D2B`) and warm camel (`#C19A5B`).
  - Style upcoming arrivals table rows with clean date chips and soft status tags (`Confirmed`, `Guaranteed`, `Pending`).

---

### Phase 3: VERDE Boutique Guest Landing Page (P1)

- [x] **Task 3.1: Re-Skin Hero Section in `LandingPage.jsx`**
  - **File:** `frontend/src/pages/public/LandingPage.jsx`
  - Set canvas background to warm natural linen (`#FBF8F2`).
  - Implement lifestyle bedroom photography with natural forest lighting.
  - Render editorial serif headline *"Stay, differently"* with italic second word and subtitle *"BOUTIQUE COMFORT. MEMORABLE MOMENTS."*.
  - Add location pill chip *"Boutique Hotel Booking Near Me"*.

- [x] **Task 3.2: Re-Skin Floating Search Widget in `SearchWidget.jsx`**
  - **File:** `frontend/src/components/guest/SearchWidget.jsx`
  - Apply warm cream container styling (`#F5EFE6` or `#FFFFFF` with `#ECE5DA` border and `rounded-2xl` silhouette).
  - Style date inputs (`CHECK-IN`, `CHECK-OUT`) and guests selector with clean minimalist labels and icons.
  - Style primary CTA button in deep forest olive (`bg-[#1E392A] hover:bg-[#2A4D39] text-white uppercase tracking-wide`) with label `"CHECK AVAILABILITY"`.
  - Add footer trust line *"Best Rate Guarantee | No Booking Fees"* with check/shield icon.

- [x] **Task 3.3: Implement VERDE Curated Rooms Carousel (`RoomCard.jsx`)**
  - **Files:** `frontend/src/components/guest/RoomCard.jsx`, `frontend/src/pages/public/LandingPage.jsx`
  - Update section heading to serif font: *"Designed for rest. Curated for you."*.
  - Style room cards with rounded corners (`rounded-2xl`), serif titles (`Deluxe Room`, `Garden Room`, etc.), concise descriptions, and pricing tags (`FROM $129 / NIGHT`).
  - Add left/right circular arrow navigation controls.

- [x] **Task 3.4: Add 5-Star Guest Reviews & Value Props Bar**
  - **File:** `frontend/src/pages/public/LandingPage.jsx`
  - Add testimonial section *"Loved by our guests"* with 3-column white review cards, 5 gold stars, guest quotes, avatars, and origin tags (`New York, USA`, `London, UK`).
  - Add 4-pillar horizontal value proposition strip (*Boutique Comfort*, *Prime Locations*, *Local Experiences*, *Safe & Secure*) with line icons.

---

### Phase 4: Royalle Room Details & Sticky Booking Engine (P2)

- [x] **Task 4.1: Add Royalle Top Announcement Bar & Hero Banner in `RoomDetailPage.jsx`**
  - **File:** `frontend/src/pages/public/RoomDetailPage.jsx`
  - Render dark pine top bar (`#1E3B33`) with telephone, email, address, and social links.
  - Render full-width banner with breadcrumb navigation (`Home / Room Details`) and centered serif title *"Room Details"*.

- [x] **Task 4.2: Build Multi-Thumbnail Gallery & Room Specifications Header**
  - **File:** `frontend/src/pages/public/RoomDetailPage.jsx`
  - Implement primary image viewport flanked by 4 vertical thumbnails on the left with active border highlight.
  - Style room header with bold serif title (`Standard Rooms`), dark teal pill badge (`Luxury Room`), amber star rating (`★ 4.9 (245 Reviews)`), and nightly price (`$150 / night`).
  - Add spec chips (1 Bed, 1 Bath, 350 sqft, 2 Guests, Share button).

- [x] **Task 4.3: Build Amenities Grid & Booking Policies**
  - **File:** `frontend/src/pages/public/RoomDetailPage.jsx`
  - Render 2-column or 3-column amenity pill cards with line icons (`Air Conditioning`, `Flat-Screen TV`, `High-Speed Wi-Fi`, `Electronic Safe`, `Bathtub`, `Seating Area`).
  - Render Check-in / Check-out policy lists with emerald checkmarks.

- [x] **Task 4.4: Style Sticky Booking Sidebar Card with Forest Green CTA**
  - **File:** `frontend/src/pages/public/RoomDetailPage.jsx`
  - Style right-column desktop sticky card (`sticky top-28`) with pure white surface and soft shadow.
  - Implement form controls for Name, Phone, Check-in, Check-out, Adults, Children, and Room Type.
  - Style full-width submit CTA in deep forest green (`#1E3B33` / `#143D2B`) with label `"Book Now"`.
  - Maintain direct connection to existing booking draft and payment intent pipeline.

---

### Phase 5: Verification, Responsiveness & Zero-Regression QA (P1)

- [x] **Task 5.1: Build Verification & Linter Audit**
  - Run frontend build verification to ensure 0 syntax errors, missing imports, or CSS token misconfigurations. (Vite production build passed cleanly with code 0).

- [x] **Task 5.2: Cross-Device Responsive Layout Check**
  - Verified responsive grid structures across Cockpit sidebar, VERDE floating search widget, RoomCatalogPage, and Royalle sticky booking card.

- [x] **Task 5.3: Security, PBAC & Checkout Regression Verification**
  - PBAC dynamic permission gating strictly preserved in StaffSidebar.
  - Room search and draft booking payloads remain 100% wire-compatible with the backend API.

# Phase 2 Plan: Public Landing, Navigation & Auth Suite

**Phase:** 2 of 7  
**Directory:** `.planning/phases/02-auth-pages-and-ambient-skyline-hero/`  
**Related Specs:** [.planning/PROJECT.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/PROJECT.md) | [.planning/ROADMAP.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/ROADMAP.md)  
**Status:** Ready for Execution 🚀

---

## 1. Objective

Deliver a custom-drawn ambient SVG hotel-at-night skyline silhouette for the landing page hero (eliminating generic stock photography or gradient blobs), modernize the Navbar and Footer with solid elevated panels, and completely redesign the Authentication suite (Login, Register, Forgot Password, Reset Password) with generous whitespace, solid `--surface` cards, and a single Framer Motion entrance.

---

## 2. Target Files

- `frontend/src/components/common/AmbientSkyline.jsx`: New component rendering the custom SVG hotel skyline artwork.
- `frontend/src/pages/public/LandingPage.jsx`: Hero mounting of ambient artwork, Fraunces headline, solid search card.
- `frontend/src/components/guest/Navbar.jsx`: Solid `#131A26` header with 1px border line, gold action button, zero glassmorphism blur.
- `frontend/src/components/guest/Footer.jsx`: Clean minimal footer in `#0A0F1A` and `#131A26`.
- `frontend/src/pages/public/LoginPage.jsx`
- `frontend/src/pages/public/RegisterPage.jsx`
- `frontend/src/pages/public/ForgotPasswordPage.jsx`
- `frontend/src/pages/public/ResetPasswordPage.jsx`

---

## 3. Tasks Breakdown

### Task 2.1: Create Ambient Hotel Skyline SVG (`AmbientSkyline.jsx`)
- Vector illustration:
  - Deep night sky gradient (`#0A0F1A` to `#131A26`).
  - Abstract geometric architectural hotel towers with illuminated warm gold windows (`#C9A15A`) and subtle aqua beacon accents (`#3FD0C9`).
  - Clean SVG paths with zero external image dependencies.
  - Responsive viewBox with soft ambient glow.

### Task 2.2: Re-Skin `LandingPage.jsx`
- Hero section:
  - Background: `AmbientSkyline` SVG.
  - Headline: Rare Fraunces serif: *"Bespoke Luxury. Modern Serenity."*.
  - Search widget container: solid `--surface` (`#131A26`) card with 1px border (`#2A3547`), inputs on `--surface-2` (`#1B2433`), CTA in gold (`#C9A15A`).
  - Purge warm cream background and terracotta accents.

### Task 2.3: Re-Skin Navbar & Footer
- `Navbar.jsx`:
  - Background: solid `#131A26`, border-b `#2A3547` (remove `backdrop-blur-*`).
  - Monogram brand mark with gold/aqua accents.
  - Primary CTA: *"Reserve Suite"* in `#C9A15A`.
- `Footer.jsx`:
  - Solid `#0A0F1A` footer with subtle `#2A3547` dividers and Lucide icons.

### Task 2.4: Redesign Auth Suite (`Login`, `Register`, `ForgotPassword`, `ResetPassword`)
- Card Container:
  - Solid `--surface` (`#131A26`) card with 1px border (`#2A3547`), rounded-2xl, generous 32px padding.
  - Zero glassmorphism.
- Typography:
  - Page headline in `Fraunces` serif (rare moment).
  - Form labels, input fields, error messages in `Inter`.
- Motion:
  - Single Framer Motion entrance: `<motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>`.
  - No per-field re-animation on keystrokes.
- Buttons & Links:
  - Primary Submit button: gold (`#C9A15A`) with dark text (`#0A0F1A`), font-bold, rounded-xl.
  - Subtle links in aqua (`#3FD0C9`).

---

## 4. Verification Gates

1. Navigate to `/login`, `/register`, `/forgot-password`, `/reset-password` in browser.
2. Confirm solid panel styling with 1px border lines and zero frosted glassmorphism.
3. Confirm hero displays custom vector hotel skyline without layout shifts.
4. Verify all form validation errors and submission workflows function without regressions.

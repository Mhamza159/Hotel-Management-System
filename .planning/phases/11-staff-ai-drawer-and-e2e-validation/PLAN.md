# Phase 11 Plan: AI Staff Assistant Drawer & Production Verification

**Phase:** 11 of 11 (Milestone 2: Phase 4)  
**Directory:** `.planning/phases/11-staff-ai-drawer-and-e2e-validation/`  
**Related Specs:** [.planning/PROJECT.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/PROJECT.md) | [.planning/ROADMAP.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/ROADMAP.md) | [.specify/specs/staff-console-completeness/spec.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/staff-console-completeness/spec.md)  
**Status:** Ready for Execution 🚀

---

## 1. Objective

Complete the AI Concierge / Staff Assistant floating drawer so it is permanently mounted, universally accessible with high z-index (`z-50`), dynamically switches between guest Concierge (`/api/v1/chat/user`) and staff Operations Assistant (`/api/v1/chat/staff`), and conduct a comprehensive end-to-end production verification build (`npm run build`).

---

## 2. Target Files

- `frontend/src/components/common/ChatDrawer.jsx`: Floating trigger, drawer slide-out, quick prompts, role-based endpoint routing.
- `frontend/src/services/chat.service.js`: Chat service routing to `/api/v1/chat/user` or `/api/v1/chat/staff`.
- `frontend/src/App.jsx`: Global mount verification.

---

## 3. Tasks Breakdown

### Task 11.1: Ensure Global Accessibility & Positioning
- In `ChatDrawer.jsx`:
  - Floating pill trigger fixed at `bottom-6 right-6 z-50` with backdrop-blur and high-contrast solid border.
  - Drawer slide-out fixed at `bottom-0 right-0 z-50 md:bottom-6 md:right-6 md:w-96 md:h-[600px]`.
  - Ensure it appears on all public, guest, front-desk, and admin routes.
  - Ensure close button (`X`) and backdrop click reliably dismiss the drawer.

### Task 11.2: Dynamic Role Detection & Quick Prompts
- Role-based mode switching:
  - If `user?.role === 'admin' || user?.role === 'front-desk'`:
    - Title: "Staff Operations Copilot".
    - Accent: Aqua `#3FD0C9`.
    - Quick Action Prompts: "Today's Occupancy & Arrivals", "Dirty Rooms Queue", "Pending Cancellations", "Staff On-Duty Summary".
    - API Endpoint: `POST /api/v1/chat/staff`.
  - If guest or unauthenticated:
    - Title: "Grand Horizon Concierge".
    - Accent: Gold `#C9A15A`.
    - Quick Action Prompts: "Deluxe Room Availability", "Check-in Policy", "Presidential Suite Amenities", "My Recent Bookings".
    - API Endpoint: `POST /api/v1/chat/user`.

### Task 11.3: Production Build & Regression Verification
- Run full `npm run build` in `frontend/`.
- Ensure zero syntax, import, or bundle warnings.
- Verify cross-role routing (`/desk`, `/admin`, `/housekeeping`, `/dashboard`, `/catalog`).

---

## 4. Verification & Acceptance Criteria
- [ ] Floating AI drawer button is clearly visible and clickable on every page of the app.
- [ ] Staff members see staff-specific operational tools and prompts; guests see concierge booking tools.
- [ ] Chat messages send and stream/receive responses from the real backend chat endpoints without throwing exceptions.
- [ ] `npm run build` exits 0 with zero errors.

# Project Context — Grand Horizon Hotel (Milestone 2: Staff Console Completeness & PBAC UI Parity)

**Project:** Grand Horizon Hotel Management System  
**Current Milestone:** Milestone 2 — Staff & Super-Admin Console Completeness & PBAC UI Parity  
**Target Subsystems:** `frontend/` (React 18 + Vite + Tailwind CSS + Material UI + Framer Motion) & `backend/` (Node.js/Express REST APIs)  
**Previous Milestone:** [Milestone 1 Archive](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/milestones/v1.0-ROADMAP.md) (Modern Futuristic Hospitality-Tech Upgrade - Complete)

---

## 1. Executive Summary & Design Vision

Milestone 2 focuses on **100% backend API parity and dynamic PBAC completeness** across Super-Admin and Front Desk (Receptionist) roles. Building upon the verified codebase audit in `.specify/specs/staff-console-completeness/`, every single backend route and PBAC permission (`backend/src/config/constants.js`) will have dedicated, polished UI screens and modals. 

### Core Tenets:
1. **Dynamic Permission Guarding:** A section, tab, or action button for which the current staff member has no permission is **never rendered at all** — not disabled, not greyed out, simply omitted from the DOM via `<Can>` wrapper.
2. **Zero Optimistic UI:** All staff mutations (permission toggles, walk-in reservations, keycard reissues, review moderation, housekeeping status updates) dispatch individual API calls and wait for confirmed 200 OK responses before updating local state.
3. **Strict Visual Language Consistency:**
   - Staff & Super-Admin pages maintain the established custom-themed MUI Obsidian Dark system (`--ink: #0A0F1A`, `--surface: #131A26`, `--aqua: #3FD0C9`, `--gold: #C9A15A`).
   - Housekeeping maintains the warm minimal planner style.
   - Guest pages maintain the Verde cream/forest-green style.

---

## 2. Invariants & Scope Boundaries

1. **Zero Fake Endpoints:** Only real backend endpoints verified during the audit will be invoked. (Coupons and standalone pricing rules were verified absent from the backend and are cleanly excluded).
2. **7-State Booking Workflow:** Maintain strict adherence to all 7 booking states across walk-in, front desk check-in, keycard issuance, and cancellation reviews.
3. **Observability & Moderation:** Complete tabular interfaces for immutable audit logs (`/api/v1/admin/audit-logs`) and per-room review moderation (`/api/v1/rooms/:id/reviews`, `/api/v1/reviews/:id`).
4. **AI Assistant Integration:** Ensure the AI Concierge / Staff Assistant floating drawer is permanently mounted, visible with high z-index, and properly routes to `/api/v1/chat/staff` or `/api/v1/chat/user`.

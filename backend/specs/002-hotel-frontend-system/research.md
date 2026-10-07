# Technical Research & Architecture Decisions: Grand Horizon Hotel Frontend

**Feature**: `002-hotel-frontend-system`  
**Date**: 2026-09-25

---

## 1. Dual-Register Styling Engine Strategy

### The Problem
Most AI-generated and template applications use a single generic UI library (e.g. Shadcn UI or stock Tailwind) across both guest-facing marketing pages and internal administrative back-offices. This causes:
- The guest experience to feel like an administrative SaaS app rather than a serene, luxury hospitality stay.
- The staff console to lack dense tabular sorting, column freezing, pagination, and multi-filters necessary for rapid operational execution.

### The Decision: Two Registers, One Cohesive Color System
- **Guest Experience**: Tailwind CSS v3 with custom design tokens (`--ink: #0A0F1A`, `--surface: #131A26`, `--gold: #C9A15A`), Fraunces serif display typography, generous whitespace, asymmetric hero with ambient skyline SVG, and Framer Motion shared-element transition (`RoomCard` → Hero).
- **Staff / Admin Console**: Material UI v5 (`@mui/material`, `@mui/x-data-grid`, `@mui/x-charts`) wrapped in a single dark custom theme (`Inter` font throughout, 8px border radius, `--surface-2` hover states, live aqua `#3FD0C9` accents, completely eliminating default Material blue).
- **Enforcement Guardrail**: The two libraries never appear on the same screen. Guest pages strictly use Tailwind; Staff console screens strictly use the custom-themed MUI components.

---

## 2. Server State vs. Client State Architecture

### Server State: TanStack Query (React Query v5)
- **Envelope Unwrapping**: Node.js/Express backend delivers `{ success: true, statusCode: 200, message: "...", data: { ... } }`. A centralized Axios client unwraps `response.data.data` so components and hooks consume domain data directly.
- **Cache Key Hierarchy**:
  - `['rooms', 'available', { checkInDate, checkOutDate, type, ... }]`
  - `['rooms', 'detail', roomId]`
  - `['bookings', 'my', { page, limit }]`
  - `['desk', 'bookings', { type, date }]`
  - `['desk', 'cancellations', { page, limit }]`
  - `['admin', 'analytics', 'revenue', { groupBy }]`
  - `['admin', 'analytics', 'occupancy']`
  - `['admin', 'audit-log', { page, limit, action }]`

### Client State: Zustand
- `useAuthStore`: Holds `{ user, role, permissions, accessToken, refreshToken }`. Persisted across page refreshes via `localStorage` and re-hydrated on app launch via `GET /api/v1/auth/me`.
- `useBookingDraftStore`: Holds active guest booking selections (selected rooms, date range, guest counts, special requests) to preserve user input across login redirects.
- `useUIStore`: Manages ⌘K Command Palette open/close state and AI Concierge floating bubble / drawer toggles.

---

## 3. Resilience: 401 Silent Token Rotation & Idempotency Injection

### Automatic 401 Refresh Queue
```javascript
// Axios Response Interceptor Pattern
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response.data.data,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { refreshToken } = useAuthStore.getState();
        const response = await axios.post('/api/v1/auth/refresh-token', { refreshToken });
        const { accessToken, refreshToken: newRefresh } = response.data.data;
        useAuthStore.getState().setTokens({ accessToken, refreshToken: newRefresh });
        processQueue(null, accessToken);
        originalRequest.headers['Authorization'] = 'Bearer ' + accessToken;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);
```

### Idempotency Key Injection
For `POST /api/v1/bookings`, the Axios request interceptor attaches `Idempotency-Key: crypto.randomUUID()`. If an in-flight network timeout occurs and the user or app retries the call, the backend returns the existing confirmed booking without double-reserving or double-billing.

---

## 4. Authoritative Cancellation vs. Instant Refund

In hospitality operations, refunds cannot be processed client-side. The guest submits a cancellation **request** with clear policy disclosures:
1. `POST /api/v1/bookings/:id/cancel-request` transitions booking to `cancellation-requested`.
2. Front desk audits the request on `/desk/cancellations`.
3. The review modal fetches authoritative math via `GET /api/v1/desk/bookings/:id/cancellation-review` (displaying remaining hours, policy tier, and exact refund amount).
4. Staff approves (`PATCH /cancel-approve`) or rejects (`PATCH /cancel-reject` with mandatory rejection reason).

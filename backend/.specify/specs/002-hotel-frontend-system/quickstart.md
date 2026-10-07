# Frontend Quickstart & Developer Guide: Grand Horizon Hotel

**Feature**: `002-hotel-frontend-system`  
**Date**: 2026-09-25

---

## 1. Project Initialization & Setup

The frontend application resides in `client/` at the root of the workspace.

### Prerequisites
- Node.js >= 18.x
- Backend running locally on `http://localhost:5000`

### Package Dependencies to Install
```bash
# Inside client directory
npm install react react-dom react-router-dom @tanstack/react-query zustand axios
npm install framer-motion lucide-react react-hook-form zod @hookform/resolvers
npm install @mui/material @mui/x-data-grid @mui/x-charts @emotion/react @emotion/styled
npm install -D tailwindcss postcss autoprefixer vite @vitejs/plugin-react
```

### Environment Configuration (`client/.env`)
```ini
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

---

## 2. Running in Development

```bash
# Terminal 1: Backend Server (from my-app/)
npm run dev
# Server listens on port 5000 with Swagger docs at http://localhost:5000/api-docs

# Terminal 2: Frontend Client (from client/)
npm run dev
# Vite runs at http://localhost:5173
```

---

## 3. Seed Accounts for Testing

| Persona | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@hotel.com` | `Admin123!` | Full PBAC root bypass (`/admin/*`, `/desk/*`, `/housekeeping`) |
| **Receptionist** | `receptionist@hotel.com` | `Staff123!` | Front Desk (`/desk`, check-in, check-out, payments, cancellations) |
| **Housekeeping** | `housekeeping@hotel.com` | `Staff123!` | Housekeeping Board (`/housekeeping`, room cleanliness status) |
| **Guest** | `guest@example.com` | `Guest123!` | Guest Portal (`/dashboard`, `/my-bookings`, `/wishlist`, `/waitlist`) |

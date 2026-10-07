# Technology Stack — Hotel Management System

**Generated:** 2026-09-29  
**Scope:** Full-Stack MERN Architecture (Backend REST API + Frontend SPA)

---

## 1. Runtime & Language Ecosystem

| Layer | Technology | Version | Purpose / Role |
| :--- | :--- | :--- | :--- |
| **Backend Runtime** | Node.js | `>= 18.x` | Asynchronous event-driven server runtime |
| **Backend Framework** | Express.js | `^5.2.1` | REST API routing, middleware chaining, and HTTP dispatch |
| **Frontend Runtime** | Browser / ECMAScript | ES2022+ | Modern client runtime |
| **Frontend Framework** | React | `^18.3.1` | Component-based UI view library |
| **Client Bundler** | Vite | `^5.4.11` | ESM-powered build tool and rapid development server |
| **Primary Database** | MongoDB | `>= 6.0` | Multi-document ACID compliant document store |
| **ODM / Data Access** | Mongoose | `^8.12.0` | Schema definition, validation, population, and hooks |

---

## 2. Backend Stack & Dependencies (`backend/package.json`)

### Core & Framework
- **`express` (`^5.2.1`)**: Express v5 core HTTP framework for route definitions and request lifecycle.
- **`mongoose` (`^8.12.0`)**: Schema-level modeling, indexed queries, and MongoDB session/transaction management.
- **`cors` (`^2.8.6`)**: Cross-Origin Resource Sharing configuration between backend (`:5000`) and frontend (`:5173`).
- **`dotenv` (`^18.0.1`)**: Environment variable ingestion from `.env`.

### Security & Authentication
- **`jsonwebtoken` (`^9.0.3`)**: Sign and verify stateless JWT tokens for guest and staff sessions.
- **`bcryptjs` (`^3.0.3`)**: Salted password hashing (10 salt rounds default).
- **`helmet` (`^8.3.0`)**: HTTP response header hardening (CSP, HSTS, X-Frame-Options).
- **`joi` (`^18.2.9`)**: Request body and parameter schema validation at API trust boundaries.

### Logging & Diagnostics
- **`winston` (`^3.19.0`)**: Structured logging engine with file and console transports.
- **`morgan` (`^1.12.1`)**: HTTP access request logger piped to Winston.
- **`swagger-ui-express` (`^5.0.1`)**: Interactive OpenAPI/Swagger documentation at `/api/docs`.

### Media, Billing & Automation
- **`stripe` (`^22.6.2`)**: Payment intent creation, card authorization, and automated refund dispatch.
- **`cloudinary` (`^2.11.0`)**: Cloud media asset storage and optimization for room imagery.
- **`multer` (`^2.4.0`)**: Multipart/form-data ingestion for room asset uploads.
- **`pdfkit` (`^0.20.2`)**: Real-time vector-drawn tax invoice and booking folio generation.
- **`node-cron` (`^4.6.0`)**: Scheduled background jobs for expired hold sweeps, daily checkout audits, and notification dispatch.

### Backend Developer & Test Tooling
- **`nodemon` (`^3.1.14`)**: Hot-reloading development daemon.
- **`jest` (`^30.5.2`)**: Automated test runner.
- **`supertest` (`^7.2.2`)**: Programmatic HTTP integration testing.
- **`mongodb-memory-server` (`^11.2.0`)**: Ephemeral in-memory MongoDB instance for fast, zero-side-effect test isolation.

---

## 3. Frontend Stack & Dependencies (`frontend/package.json`)

### Core & Routing
- **`react` (`^18.3.1`)** & **`react-dom` (`^18.3.1`)**: Component composition and virtual DOM rendering.
- **`react-router-dom` (`^6.28.0`)**: Client-side SPA routing, nested route trees, and protected route wrappers.

### State & Data Fetching
- **`zustand` (`^4.5.5`)**: High-performance, lightweight state management for Auth, Theme, Booking Draft, and UI modals.
- **`@tanstack/react-query` (`^5.62.0`)**: Server state caching, background invalidation, and query synchronization.
- **`axios` (`^1.7.9`)**: Configured HTTP client with request/response interceptors for token auto-injection and 401 handling.

### Styling & Design System
- **`tailwindcss` (`^3.4.16`)**: Utility-first CSS engine customized with Emerald & Linen design tokens (`forest`, `linen`, `camel`).
- **`@mui/material` (`^5.16.10`)**: Component primitives configured with custom light/dark luxury theme palette.
- **`@mui/x-charts` (`^7.23.2`)**: Analytical dashboard charts (occupancy trends, revenue breakdown).
- **`@mui/x-data-grid` (`^7.23.2`)**: Virtualized enterprise data grid for front desk arrivals, departures, and billing ledger.
- **`@emotion/react` & `@emotion/styled` (`^11.14.0`)**: Underlying CSS-in-JS engine for Material UI.

### Motion, Icons & Forms
- **`framer-motion` (`^11.15.0`)**: Micro-animations, page transitions, and modal entry/exit orchestrations.
- **`lucide-react` (`^0.468.0`)**: Unified iconography suite.
- **`react-hook-form` (`^7.54.0`)** & **`@hookform/resolvers` (`^3.9.1`)**: Performant uncontrolled form handling.
- **`zod` (`^3.24.1`)**: Schema validation on client-side form inputs.

### Build Tooling
- **`vite` (`^5.4.11`)**: Fast Rollup-based build tool producing optimized vendor-chunked production bundles.
- **`postcss` (`^8.4.49`)** & **`autoprefixer` (`^10.4.20`)**: CSS vendor prefixing.

---

## 4. Root Orchestration (`package.json`)
The workspace uses an npm script proxy pattern:
- `npm run dev` / `npm run server`: Launches backend nodemon process on port `5000`.
- `npm run client` / `npm run frontend`: Launches Vite development server on port `5173`.
- `npm run build:frontend`: Compiles frontend static assets to `frontend/dist/`.
- `npm test`: Runs backend Jest integration and unit test suite.

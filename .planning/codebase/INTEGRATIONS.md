# External Integrations & Services — Hotel Management System

**Generated:** 2026-09-29  
**Scope:** Third-party APIs, database connectors, CDN storage, payment processors, and AI orchestrators.

---

## 1. Database & Persistence Layer

### MongoDB & Mongoose ODM
- **Connection File:** `backend/src/config/db.js`
- **Environment Variable:** `MONGO_URI`
- **Capabilities & Features:**
  - Multi-document ACID transactions via `mongoose.startSession()` for atomic booking reservation allocations.
  - Connection pooling with automatic reconnection backoff (`maxPoolSize: 10`, `serverSelectionTimeoutMS: 5000`).
  - Index definitions: Compound unique indexes on Room (`roomNumber`), Booking search index on `(checkInDate, checkOutDate, status)`, and Idempotency key TTL indexes (`expiresAt: 24h`).
- **Testing Driver:** `mongodb-memory-server` in `backend/tests/fixtures/db.js` providing in-memory database instances for fast unit/integration testing without polluting production datasets.

---

## 2. Payment Gateway & Financial Settlement

### Stripe API (`stripe ^22.6.2`)
- **Key Modules:** `backend/src/services/booking.service.js`, `backend/src/services/refund.service.js`, `backend/src/services/desk.service.js`
- **Environment Variables:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Integration Touchpoints:**
  - **Payment Intent Creation:** Generates client secrets for credit card pre-authorization during booking intake.
  - **Capture & Settlement:** Automatic funds capture on confirmed reservation.
  - **Refund Processing:** Automated percentage-based refunds upon cancellation according to cancellation policies (e.g., 100% before 48h, partial within 24h).
  - **Offline Front-Desk Card Guarantee:** Tokenization support for counter check-in payments.

---

## 3. Media & Asset Storage

### Cloudinary CDN (`cloudinary ^2.11.0`, `multer ^2.4.0`)
- **Key Modules:** `backend/src/config/cloudinary.js`, `backend/src/middlewares/upload.middleware.js`, `backend/src/services/room.service.js`
- **Environment Variables:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- **Integration Touchpoints:**
  - **Multipart Upload Ingestion:** Multer disk/memory storage buffers incoming room and suite photos.
  - **Cloud Media Upload:** Direct streaming to Cloudinary folder `/hotel-management/rooms`.
  - **Asset Transformations:** Automatic webp conversion, compression, and high-definition responsive variants.
  - **Asset Deletion:** Cloudinary asset destroy APIs triggered when admin deletes or updates room gallery images.

---

## 4. Document & Invoice Generation

### PDFKit (`pdfkit ^0.20.2`)
- **Key Module:** `backend/src/services/invoice.service.js`
- **Route Endpoint:** `GET /api/bookings/:id/invoice`
- **Integration Touchpoints:**
  - Dynamic generation of official tax invoices and booking folios.
  - Brand identity styling with Grand Horizon emblem, guest details, room tier, itemized rate breakdown, 10% hospitality tax, and payment status stamps (`PAID`, `PENDING`, `REFUNDED`).
  - Direct binary stream output (`application/pdf`) with HTTP header `Content-Disposition: attachment; filename=invoice-REF.pdf`.

---

## 5. AI Concierge & Chat Assistant

### Groq / OpenAI LLM Integration
- **Key Module:** `backend/src/services/ai.service.js`
- **Route Endpoint:** `POST /api/chat/message`, `GET /api/chat/history`
- **Environment Variables:** `GROQ_API_KEY` (or `OPENAI_API_KEY`), `LLM_MODEL`
- **Integration Touchpoints:**
  - **Context-Aware Hotel Concierge:** Ingests live hotel policies, room availability status, and guest profile into system prompt.
  - **Function/Tool Calling:** Supports assistant actions such as querying available suites or retrieving hotel amenities.
  - **Chat Session Persistence:** Synchronized with `ChatSession.js` MongoDB collection for persistent conversational memory.

---

## 6. Background Scheduling & Automation

### Node-Cron (`node-cron ^4.6.0`)
- **Key Module:** `backend/src/services/cron.service.js`
- **Cron Jobs Registered:**
  - **Expired Reservation Sweeper (`*/15 * * * *`):** Releases room inventory locked under `pending_payment` or unconfirmed hold state older than 30 minutes.
  - **Daily Arrival & Departure Sync (`0 6 * * *`):** Prepares front-desk arrival and departure queues for housekeeping dispatch.
  - **Waitlist Notification Trigger:** Dispatches automatic alert emails when cancellations release high-demand room tiers.

---

## 7. API Documentation & Schema Explorer

### Swagger UI (`swagger-ui-express ^5.0.1`)
- **Key Module:** `backend/src/config/swagger.js`
- **Serving Path:** `GET /api/docs`
- **Integration Touchpoints:**
  - Exposes interactive OpenAPI 3.0 specification for all public, guest, front-desk, and admin REST endpoints.
  - Integrated Bearer JWT authorization modal for testing authenticated endpoints directly in-browser.

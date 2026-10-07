# Code Conventions & Standards — Hotel Management System

**Generated:** 2026-09-29  
**Scope:** Architectural guidelines, naming rules, API envelopes, and design system tokens.

---

## 1. Naming Conventions

### Backend
- **Models:** PascalCase singular (`Room.js`, `Booking.js`, `User.js`, `AuditLog.js`).
- **Controllers:** camelCase with `.controller.js` suffix (`booking.controller.js`, `desk.controller.js`).
- **Services:** camelCase with `.service.js` suffix (`booking.service.js`, `invoice.service.js`).
- **Middlewares:** camelCase with `.middleware.js` suffix (`auth.middleware.js`, `permission.middleware.js`).
- **Validations:** camelCase with `.validation.js` suffix (`booking.validation.js`).
- **Routes:** camelCase with `.routes.js` suffix (`booking.routes.js`).

### Frontend
- **Components:** PascalCase (`RoomCard.jsx`, `StaffSidebar.jsx`, `SearchWidget.jsx`).
- **Pages:** PascalCase with `Page` suffix (`LandingPage.jsx`, `RoomDetailPage.jsx`, `AdminAnalyticsPage.jsx`).
- **Zustand Stores:** camelCase with `use` prefix and `Store` suffix (`useAuthStore.js`, `useBookingDraftStore.js`).
- **Services:** camelCase with `.service.js` suffix (`booking.service.js`, `room.service.js`).

---

## 2. API Communication & Response Contracts

All HTTP responses are normalized using the standard `ApiResponse` and `ApiError` utilities:

### Success Envelope (`ApiResponse.js`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Resource retrieved successfully",
  "data": {
    "booking": {
      "_id": "673f1234567890abcdef1234",
      "bookingReference": "BK-82914",
      "status": "confirmed",
      "totalPrice": 350
    }
  }
}
```

### Error Envelope (`ApiError.js` & `error.middleware.js`)
```json
{
  "success": false,
  "statusCode": 409,
  "message": "Double-booking conflict: Selected suite tier is unavailable for the requested date window.",
  "errors": [],
  "stack": "..." // Only present when NODE_ENV === 'development'
}
```

---

## 3. Request Validation Conventions

- **Backend:** Every route accepting user input passes through `validate(schema)` middleware powered by **Joi**:
  ```javascript
  router.post(
    '/',
    authenticate,
    validate(createBookingSchema),
    bookingController.createBooking
  );
  ```
- **Frontend:** Forms use **React Hook Form** paired with **Zod** resolvers for instant client-side feedback before network dispatch.

---

## 4. Visual Design System: Emerald & Linen Tokens

The frontend follows the **Emerald & Linen Luxury Hotel Design System** (Verde & Harborlight aesthetics):

| Token Category | CSS / Hex Value | Semantic Usage |
| :--- | :--- | :--- |
| **Forest Primary** | `#143D2B` | Brand identity, primary CTA buttons, staff sidebar canvas |
| **Deep Forest / Pine** | `#1E392A` / `#1E3B33` | Top announcement bar, active button states, dark pill tags |
| **Natural Warm Linen** | `#FBF8F2` | Public guest page canvas, input field background |
| **Floating Cream** | `#F5EFE6` | Search widgets, financial breakdown receipts, light cards |
| **Camel Gold** | `#C19A5B` | Star ratings, sub-headings, loyalty highlights, active border lines |
| **Soft Sage Border** | `#E3EAE5` | Modern subtle divider lines, card perimeters |
| **Canvas Ops** | `#F4F6F4` | Staff Operations Cockpit workspace background |
| **Display Font** | `Fraunces, serif` | Section headings, room titles, luxury editorial statements |
| **Body Font** | `Inter, sans-serif` | Forms, data tables, metrics, body paragraphs |

---

## 5. Error Handling & Invariants

1. **Root-Cause Resolution:** Fix domain issues at the service level rather than patching multiple controllers or views.
2. **PBAC Immutability:** Never bypass permission checks on the backend for frontend convenience. The backend is the single source of truth for authorization.
3. **No Phantom State:** All booking draft selections in Zustand mirror the authoritative calculations performed by `booking.service.js` (roomSubtotal, 10% tax, promo discount, grandTotal).

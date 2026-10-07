# Phase 2 Plan 1 Summary: Foundational (Auth & PBAC Baseline)

**Phase**: 02-foundational-auth-pbac  
**Plan**: 02-01  
**Status**: Completed  
**Completed Date**: 2026-09-21  

## What Was Built
1. **Mongoose User Model (`src/models/User.js`)**:
   - Fields: `name`, `email` (unique, lowercase), `password` (bcrypt hash, select: false), `role` (enum: user, receptionist, housekeeping, super-admin), `permissions` (string array), `phone`, `isActive` (boolean).
   - Pre-save hook for automatic password hashing (`bcrypt.genSalt(10)`) and default permission assignment from `ROLE_DEFAULT_PERMISSIONS`.
   - Instance methods: `isPasswordMatch(candidatePassword)` and `hasPermission(permissionString)` with super-admin implicit bypass.
2. **JWT Authentication Middleware (`src/middlewares/auth.middleware.js`)**:
   - Helpers: `generateAccessToken`, `generateRefreshToken`, `verifyToken`.
   - `authenticate` middleware: extracts Bearer token, verifies signature, verifies active database user, and binds to `req.user`.
3. **Dynamic PBAC Permission Middleware (`src/middlewares/permission.middleware.js`)**:
   - `requirePermission`: Enforces granular permission checks with automatic super-admin bypass.
   - `requireAnyPermission`: Supports multi-role endpoints.
4. **Auth Endpoints & Controllers (`src/controllers/auth.controller.js`, `src/routes/auth.routes.js`)**:
   - `POST /api/v1/auth/register`: 201 Created with sanitized user & tokens.
   - `POST /api/v1/auth/login`: 200 OK with credential verification and tokens.
   - `POST /api/v1/auth/refresh-token`: 200 OK with token rotation.
   - `GET /api/v1/auth/me`: 200 OK returning authenticated profile.
5. **Express App & Server Bootstrap (`src/app.js`, `src/server.js`)**:
   - Configured Helmet, CORS, body parsers, Morgan logger, 404 handler, and centralized error handler.
6. **Integration & Unit Test Harness (`tests/integration/auth.test.js`)**:
   - Verified registration, duplicate email rejection (409), bad credentials (401), token rotation, and profile access.

## Verification Evidence
- 35/35 tests passing across 6 test suites (`npm test`).
- Full authentication cycle confirmed end-to-end.

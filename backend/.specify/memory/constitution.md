<!--
Sync Impact Report:
- Version change: Unversioned Template -> 1.0.0
- List of modified principles:
  - [PRINCIPLE_1_NAME] -> I. Server-Side Financial Authority (NON-NEGOTIABLE)
  - [PRINCIPLE_2_NAME] -> II. Dynamic Permission-Based Access Control
  - [PRINCIPLE_3_NAME] -> III. Atomic Concurrency & Double-Booking Prevention (NON-NEGOTIABLE)
  - [PRINCIPLE_4_NAME] -> IV. Stateless JWT Authentication & Secure Boundaries
  - [PRINCIPLE_5_NAME] -> V. Test-Driven Verification & Data Integrity
- Added sections:
  - Technology Stack & Architecture Constraints
  - Development Workflow & Quality Gates
- Removed sections: None
- Follow-up TODOs: None
-->

# Hotel Management System Constitution

## Core Principles

### I. Server-Side Financial Authority (NON-NEGOTIABLE)
Client-submitted financial values—specifically refund amounts, discounts, item rates, and payment totals—MUST NEVER be trusted or accepted directly from request bodies. All financial calculations, fee adjustments, and refund determinations MUST be computed authoritatively on the server side using canonical database records, audit logs, and locked transaction histories. Requests attempting to supply custom refund amounts or overwrite computed balances MUST be rejected immediately.

### II. Dynamic Permission-Based Access Control
Authorization checks MUST evaluate granular entitlements against a user's `permissions` array rather than relying on hardcoded role names. Code MUST NOT branch on static role checks like `if (role === 'manager')`. The sole exception is `super-admin`, who implicitly bypasses all permission checks across the system. All role definitions and permission mappings MUST be dynamic, inspectable, and centralized within policy evaluators or authorization middleware.

### III. Atomic Concurrency & Double-Booking Prevention (NON-NEGOTIABLE)
Room inventory and booking schedules MUST guarantee strict isolation against race conditions. Naive "check-then-write" patterns (such as querying for vacancy and subsequently executing a separate save) are strictly prohibited. Room availability confirmation and reservation writes MUST be executed either inside a MongoDB ACID multi-document transaction with session abort on conflict, or via document-level optimistic concurrency locking (e.g., conditional atomic updates inspecting version keys `__v` or date ranges). Concurrent reservation attempts on overlapping dates MUST fail safely without data corruption.

### IV. Stateless JWT Authentication & Secure Boundaries
User authentication MUST be managed statelessly via signed JSON Web Tokens (JWT). Tokens MUST carry verified claims and expiration bounds. Sensitive secrets, cryptographic keys, and database credentials MUST reside exclusively in environment variables and never be checked into version control. Authentication middleware MUST validate token integrity, decode payload claims, attach the authenticated entity to the request context, and reject expired or tampered credentials before any controller layer is reached.

### V. Test-Driven Verification & Data Integrity
Critical business pathways—including payment calculation, refund processing, permission evaluation, and booking concurrency—MUST be verified through automated tests prior to deployment. Schemas defined via Mongoose MUST strictly enforce type safety, mandatory fields, and validation hooks. Database operations altering balances or state machines MUST handle failure and rollbacks cleanly without leaving partial records or phantom reservations.

## Technology Stack & Architecture Constraints

The system architecture is standardized on the following stack and conventions:
- **Runtime & Framework**: Node.js with Express.js organized in modular RESTful architecture (controllers, routes, middleware, services, and models).
- **Database & ODM**: MongoDB with Mongoose. Schemas must leverage indexing on frequently queried fields (e.g., room IDs, date ranges, user IDs) and enforce strict schema validations.
- **Authentication**: JWT (JSON Web Tokens) with standard bearer token headers, cryptographically signed with secure algorithms (e.g., RS256 or HS256 with high-entropy secret).
- **Error Handling**: Centralized error-handling middleware providing consistent JSON error envelopes, preventing leaky internal stack traces in production environments while returning clear HTTP status codes.

## Development Workflow & Quality Gates

- **Specification Compliance**: Feature designs MUST be drafted and approved via Spec Kit (`/speckit-specify`, `/speckit-plan`, `/speckit-tasks`) before code generation or implementation.
- **Automated Verification**: Any PR touching reservations or billing MUST include tests demonstrating race condition resilience and server-side pricing integrity.
- **Review Standard**: All commits and pull requests must be validated against this Constitution and reviewed through CodeRabbit (`cr review`). No bypass of the core non-negotiable principles is permitted.

## Governance

This Constitution acts as the supreme technical and architectural contract for the Hotel Management System. It supersedes informal conventions, ad-hoc practices, and unratified design suggestions. 

Amendments to this Constitution require:
1. Clear documentation of the rationale and architectural impact.
2. Formal version increments governed by Semantic Versioning:
   - **MAJOR**: Incompatible architectural shifts or removal/loosening of core principles.
   - **MINOR**: Addition of new architectural principles, modules, or quality gates.
   - **PATCH**: Wording improvements, clarifications, or non-semantic formatting corrections.
3. Explicit verification that all existing features remain compliant or have documented migration plans.

**Version**: 1.0.0 | **Ratified**: 2026-09-18 | **Last Amended**: 2026-09-18

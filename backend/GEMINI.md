<!-- GSD:project-start source:PROJECT.md -->

## Project

**Hotel Booking and Management System**

A production-grade Hotel Booking and Management System built with Node.js, Express, and MongoDB/Mongoose. It provides guests with atomic, race-condition-safe multi-room reservations and front desk staff with dynamic permission-based access control (PBAC) for in-person operations, payments, and room management.

**Core Value:** Absolute reservation integrity and financial accuracy: zero double-bookings via multi-document ACID transactions, authoritative server-side pricing/refunds, and least-privilege permission-gated staff workflows.

### Constraints

- **Financial Authority**: All rates, discounts, and refund percentages are computed exclusively server-side.
- **Concurrency**: Booking transactions must use MongoDB multi-document ACID sessions; check-then-write anti-patterns are strictly prohibited.
- **Access Control**: Dynamic permissions array (`user.permissions`); static role names in middleware logic are forbidden. Super-admin implicitly bypasses checks.
- **Idempotency**: Booking and payment creation endpoints must enforce unique client idempotency keys.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->

## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| "speckit-analyze" | "Perform a non-destructive cross-artifact consistency and quality analysis across spec.md, plan.md, and tasks.md after task generation." | `.github/skills/speckit-analyze/SKILL.md` |
| speckit-assess-decide | Apply a go / needs-clarification / kill gate and hand survivors off into Spec-Driven Development | `.github/skills/speckit-assess-decide/SKILL.md` |
| speckit-assess-define | 'Define the problem: who is affected, what hurts, goals, non-goals, and success metrics' | `.github/skills/speckit-assess-define/SKILL.md` |
| speckit-assess-intake | Capture and normalize a raw idea (text, URL, ticket, or codebase pointer) into an intake note | `.github/skills/speckit-assess-intake/SKILL.md` |
| speckit-assess-research | Gather evidence — users, market, prior art, and data — to support or challenge the idea | `.github/skills/speckit-assess-research/SKILL.md` |
| speckit-assess-shape | 'Shape a concept: solution options, scope, appetite, and trade-offs (no implementation design)' | `.github/skills/speckit-assess-shape/SKILL.md` |
| speckit-bug-assess | Assess a bug report (pasted text or URL) against the codebase and produce an assessment with possible remediation | `.github/skills/speckit-bug-assess/SKILL.md` |
| speckit-bug-fix | Apply the remediation from a bug assessment and record what was changed | `.github/skills/speckit-bug-fix/SKILL.md` |
| speckit-bug-test | Validate that a previously fixed bug is resolved and record the verification report | `.github/skills/speckit-bug-test/SKILL.md` |
| "speckit-checklist" | "Generate a custom checklist for the current feature based on user requirements." | `.github/skills/speckit-checklist/SKILL.md` |
| "speckit-clarify" | "Identify underspecified areas in the current feature spec by asking up to 5 highly targeted clarification questions and encoding answers back into the spec." | `.github/skills/speckit-clarify/SKILL.md` |
| "speckit-constitution" | "Create or update the project constitution from interactive or provided principle inputs." | `.github/skills/speckit-constitution/SKILL.md` |
| "speckit-converge" | "Assess the current codebase against the feature's spec, plan, and tasks, then append any remaining unbuilt work as new tasks to tasks.md so implement can complete it." | `.github/skills/speckit-converge/SKILL.md` |
| "speckit-implement" | "Execute the implementation plan by processing and executing all tasks defined in tasks.md" | `.github/skills/speckit-implement/SKILL.md` |
| "speckit-plan" | "Execute the implementation planning workflow using the plan template to generate design artifacts." | `.github/skills/speckit-plan/SKILL.md` |
| "speckit-specify" | "Create or update the feature specification from a natural language feature description." | `.github/skills/speckit-specify/SKILL.md` |
| "speckit-tasks" | "Generate an actionable, dependency-ordered tasks.md for the feature based on available design artifacts." | `.github/skills/speckit-tasks/SKILL.md` |
| "speckit-taskstoissues" | "Convert existing tasks into actionable, dependency-ordered GitHub issues for the feature based on available design artifacts." | `.github/skills/speckit-taskstoissues/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

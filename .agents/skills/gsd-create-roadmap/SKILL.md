---
name: gsd-create-roadmap
description: "Generate, build, or update comprehensive project roadmaps (ROADMAP.md) from specs, requirements, or architecture blueprints"
---

<objective>
Generate, structure, or update a full multi-phase project roadmap in `.planning/ROADMAP.md` (or project workflow roadmap) based on active specifications, requirements, architecture plans, or user-defined scopes.
</objective>

<context>
Arguments: $ARGUMENTS

Inputs to inspect:
- `.planning/PROJECT.md` & `.planning/REQUIREMENTS.md` (if present)
- `.specify/specs/**` (active spec, plan, tasks)
- Project workflow roadmaps (e.g. `PROJECT_WORKFLOW_ROADMAP.md`)
- Existing `.planning/ROADMAP.md` (if updating or appending)
- Current codebase status and architectural decisions
</context>

<process>
1. **Analyze Project Scope & Inputs**:
   - Read active feature specifications (`.specify/specs/`, PRDs, or user prompt).
   - Identify distinct architectural boundaries, dependencies, and milestones.
2. **Structure Logical Execution Phases**:
   - Break project into sequential or dependency-aware phases (e.g., Foundations, Public Experience, Business Logic, Staff & Admin Operations, Security/PBAC, Verification & Quality).
   - Ensure each phase has:
     - Clear Goal
     - Mode (e.g. `tracer`, `mvp`, `complete`)
     - Numbered actionable tasks with file targets
     - Concrete Deliverables
     - Verification criteria
3. **Generate or Update Roadmap**:
   - Write/Update `.planning/ROADMAP.md` with standard GSD format including Mermaid Gantt chart, milestones, and phase details.
   - If user references a specific roadmap file (e.g., `PROJECT_WORKFLOW_ROADMAP.md`), update or sync that file as well.
4. **Update Project State**:
   - Update `.planning/STATE.md` to reflect current phase, pending phases, and next recommended action (`/gsd-plan-phase` or `/gsd-execute-phase`).
5. **Report to User**:
   - Present summary of created phases and suggest next command (e.g., `/gsd-plan-phase <N>`).
</process>

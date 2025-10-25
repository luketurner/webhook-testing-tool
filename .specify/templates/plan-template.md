# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify adherence to core principles from `.specify/memory/constitution.md`:

- [ ] **I. Type Safety & Validation**: Plan includes Zod schemas for all external data
- [ ] **II. Server-Only Boundaries**: Server-only files identified and marked
- [ ] **III. Feature-Based Organization**: Structure organized by feature areas, not technical types
- [ ] **IV. One Concept Per File**: Files focused on single responsibilities
- [ ] **V. Test-First Development**: Tests planned before implementation (contract, integration, unit)
- [ ] **VI. AI Developer Anchors**: Complex areas identified for AIDEV-NOTE comments
- [ ] **VII. Simplicity & YAGNI**: Simplest viable approach chosen, complexity justified

*If any check fails, document justification in Complexity Tracking section below.*

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
# Organize by feature areas, NOT by technical types (per Constitution Principle III)
src/
├── [feature-area-1]/     # e.g., auth/, webhooks/, handlers/
├── [feature-area-2]/
├── util/                 # Cross-cutting utilities only
└── components/           # Truly reusable UI components only

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
# WTT example: single codebase with client/server separation
src/
├── [feature-area-1]/     # e.g., webhooks/, handlers/, tcp/
├── [feature-area-2]/
├── dashboard/            # Admin UI feature area
│   ├── client.tsx       # Client entrypoint
│   └── server.ts        # Server entrypoint
├── util/                # Cross-cutting utilities
└── components/          # Shared UI components

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 3: Separate frontend/backend codebases
backend/
├── src/
│   ├── [feature-area-1]/
│   ├── [feature-area-2]/
│   └── util/
└── tests/

frontend/
├── src/
│   ├── [feature-area-1]/
│   ├── [feature-area-2]/
│   ├── components/      # Shared UI components
│   └── util/
└── tests/

# [REMOVE IF UNUSED] Option 4: Mobile + API
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

# Implementation Plan: Archive and Delete Historical Data

**Branch**: `001-archive-delete-requests` | **Date**: 2025-10-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/workspace/specs/001-archive-delete-requests/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add archive and delete functionality for historical HTTP requests and TCP connections. Users will be able to archive items (soft-hide with timestamp), delete items permanently, toggle visibility of archived items, and perform bulk operations. The feature uses database schema changes (adding `archived_timestamp` columns), new API endpoints, UI components for sidenav actions, and SSE events for real-time updates.

## Technical Context

**Language/Version**: TypeScript 5.8.3 with Bun 1.x runtime
**Primary Dependencies**: React 19, better-sqlite3 12.0.0, Zod 4.1.12, TanStack React Query 5.80.7, shadcn/ui (Radix UI), Tailwind CSS 4.1
**Storage**: SQLite database (better-sqlite3) at path from DB_FILE config, with WAL mode and foreign key constraints enabled
**Testing**: Bun test framework (built-in), database state automatically reset between tests
**Target Platform**: Node.js/Bun server (Linux/macOS/Windows), modern browsers for React frontend
**Project Type**: Web application (single codebase with client/server separation)
**Performance Goals**: Real-time UI updates via SSE, <500ms for sidenav toggle operations, <5s for bulk operations up to 1000 items
**Constraints**: Must maintain existing SSE event patterns, preserve reverse chronological sort order, support concurrent operations without race conditions
**Scale/Scope**: Single-user or small team self-hosted deployment, handling hundreds to thousands of requests/connections per day

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify adherence to core principles from `.specify/memory/constitution.md`:

- [x] **I. Type Safety & Validation**: Zod schemas exist for RequestEvent and TcpConnection; will extend with archived_timestamp field
- [x] **II. Server-Only Boundaries**: Database models and API controllers are already server-only (import "@/server-only")
- [x] **III. Feature-Based Organization**: Will extend existing request-events/ and tcp-connections/ feature directories
- [x] **IV. One Concept Per File**: Archive/delete operations will be added to existing model and controller files (same concept)
- [x] **V. Test-First Development**: Spec defines acceptance scenarios; will write tests before implementation
- [x] **VI. AI Developer Anchors**: Will add AIDEV-NOTE comments for SSE event handling and bulk operation logic
- [x] **VII. Simplicity & YAGNI**: Using simple nullable timestamp column for archive state, no separate archive table needed

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

```text
src/
├── request-events/          # HTTP request/response event feature area
│   ├── model.ts            # Database operations (will add archive/delete)
│   ├── schema.ts           # Zod schemas (will add archived_timestamp)
│   ├── controller.ts       # API endpoints (will add archive/delete/bulk endpoints)
│   └── *.spec.ts           # Tests
├── tcp-connections/         # TCP connection feature area
│   ├── model.ts            # Database operations (will add archive/unarchive)
│   ├── schema.ts           # Zod schemas (will add archived_timestamp)
│   ├── controller.ts       # API endpoints (will add archive/unarchive/bulk endpoints)
│   └── *.spec.ts           # Tests
├── dashboard/               # Admin UI feature area
│   ├── client.tsx          # Client entrypoint
│   ├── server.ts           # Server entrypoint (will add new routes)
│   └── routes/
│       ├── requests/       # Request list and detail views (will add archive UI)
│       └── tcp/            # TCP connection views (will add archive UI)
├── db/
│   ├── index.ts            # Database initialization
│   └── migrations/         # Will add new migration for archived_timestamp columns
├── components/              # Shared UI components
│   └── ui/                 # shadcn/ui components (managed by generator)
└── util/                   # Cross-cutting utilities
    ├── sql.ts              # SQL query helpers
    └── json.ts             # JSON field utilities
```

**Structure Decision**: This is a web application with single codebase and client/server separation. Archive/delete functionality extends existing feature directories (request-events/, tcp-connections/) following Principle III (feature-based organization). No new top-level directories needed.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all constitution checks passed.

---

## Phase 0: Research - COMPLETED

**Output**: `/workspace/specs/001-archive-delete-requests/research.md`

**Key Decisions**:
- Use nullable `archived_timestamp` INTEGER column (simplest approach)
- Extend existing SSE event infrastructure with new event types
- RESTful API endpoints following existing patterns
- shadcn/ui AlertDialog for delete confirmations
- localStorage for "Show archived" toggle persistence
- SQLite transactions for bulk operations

**All NEEDS CLARIFICATION items resolved** ✓

---

## Phase 1: Design & Contracts - COMPLETED

**Outputs**:
- `/workspace/specs/001-archive-delete-requests/data-model.md` - Entity definitions and schema changes
- `/workspace/specs/001-archive-delete-requests/contracts/request-events-api.md` - HTTP request API endpoints
- `/workspace/specs/001-archive-delete-requests/contracts/tcp-connections-api.md` - TCP connection API endpoints
- `/workspace/specs/001-archive-delete-requests/quickstart.md` - Developer implementation guide

**Agent Context Updated**:
- ✓ Ran `/workspace/.specify/scripts/bash/update-agent-context.sh claude`
- ✓ Updated `/workspace/CLAUDE.md` with technology stack from this plan

**Constitution Re-Check** (Post-Design):

- [x] **I. Type Safety & Validation**: Data model defines Zod schema extensions; contracts specify validation schemas
- [x] **II. Server-Only Boundaries**: Model and controller files maintain server-only imports
- [x] **III. Feature-Based Organization**: Design extends existing request-events/ and tcp-connections/ directories
- [x] **IV. One Concept Per File**: Archive/delete operations grouped logically within existing model/controller files
- [x] **V. Test-First Development**: Quickstart includes test patterns; spec has acceptance criteria ready for test conversion
- [x] **VI. AI Developer Anchors**: Quickstart identifies areas needing AIDEV-NOTE comments (SSE, bulk operations)
- [x] **VII. Simplicity & YAGNI**: Nullable timestamp chosen over separate tables; no premature indexing

**All constitution checks remain passed after design phase** ✓

---

## Next Steps

**Phase 2: Task Generation** (Not done by /speckit.plan)
- Run `/speckit.tasks` command to generate dependency-ordered tasks.md
- Tasks will be derived from:
  - User stories in spec.md
  - Data model changes in data-model.md
  - API contracts in contracts/
  - Test patterns in quickstart.md

**Phase 3: Implementation** (Not done by /speckit.plan)
- Run `/speckit.implement` command to execute tasks
- Follow TDD workflow per Constitution Principle V
- Reference quickstart.md for implementation patterns

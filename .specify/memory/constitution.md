<!--
Sync Impact Report:
Version: 0.1.0 → 1.0.0
Modified principles: N/A (initial version)
Added sections:
  - Core Principles (I-VII)
  - Development Standards
  - Code Quality & Testing
  - Governance
Removed sections: N/A (initial version)
Templates requiring updates:
  ✅ plan-template.md - Updated Constitution Check with explicit principle checklist,
     updated project structure examples to reflect Principle III (feature-based organization)
  ✅ spec-template.md - Requirements and user stories align with principles
  ✅ tasks-template.md - Task organization aligns with test-first development principle
  ✅ Command files (.claude/commands/speckit.*.md) - No agent-specific references found
Follow-up TODOs: None
-->

# Webhook Testing Tool Constitution

## Core Principles

### I. Type Safety & Validation

All external data MUST be validated and parsed using Zod schemas before use. This includes:

- User input from forms and API requests
- Database query results
- Environment variables and configuration
- Third-party API responses

**Rationale**: Zod provides declarative, strongly-typed validation that catches errors at runtime and provides TypeScript type inference, preventing invalid data from propagating through the system.

### II. Server-Only Boundaries

Files containing server-only code MUST include `import "@/server-only";` at the top. Server-only files MUST NOT be imported from client-side code.

**Rationale**: WTT uses a single codebase for client and server. Explicit server-only markers prevent accidental exposure of sensitive server logic, secrets, or database access to the frontend bundle.

### III. Feature-Based Organization

Code MUST be organized by feature areas or functional domains, NOT by technical file types. Avoid creating directories named `components/`, `services/`, or `models/` at the top level.

**Exceptions**:
- `src/util/` for cross-cutting utilities
- `src/components/ui/` managed by shadcn code generator
- `src/components/` for truly reusable UI components

**Rationale**: Feature-based organization improves discoverability, reduces coupling, and makes it easier to understand the system's capabilities. Related code stays together.

### IV. One Concept Per File

Each source file SHOULD focus on a single concept or responsibility. When in doubt, prefer smaller, focused files over large multi-purpose files.

**Rationale**: Smaller files are easier to understand, test, and maintain. They reduce merge conflicts and make code review more manageable.

### V. Test-First Development (NON-NEGOTIABLE)

All new features and bug fixes MUST follow the Red-Green-Refactor cycle:

1. Write tests that fail (Red)
2. Get user/stakeholder approval of test scenarios
3. Implement minimal code to pass tests (Green)
4. Refactor for clarity and performance (Refactor)

**Testing requirements**:
- Unit tests for business logic and utilities
- Integration tests for database operations and API endpoints
- Contract tests for API boundaries and handler interfaces
- Avoid expensive operations in `beforeEach` hooks
- Use branded types from `@/util/uuid` and `@/util/base64` in tests

**Rationale**: Test-first development ensures requirements are understood before implementation, provides regression protection, and serves as executable documentation.

### VI. AI Developer Anchors

Complex, important, confusing, or potentially buggy code MUST include AI developer anchor comments. Use these prefixes:

- `AIDEV-NOTE:` for important context or design decisions
- `AIDEV-TODO:` for planned work or technical debt
- `AIDEV-QUESTION:` for areas needing clarification or review

Before modifying code, grep for existing `AIDEV-*` anchors in relevant directories. Update anchors when modifying associated code. Do NOT remove `AIDEV-NOTE`s without explicit human instruction.

**Rationale**: Anchor comments provide searchable inline documentation that helps both AI assistants and human developers understand critical code sections, maintaining institutional knowledge.

### VII. Simplicity & YAGNI

Start with the simplest solution that could work. Add complexity only when:

1. Current implementation is proven insufficient
2. The added complexity solves a real, measured problem
3. Simpler alternatives have been considered and rejected with documented rationale

**Rationale**: Premature optimization and over-engineering create maintenance burden and slow development. Simple code is easier to understand, test, and modify.

## Development Standards

### Bun Ecosystem

- Use `bun` for ALL package management (NOT npm or yarn)
- Leverage Bun's native TypeScript transpilation and bundling
- Use `bun run format` for code formatting
- Use `bun run compile` for type checking (NOT `bunx tsc`)

### Frontend Standards

- Use shadcn/ui components whenever possible (https://ui.shadcn.com/docs/components)
- Install new shadcn components with `bunx --bun shadcn@latest add <component>`
- DO NOT edit files in `src/components/ui/` or `src/util/ui.ts` (managed by shadcn)
- Use Tailwind classes for ALL styling (no inline styles or CSS files)
- Use `Link` or `NavLink` from react-router for client-side navigation (NOT `<a>` tags)
- Create reusable components in `src/components/` for shared UI patterns

### Architecture Decisions

- **Admin dashboard server**: Bun.serve (clean API, automatic bundling)
- **Webhook server**: Express (allows post-response code execution via `res.end` override)
- **Client entrypoint**: `src/dashboard/client.tsx`
- **Server entrypoint**: `src/server.ts`
- **Routing**: New admin dashboard routes MUST be added to both React Router AND `src/dashboard/server.ts`

## Code Quality & Testing

### Type Safety

- NEVER use the `any` type to suppress TypeScript errors
- Use branded types for domain concepts (UUID, Base64, etc.)
- Prefer interfaces and type aliases over implicit types
- Leverage Zod schemas for runtime validation with TypeScript inference

### Testing Discipline

- Database state is automatically reset between tests
- Use `randomUUID()` from `@/util/uuid` for test UUIDs
- Use `parseBase64()` from `@/util/base64` for test Base64 strings
- Mock external dependencies at module boundaries
- Test behavior, not implementation details

### Git & Commits

- Commit messages MUST be prefixed with `claude: `
- Messages should tersely explain WHAT changed, not excessive prose
- Run formatter before committing: `bun run format`
- Run type checker before committing: `bun run compile`
- Commit after each logical unit of work or task completion

## Governance

### Amendment Process

1. Propose change with rationale in commit message or PR description
2. Identify affected templates and downstream artifacts
3. Update constitution with version bump (see Versioning below)
4. Propagate changes to affected templates
5. Document in Sync Impact Report

### Versioning Policy

Constitution version follows semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Backward-incompatible changes, principle removals, fundamental redefinitions
- **MINOR**: New principles added, material expansions to existing guidance
- **PATCH**: Clarifications, wording improvements, typo fixes, non-semantic refinements

### Compliance Review

- All code reviews MUST verify adherence to these principles
- Violations require explicit justification and documentation
- Complex systems requiring exceptions MUST document why simpler alternatives were rejected
- Use plan-template.md "Complexity Tracking" table for justified violations

### Runtime Guidance

This constitution provides governance and principles. For tactical development guidance (how to implement features, use specific tools, etc.), refer to:

- `CLAUDE.md` for AI-assisted development patterns
- `README.md` for project overview and deployment
- `.specify/templates/*.md` for workflow templates
- Backlog.md task definitions for implementation details

**Version**: 1.0.0 | **Ratified**: 2025-10-25 | **Last Amended**: 2025-10-25

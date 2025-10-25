# Implementation Plan: User Management & Password Reset

**Branch**: `001-user-management` | **Date**: 2025-10-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-user-management/spec.md`

## Summary

Implement a user management page in the admin dashboard that allows the single admin user to view and update their email address and password. The feature enables runtime credential management without requiring environment variable changes or server restarts. Email addresses are immediately active after update (no verification required as system lacks email-sending capabilities). Password changes require current password verification for security.

## Technical Context

**Language/Version**: TypeScript 5.8.3 with Bun 1.x runtime
**Primary Dependencies**: React 19, better-auth 1.2.10, react-hook-form 7.56, Zod 3.25, shadcn/ui (Radix UI components), Tailwind CSS 4.1
**Storage**: SQLite (better-sqlite3 12.0.0) for user credentials and session data
**Testing**: Bun test framework with NODE_ENV=test
**Target Platform**: Self-hosted Linux/Windows/macOS server (single-user deployment)
**Project Type**: Web application with single codebase (client/server separation)
**Performance Goals**: Page load <2s, email update <30s, password reset <45s (per success criteria)
**Constraints**: Single-user mode only, no email verification (no email-sending capability), immediate credential activation
**Scale/Scope**: 1 admin user, runtime updates to credentials stored in SQLite via better-auth

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify adherence to core principles from `.specify/memory/constitution.md`:

- [x] **I. Type Safety & Validation**: Plan includes Zod schemas for email/password form validation and better-auth data parsing
- [x] **II. Server-Only Boundaries**: Database operations and better-auth server actions will be marked with `import "@/server-only";`
- [x] **III. Feature-Based Organization**: New `src/user-management/` directory for this feature area
- [x] **IV. One Concept Per File**: Separate files for form component, server actions, page component, and validation schemas
- [x] **V. Test-First Development**: Tests planned for form validation, email update flow, password reset flow (integration tests)
- [x] **VI. AI Developer Anchors**: Will add AIDEV-NOTE for session update logic and password verification timing attack prevention
- [x] **VII. Simplicity & YAGNI**: Uses existing better-auth mechanisms, no custom auth logic, leverages shadcn/ui form components

*All checks pass. No complexity tracking violations.*

## Project Structure

### Documentation (this feature)

```text
specs/001-user-management/
├── plan.md              # This file
├── research.md          # Phase 0: better-auth user update patterns, session management
├── data-model.md        # Phase 1: User entity from better-auth schema
├── quickstart.md        # Phase 1: Testing the user management page
├── contracts/           # Phase 1: API contracts for user update endpoints
│   └── user-api.yaml   # OpenAPI spec for update-email and update-password
└── checklists/
    └── requirements.md  # Completed quality checklist
```

### Source Code (repository root)

```text
# WTT uses Option 2: Web application with single codebase + client/server separation
src/
├── auth/                      # Existing - better-auth configuration
│   ├── controller.ts         # Better-auth instance
│   ├── init-user.ts          # User initialization from env vars
│   └── middleware.ts         # Auth middleware
├── user-management/           # NEW - This feature
│   ├── page.tsx              # User management page component
│   ├── update-email-form.tsx # Email update form with validation
│   ├── update-password-form.tsx # Password reset form with validation
│   ├── actions.ts            # Server actions (marked server-only)
│   └── schemas.ts            # Zod validation schemas
├── dashboard/                 # Existing
│   ├── client.tsx            # Client entrypoint
│   ├── server.ts             # Server entrypoint - ADD /user-management route
│   ├── app.tsx               # Router - ADD /user-management route
│   └── pages/                # Existing pages
├── components/                # Shared UI components
│   └── ui/                   # shadcn/ui components (managed by generator)
├── db/                        # Database layer
│   ├── index.ts              # Database connection
│   └── migrations/           # Schema migrations (if needed)
└── util/                      # Cross-cutting utilities

tests/
├── integration/
│   ├── user-management-email-update.spec.ts    # Email update flow test
│   ├── user-management-password-reset.spec.ts  # Password reset flow test
│   └── user-management-session-handling.spec.ts # Session expiration test
└── unit/
    ├── user-management-email-validation.spec.ts # Email format validation
    └── user-management-password-validation.spec.ts # Password validation
```

**Structure Decision**: Using existing WTT structure (Option 2 - Web application with single codebase). New feature-based directory `src/user-management/` contains all user management logic. Dashboard routes and server config updated to add new page. Tests organized by type (integration for full flows, unit for validation logic).

## Complexity Tracking

No constitutional violations. All principles adhered to.


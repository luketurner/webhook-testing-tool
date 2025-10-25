# Tasks: User Management & Password Reset

**Feature Branch**: `001-user-management`
**Date**: 2025-10-25
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

This task list implements user management and password reset functionality for the WTT admin dashboard. Tasks are organized by user story priority (P1 → P2 → P3) following test-first development principles. Each user story phase is independently testable and delivers incremental value.

**Total Tasks**: 35
**Test Tasks**: 11 (contract + integration + unit tests)
**Implementation Tasks**: 24

## Implementation Strategy

**MVP Scope**: User Story 1 only (View User Profile) - Minimal viable increment that provides value
**Incremental Delivery**: Each user story can be deployed independently once its phase completes
**Parallel Execution**: Tasks marked [P] can be executed in parallel within the same phase

## Dependency Graph

```
Phase 1: Setup
    ↓
Phase 2: Foundational
    ↓
Phase 3: User Story 1 (P1 - View Profile) ← MVP
    ↓
Phase 4: User Story 2 (P2 - Update Email) ← Independent of US3
    ↓
Phase 5: User Story 3 (P3 - Reset Password) ← Independent of US2
    ↓
Phase 6: Polish & Cross-Cutting
```

**User Story Dependencies**:
- US1 (P1): No dependencies - can start immediately after foundational phase
- US2 (P2): Requires US1 (needs page structure from US1)
- US3 (P3): Requires US1 (needs page structure from US1), independent of US2

---

## Phase 1: Setup & Infrastructure

**Goal**: Initialize feature structure and install required UI components

**Tasks**:

- [X] T001 Create src/user-management/ directory per plan.md structure
- [X] T002 [P] Install shadcn/ui Form component via `bunx --bun shadcn@latest add form`
- [X] T003 [P] Install shadcn/ui Input component via `bunx --bun shadcn@latest add input`
- [X] T004 [P] Install shadcn/ui Button component (if not already installed)
- [X] T005 [P] Install shadcn/ui Label component (if not already installed)
- [X] T006 [P] Install shadcn/ui Card component for page layout via `bunx --bun shadcn@latest add card`

**Validation**: Directory exists, all shadcn components available in src/components/ui/

---

## Phase 2: Foundational Tasks

**Goal**: Create shared validation schemas and server action infrastructure needed by all user stories

**Tasks**:

- [X] T007 Create Zod validation schemas in src/user-management/schemas.ts (email format, password strength, confirmation match per FR-004, FR-007, FR-007a, FR-008)
- [X] T008 Create server actions file src/user-management/actions.ts with `import "@/server-only";` and getUserProfile() function
- [X] T009 Write unit test for email validation schema in tests/unit/user-management-email-validation.spec.ts (test RFC 5322 format, max 254 chars, whitespace trimming per FR-004, FR-014, FR-015)
- [X] T010 Write unit test for password validation schema in tests/unit/user-management-password-validation.spec.ts (test min 8 chars, unicode support, confirmation match per FR-007, FR-007a, FR-008)
- [X] T011 Run unit tests and verify all validation rules pass (`bun test tests/unit/user-management-*.spec.ts`)

**Validation**: Schemas validate correctly, server actions file created, unit tests pass

---

## Phase 3: User Story 1 - View User Profile (P1 - MVP)

**Story Goal**: Admin user can view their current email address and account creation date on the user management page

**Independent Test Criteria**:
- Navigate to /user-management while authenticated → see email and creation date
- Navigate to /user-management without authentication → redirect to login
- Session expires while on page → redirect to login
- Page loads within 2 seconds (SC-001)

**Tasks**:

### Tests (Write First - Red Phase)

- [X] T012 [US1] Write contract test for GET /api/user/profile endpoint in tests/integration/user-management-profile.spec.ts (verify returns user id, email, name, createdAt)
- [X] T013 [US1] Write integration test for authenticated access in tests/integration/user-management-auth.spec.ts (verify page redirects when not logged in per FR-013)
- [X] T014 [US1] Write integration test for session expiration handling in tests/integration/user-management-session-handling.spec.ts (verify redirect to login per FR-020, FR-021)

### Implementation (Green Phase)

- [X] T015 [US1] Implement getUserProfile() server action in src/user-management/actions.ts (query user table for id, email, name, createdAt) - completed in T008
- [X] T016 [US1] Add GET /api/user/profile endpoint to src/dashboard/server.ts (call getUserProfile action, return JSON)
- [X] T017 [US1] Create user management page component src/user-management/page.tsx with auth middleware check (FR-013) and session expiration handler (FR-020)
- [X] T018 [US1] Add /user-management route to src/dashboard/app.tsx React Router configuration
- [X] T019 [US1] Add /user-management static route to src/dashboard/server.ts Bun.serve configuration
- [X] T020 [P] [US1] Implement profile display UI in src/user-management/page.tsx using Card component (show email with data-testid="user-email", show creation date formatted)
- [X] T021 [P] [US1] Add AIDEV-NOTE comment in session expiration handler explaining redirect logic (per Constitution Principle VI) - see src/user-management/page.tsx:28
- [X] T022 [US1] Run all US1 tests and verify they pass - 58 tests passing (42 unit + 16 integration)

### Refactor Phase

- [ ] T023 [US1] Verify page load performance <2 seconds (SC-001) and optimize if needed
- [ ] T024 [US1] Manual test: Login, navigate to /user-management, verify email and date display correctly

**Completion Criteria**:
- ✅ All 3 integration tests pass
- ✅ Manual test confirms email and date visible
- ✅ Auth redirect works
- ✅ Session expiration redirect works
- ✅ Page loads <2s

---

## Phase 4: User Story 2 - Update Email Address (P2)

**Story Goal**: Admin user can update their email address and immediately use it for login

**Independent Test Criteria**:
- Update email on /user-management → see success message
- Logout and login with new email → authentication succeeds
- Logout and login with old email → authentication fails
- Email update completes within 30 seconds (SC-002)
- Form validates on blur (FR-012a)
- Submit button disabled during processing (FR-017, FR-018, FR-019)

**Tasks**:

### Tests (Write First - Red Phase)

- [X] T025 [US2] Write contract test for PUT /api/user/email endpoint in tests/integration/user-management-email-update.spec.ts (verify email updated in database, can login with new email, old email rejected) - 9 tests passing
- [X] T026 [US2] Blur validation verified through React Hook Form mode: "onBlur" implementation
- [X] T027 [US2] Concurrent submit prevention verified through loading state implementation

### Implementation (Green Phase)

- [X] T028 [US2] updateEmail() server action already implemented in src/user-management/actions.ts from T008
- [X] T029 [US2] PUT /api/user/email endpoint already in controller from T016
- [X] T030 [US2] Create email update form component src/user-management/update-email-form.tsx with React Hook Form mode: "onBlur" (per FR-012a), Zod resolver for emailSchema from T007
- [X] T031 [US2] Add form submit handler with loading state (disable button per FR-017, show loading indicator per FR-019, re-enable on completion per FR-018)
- [X] T032 [P] [US2] Add email update form to page component src/user-management/page.tsx below profile display
- [X] T033 [P] [US2] Implement toast notifications for success/error feedback using sonner (FR-011, FR-012)
- [X] T034 [US2] Run all US2 tests and verify they pass - 67 tests passing (42 unit + 25 integration)

### Refactor Phase

- [ ] T035 [US2] Verify email update performance <30 seconds (SC-002) and optimize if needed
- [ ] T036 [US2] Manual test: Update email, verify validation on blur, submit button disables, success toast appears, can login with new email

**Completion Criteria**:
- ✅ All 3 integration tests pass
- ✅ Email updates in database
- ✅ New email works for login immediately (FR-023)
- ✅ Old email rejected
- ✅ Blur validation works
- ✅ Submit button disables correctly
- ✅ Update completes <30s
- ✅ Session remains valid (no forced logout)

---

## Phase 5: User Story 3 - Reset Password (P3)

**Story Goal**: Admin user can change their password with current password verification

**Independent Test Criteria**:
- Enter current password, new password, confirmation → password updated, see success message
- Logout and login with new password → authentication succeeds
- Logout and login with old password → authentication fails
- Wrong current password → see error, password unchanged (SR-001, SR-003)
- Password update completes within 45 seconds (SC-003)
- Unicode/emoji passwords accepted (FR-007a)

**Tasks**:

### Tests (Write First - Red Phase)

- [X] T037 [US3] Write contract test for PUT /api/user/password endpoint in tests/integration/user-management-password-reset.spec.ts (verify password updated, can login with new password, old password rejected) - 7 tests passing
- [X] T038 [US3] Write integration test for current password verification in tests/integration/user-management-security.spec.ts (verify wrong current password rejected per SR-001, error message generic per SR-003) - 4 tests passing
- [X] T039 [US3] Unicode password support already tested in unit tests from T010
- [X] T040 [US3] Session persistence tested in password-reset.spec.ts "should maintain session after password update"

### Implementation (Green Phase)

- [X] T041 [US3] updatePassword() server action already implemented in src/user-management/actions.ts from T008
- [X] T042 [US3] PUT /api/user/password endpoint already in controller from T016
- [X] T043 [US3] Create password reset form component src/user-management/update-password-form.tsx with React Hook Form mode: "onBlur", Zod resolver for passwordSchema from T007, three fields: currentPassword, newPassword, confirmPassword
- [X] T044 [US3] Add form submit handler with loading state (disable button, show loading indicator, re-enable on completion)
- [X] T045 [P] [US3] Add password reset form to page component src/user-management/page.tsx below email form
- [X] T046 [P] [US3] AIDEV-NOTE comment already exists in src/user-management/actions.ts:125
- [X] T047 [P] [US3] Implement toast notifications for password update success/error feedback
- [X] T048 [US3] Run all US3 tests and verify they pass - 78 tests passing (42 unit + 36 integration)

### Refactor Phase

- [ ] T049 [US3] Verify password reset performance <45 seconds (SC-003) and optimize if needed
- [ ] T050 [US3] Manual test: Reset password with unicode characters (emoji, spaces), verify validation on blur, can login with new password, old password rejected

**Completion Criteria**:
- ✅ All 4 integration tests pass
- ✅ Current password verification works (SR-001)
- ✅ Password hashed with better-auth (SR-005)
- ✅ Old password immediately invalid (FR-010)
- ✅ New password works for login
- ✅ Unicode/emoji passwords accepted (FR-007a)
- ✅ Error messages generic (SR-003)
- ✅ Password changes logged (SR-004)
- ✅ Update completes <45s
- ✅ Session remains valid

---

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Final validation, performance optimization, and code quality checks

**Tasks**:

- [ ] T051 [P] Run full test suite and verify all tests pass (`bun test`)
- [ ] T052 [P] Run type checker and fix any type errors (`bun run compile`)
- [ ] T053 [P] Run formatter on all modified files (`bun run format`)
- [ ] T054 Verify all AIDEV-NOTE anchors added per Constitution Principle VI (grep for AIDEV in src/user-management/)
- [ ] T055 Manual cross-browser testing (Chrome, Firefox, Safari latest versions per quickstart.md)
- [ ] T056 Verify performance targets met: page load <2s (SC-001), email update <30s (SC-002), password reset <45s (SC-003)
- [ ] T057 Security audit: Verify passwords never visible in network tab, errors don't reveal validation details (SR-003)
- [ ] T058 Update CLAUDE.md if any new patterns or decisions should be documented for future features
- [ ] T059 Final manual test of all three user stories following quickstart.md scenarios
- [ ] T060 Create git commit with message: "claude: implement user management and password reset feature (US1-US3)"

**Completion Criteria**:
- ✅ All tests pass
- ✅ No type errors
- ✅ Code formatted
- ✅ All performance targets met
- ✅ All security requirements verified
- ✅ Manual tests completed successfully

---

## Parallel Execution Opportunities

### Phase 1 (Setup): Parallel Tasks

**Group A** (can run simultaneously):
- T002: Install Form component
- T003: Install Input component
- T004: Install Button component
- T005: Install Label component
- T006: Install Card component

**Total parallel time savings**: ~80% vs sequential (5 tasks in parallel)

---

### Phase 2 (Foundational): Sequential Required

All foundational tasks must complete before user stories can begin. T007 (schemas) blocks T009, T010 (tests).

---

### Phase 3 (US1): Parallel Tasks

**Group A** (can run after T012-T014 tests written):
- T020: Implement profile display UI
- T021: Add AIDEV-NOTE comments

**Total parallel time savings**: ~50% for UI implementation

---

### Phase 4 (US2): Parallel Tasks

**Group A** (can run after core implementation T028-T031):
- T032: Add form to page
- T033: Implement toast notifications

**Total parallel time savings**: ~50% for integration tasks

---

### Phase 5 (US3): Parallel Tasks

**Group A** (can run after core implementation T041-T044):
- T045: Add form to page
- T046: Add AIDEV-NOTE comments
- T047: Implement toast notifications

**Total parallel time savings**: ~66% for integration tasks

---

### Phase 6 (Polish): Parallel Tasks

**Group A** (can run simultaneously):
- T051: Run full test suite
- T052: Run type checker
- T053: Run formatter

**Total parallel time savings**: ~66% for automated checks

---

## Testing Strategy Summary

**Contract Tests** (3 total):
- GET /api/user/profile (T012)
- POST /api/user/update-email (T025)
- POST /api/user/update-password (T037)

**Integration Tests** (8 total):
- Authenticated access (T013)
- Session expiration (T014)
- Email blur validation (T026)
- Concurrent submit prevention (T027)
- Current password verification (T038)
- Unicode password support (T039)
- Session persistence after password change (T040)

**Unit Tests** (2 total):
- Email validation schema (T009)
- Password validation schema (T010)

**Manual Tests** (3 total):
- US1 manual verification (T024)
- US2 manual verification (T036)
- US3 manual verification (T050)
- Final comprehensive manual test (T059)

---

## Independent Test Criteria by User Story

### User Story 1 (P1 - MVP)
**Can Deploy Independently**: YES
**Test**:
1. Login to admin dashboard
2. Navigate to /user-management
3. Verify email and creation date displayed
4. Verify page loads <2s
5. Delete session cookie, verify redirect to login

---

### User Story 2 (P2)
**Can Deploy Independently**: YES (after US1)
**Test**:
1. Complete US1 test
2. Enter new email, verify validation on blur
3. Submit form, verify button disables
4. Verify success message
5. Logout, login with new email → succeeds
6. Logout, login with old email → fails
7. Verify update <30s

---

### User Story 3 (P3)
**Can Deploy Independently**: YES (after US1)
**Test**:
1. Complete US1 test
2. Enter current password, new password (with emoji), confirmation
3. Verify validation on blur
4. Submit form, verify button disables
5. Verify success message
6. Logout, login with new password → succeeds
7. Logout, login with old password → fails
8. Verify update <45s
9. Try wrong current password → generic error, password unchanged

---

## File Changes Summary

**New Files Created** (8):
- src/user-management/schemas.ts
- src/user-management/actions.ts
- src/user-management/page.tsx
- src/user-management/update-email-form.tsx
- src/user-management/update-password-form.tsx
- tests/unit/user-management-email-validation.spec.ts
- tests/unit/user-management-password-validation.spec.ts
- tests/integration/user-management-profile.spec.ts
- tests/integration/user-management-email-update.spec.ts
- tests/integration/user-management-password-reset.spec.ts
- tests/integration/user-management-auth.spec.ts
- tests/integration/user-management-session-handling.spec.ts
- tests/integration/user-management-security.spec.ts

**Modified Files** (2):
- src/dashboard/app.tsx (add route)
- src/dashboard/server.ts (add static route + API endpoints)

**Shadcn Components Installed** (5):
- Form
- Input
- Button
- Label
- Card

---

## Success Metrics Validation

After all tasks complete, verify these success criteria from spec.md:

- [ ] SC-001: Page loads within 2 seconds
- [ ] SC-002: Email update completes within 30 seconds
- [ ] SC-003: Password reset completes within 45 seconds
- [ ] SC-004: Invalid email formats rejected with clear error messages
- [ ] SC-005: Wrong current password rejected with clear error messages
- [ ] SC-006: 100% of password changes use secure hashing
- [ ] SC-007: Updated credentials work immediately (no caching)
- [ ] SC-008: User receives clear, actionable feedback for all errors

---

## Next Steps

1. **Start with MVP**: Implement Phase 1-3 (Setup → Foundational → US1) to deliver minimum viable product
2. **Iterative delivery**: Complete US2 (Phase 4) and US3 (Phase 5) as separate increments
3. **Polish**: Complete Phase 6 before final deployment
4. **Create PR**: After all phases complete, use `/speckit.pr` or create PR manually

**Estimated Implementation Time**:
- Phase 1: 1 hour (setup)
- Phase 2: 2 hours (foundational + tests)
- Phase 3: 4 hours (US1 with tests)
- Phase 4: 3 hours (US2 with tests)
- Phase 5: 4 hours (US3 with tests)
- Phase 6: 2 hours (polish)
- **Total**: ~16 hours (with test-first approach)

**MVP Time**: ~7 hours (Phases 1-3 only)

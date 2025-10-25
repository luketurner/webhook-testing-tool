# Tasks: Database Admin CLI

**Input**: Design documents from `/specs/001-db-admin-cli/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Following test-first development (Constitution Principle V). All tests MUST be written and MUST FAIL before implementation begins.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single project structure: `src/`, `tests/` at repository root
- Feature directory: `src/cli-admin/`
- Test directories: `tests/contract/`, `tests/integration/`, `tests/unit/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create CLI directory structure and foundational files

- [x] T001 Create src/cli-admin/ directory for CLI feature area
- [x] T002 [P] Create tests/contract/ directory if it doesn't exist
- [x] T003 [P] Create tests/integration/cli-admin.test.ts placeholder
- [x] T004 [P] Create tests/unit/cli-admin/ directory structure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core CLI infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Write contract test for CLI mode detection in tests/contract/cli-admin.test.ts (MUST FAIL)
- [x] T006 Implement CLI mode detection in src/server.ts (check process.argv before server start)
- [x] T007 [P] Create src/cli-admin/index.ts with runCliCommand() entrypoint and command router
- [x] T008 [P] Create src/cli-admin/validation.ts with Zod schemas (emailSchema, passwordSchema, filePathSchema)
- [x] T009 [P] Write unit tests for Zod validation schemas in tests/unit/cli-admin/validation.test.ts (MUST FAIL)
- [x] T010 Implement Zod validation schemas in src/cli-admin/validation.ts (make tests pass)
- [x] T011 [P] Create src/cli-admin/io.ts with password masking utilities (using Bun.password())
- [x] T012 [P] Write unit tests for I/O utilities in tests/unit/cli-admin/io.test.ts (MUST FAIL)
- [x] T013 Implement I/O utilities in src/cli-admin/io.ts (make tests pass)
- [x] T014 [P] Create src/cli-admin/help.ts with help text generation
- [x] T015 [P] Write unit tests for help text in tests/unit/cli-admin/help.test.ts (MUST FAIL)
- [x] T016 Implement help text generation in src/cli-admin/help.ts (make tests pass)
- [x] T017 Wire help command into command router in src/cli-admin/index.ts
- [x] T018 Run contract test to verify CLI mode detection and help command work (tests should now pass)

**Checkpoint**: Foundation ready - CLI infrastructure working, user story commands can now be implemented

---

## Phase 3: User Story 1 - Change Admin Credentials (Priority: P1) 🎯 MVP

**Goal**: Enable administrators to update admin email and password via CLI commands for security maintenance and credential rotation

**Independent Test**: Run CLI command to change admin email, verify change in database, attempt login with new credentials. Run CLI command to change password, verify hashed in database, login with new password works.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T019 [P] [US1] Write contract test for change-email command success case in tests/contract/cli-admin.test.ts (MUST FAIL)
- [ ] T020 [P] [US1] Write contract test for change-email invalid email format in tests/contract/cli-admin.test.ts (MUST FAIL)
- [ ] T021 [P] [US1] Write contract test for change-email missing argument in tests/contract/cli-admin.test.ts (MUST FAIL)
- [ ] T022 [P] [US1] Write contract test for change-password success case in tests/contract/cli-admin.test.ts (MUST FAIL)
- [ ] T023 [P] [US1] Write contract test for change-password weak password in tests/contract/cli-admin.test.ts (MUST FAIL)
- [ ] T024 [P] [US1] Write contract test for change-password mismatch confirmation in tests/contract/cli-admin.test.ts (MUST FAIL)
- [ ] T025 [P] [US1] Write integration test for change-email database update in tests/integration/cli-admin.test.ts (MUST FAIL)
- [ ] T026 [P] [US1] Write integration test for change-password with actual password hashing in tests/integration/cli-admin.test.ts (MUST FAIL)
- [ ] T027 [P] [US1] Write integration test for admin user not found error in tests/integration/cli-admin.test.ts (MUST FAIL)

### Implementation for User Story 1

- [ ] T028 [P] [US1] Create src/cli-admin/change-email.ts with changeEmail() function (import from better-auth/crypto not needed for email)
- [ ] T029 [P] [US1] Create src/cli-admin/change-password.ts with changePassword() function (import hashPassword from better-auth/crypto)
- [ ] T030 [US1] Implement changeEmail() in src/cli-admin/change-email.ts (validate email, query admin, update database)
- [ ] T031 [US1] Implement changePassword() in src/cli-admin/change-password.ts (prompt with Bun.password(), validate, hash, update database)
- [ ] T032 [US1] Wire change-email command into command router in src/cli-admin/index.ts
- [ ] T033 [US1] Wire change-password command into command router in src/cli-admin/index.ts
- [ ] T034 [US1] Add error handling for database locked scenario in both commands (detect "database is locked" error)
- [ ] T035 [US1] Add error handling for admin user not found scenario in both commands
- [ ] T036 [US1] Add validation and clear error messages for all error cases (invalid format, weak password, etc.)
- [ ] T037 [US1] Add success confirmations with old/new values in src/cli-admin/change-email.ts
- [ ] T038 [US1] Add success confirmation in src/cli-admin/change-password.ts
- [ ] T039 [US1] Add logging for credential change operations (optional, for audit trail)

**Checkpoint**: At this point, User Story 1 should be fully functional. Administrators can change email and password via CLI. All tests pass. MVP is deliverable!

---

## Phase 4: User Story 2 - Export Database (Priority: P2)

**Goal**: Enable administrators to export database to file for backups and data migration

**Independent Test**: Run CLI export command, verify exported file exists at specified location, file is not empty, can be opened as valid SQLite database

### Tests for User Story 2

- [ ] T040 [P] [US2] Write contract test for export-db success with default filename in tests/contract/cli-admin.test.ts (MUST FAIL)
- [ ] T041 [P] [US2] Write contract test for export-db success with custom path in tests/contract/cli-admin.test.ts (MUST FAIL)
- [ ] T042 [P] [US2] Write contract test for export-db file already exists (decline overwrite) in tests/contract/cli-admin.test.ts (MUST FAIL)
- [ ] T043 [P] [US2] Write contract test for export-db file already exists (accept overwrite) in tests/contract/cli-admin.test.ts (MUST FAIL)
- [ ] T044 [P] [US2] Write contract test for export-db invalid extension in tests/contract/cli-admin.test.ts (MUST FAIL)
- [ ] T045 [P] [US2] Write integration test for export-db with VACUUM INTO in tests/integration/cli-admin.test.ts (MUST FAIL)
- [ ] T046 [P] [US2] Write integration test for export-db file verification (exported db is valid) in tests/integration/cli-admin.test.ts (MUST FAIL)

### Implementation for User Story 2

- [ ] T047 [US2] Create src/cli-admin/export-db.ts with exportDatabase() function
- [ ] T048 [US2] Implement default filename generation with timestamp (backup-YYYY-MM-DDTHH-MM-SS.db) in src/cli-admin/export-db.ts
- [ ] T049 [US2] Implement file existence check and overwrite prompt in src/cli-admin/export-db.ts
- [ ] T050 [US2] Implement file extension validation (.db required) in src/cli-admin/export-db.ts
- [ ] T051 [US2] Implement VACUUM INTO command for database export in src/cli-admin/export-db.ts
- [ ] T052 [US2] Add file size reporting after successful export in src/cli-admin/export-db.ts
- [ ] T053 [US2] Wire export-db command into command router in src/cli-admin/index.ts
- [ ] T054 [US2] Add error handling for database locked scenario in src/cli-admin/export-db.ts
- [ ] T055 [US2] Add error handling for permission denied, disk full, invalid path in src/cli-admin/export-db.ts
- [ ] T056 [US2] Add success confirmation with source, output, and size details in src/cli-admin/export-db.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Administrators can manage credentials and export database.

---

## Phase 5: User Story 3 - Interactive CLI Experience (Priority: P3)

**Goal**: Improve CLI usability with clear feedback, error messages, and help text for confident usage

**Independent Test**: Run various CLI commands, observe help text, error messages, success confirmations. Verify password input is masked, error messages are actionable, default server behavior is preserved.

### Tests for User Story 3

- [ ] T057 [P] [US3] Write contract test for --help flag output in tests/contract/cli-admin.test.ts (MUST FAIL)
- [ ] T058 [P] [US3] Write contract test for help command output in tests/contract/cli-admin.test.ts (MUST FAIL)
- [ ] T059 [P] [US3] Write contract test for unrecognized command error in tests/contract/cli-admin.test.ts (MUST FAIL)
- [ ] T060 [P] [US3] Write contract test for no arguments (server starts) in tests/contract/cli-admin.test.ts (MUST FAIL)
- [ ] T061 [P] [US3] Write integration test for all error messages are actionable (check format) in tests/integration/cli-admin.test.ts (MUST FAIL)

### Implementation for User Story 3

- [ ] T062 [US3] Enhance help text in src/cli-admin/help.ts with examples section and troubleshooting guidance
- [ ] T063 [US3] Add comprehensive help command examples for all three commands in src/cli-admin/help.ts
- [ ] T064 [US3] Implement unrecognized command handling in src/cli-admin/index.ts (show brief help + error)
- [ ] T065 [US3] Enhance all error messages across commands to include actionable guidance (what to do next)
- [ ] T066 [US3] Add AIDEV-NOTE comments for complex areas (CLI mode detection, password hashing, database locking) per Constitution Principle VI
- [ ] T067 [US3] Verify password masking works correctly with Bun.password() in src/cli-admin/io.ts
- [ ] T068 [US3] Add examples to error messages where applicable (email format, password requirements)
- [ ] T069 [US3] Verify default server behavior is preserved (integration test for no args) in tests/integration/cli-admin.test.ts

**Checkpoint**: All user stories should now be independently functional. CLI provides excellent UX with clear guidance.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

- [ ] T070 [P] Run all contract tests to verify CLI contracts are met (tests/contract/cli-admin.test.ts)
- [ ] T071 [P] Run all integration tests to verify database operations work (tests/integration/cli-admin.test.ts)
- [ ] T072 [P] Run all unit tests to verify validation, I/O, help text (tests/unit/cli-admin/*.test.ts)
- [ ] T073 Add comprehensive error handling edge cases across all commands (Unicode, special chars, very long inputs)
- [ ] T074 Verify performance requirements (credential changes <30s, exports <5min for 1GB) with actual timing
- [ ] T075 Test cross-platform compatibility (if possible, test on Linux, macOS, Windows)
- [ ] T076 [P] Run bun run format to format all new code files
- [ ] T077 [P] Run bun run compile to verify TypeScript compilation succeeds
- [ ] T078 Review all AIDEV-NOTE comments for completeness and clarity
- [ ] T079 Validate all error messages are actionable per SC-004 (user knows what to do)
- [ ] T080 Verify zero plaintext passwords per SC-005 (all passwords use hashPassword())
- [ ] T081 Run quickstart.md validation by executing all example commands from guide
- [ ] T082 Test database locking scenario (run CLI while server is running, verify error message)
- [ ] T083 Test database export with large database (if available, verify <5min for 1GB)
- [ ] T084 Document any known limitations or edge cases in implementation notes
- [ ] T085 Final code review and cleanup (remove debug code, ensure consistent style)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent of US1, but integrates into same CLI router
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Enhances all commands from US1 and US2, but doesn't block them

### Within Each User Story

**Test-First Flow** (Constitution Principle V):
1. Write all tests for story - tests MUST FAIL
2. Implement models/utilities needed by story
3. Implement command handlers for story
4. Wire commands into router
5. Add error handling and validation
6. Run tests - tests should now PASS
7. Story complete - can be independently tested and deployed

### Parallel Opportunities

- **Phase 1**: All setup tasks (T001-T004) can run in parallel
- **Phase 2 Tests**: Tasks T009, T012, T015 (unit tests) can run in parallel after their respective file creation tasks
- **Phase 3 Tests**: Tasks T019-T027 (all US1 tests) can run in parallel
- **Phase 3 Implementation**: Tasks T028-T029 (create files) can run in parallel, then T030-T031 (implement) can run in parallel
- **Phase 4 Tests**: Tasks T040-T046 (all US2 tests) can run in parallel
- **Phase 5 Tests**: Tasks T057-T061 (all US3 tests) can run in parallel
- **Phase 6**: Tasks T070-T072, T076-T077 (different test suites and formatting) can run in parallel

**Cross-Story Parallelism**: Once Phase 2 (Foundational) is complete:
- Developer A can work on Phase 3 (US1 - Change Credentials)
- Developer B can work on Phase 4 (US2 - Export Database)
- Developer C can work on Phase 5 (US3 - CLI Experience)

All three can proceed independently since they operate on different files and have no blocking dependencies.

---

## Parallel Example: User Story 1

```bash
# Launch all test writing for User Story 1 together (write all tests before implementing):
Task: "T019 [P] [US1] Write contract test for change-email success case"
Task: "T020 [P] [US1] Write contract test for change-email invalid email format"
Task: "T021 [P] [US1] Write contract test for change-email missing argument"
Task: "T022 [P] [US1] Write contract test for change-password success case"
Task: "T023 [P] [US1] Write contract test for change-password weak password"
Task: "T024 [P] [US1] Write contract test for change-password mismatch confirmation"
Task: "T025 [P] [US1] Write integration test for change-email database update"
Task: "T026 [P] [US1] Write integration test for change-password with actual password hashing"
Task: "T027 [P] [US1] Write integration test for admin user not found error"

# Launch all file creation for User Story 1 together:
Task: "T028 [P] [US1] Create src/cli-admin/change-email.ts"
Task: "T029 [P] [US1] Create src/cli-admin/change-password.ts"

# Implement handlers sequentially or in parallel (no dependencies between them):
Task: "T030 [US1] Implement changeEmail() in src/cli-admin/change-email.ts"
Task: "T031 [US1] Implement changePassword() in src/cli-admin/change-password.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T018) - CRITICAL, blocks everything
3. Complete Phase 3: User Story 1 (T019-T039)
4. **STOP and VALIDATE**: Run all tests, manually test change-email and change-password commands
5. Deploy/demo if ready - MVP delivers core security capability!

**MVP Delivers**:
- Administrators can change admin email via CLI
- Administrators can change admin password via CLI
- All password changes use proper hashing (security requirement met)
- Basic error handling and validation
- Help command available

### Incremental Delivery

1. **Foundation** (Phases 1-2): Setup + CLI infrastructure → Can show --help command
2. **MVP** (+ Phase 3): Add credential management → Test independently → Deploy/Demo
3. **Backup capability** (+ Phase 4): Add database export → Test independently → Deploy/Demo
4. **Enhanced UX** (+ Phase 5): Improve help and error messages → Test independently → Deploy/Demo
5. **Production ready** (+ Phase 6): Polish and validation → Final deploy

Each phase adds value without breaking previous functionality!

### Parallel Team Strategy

With multiple developers:

1. **Together**: Complete Phase 1 (Setup) and Phase 2 (Foundational) - everyone needs this
2. **Split after Phase 2**:
   - Developer A: Phase 3 (US1 - Change Credentials) → MVP ready
   - Developer B: Phase 4 (US2 - Export Database) → Can start in parallel with A
   - Developer C: Phase 5 (US3 - CLI Experience) → Can start in parallel with A & B
3. **Merge**: Stories complete and integrate through shared CLI router
4. **Together**: Phase 6 (Polish) - final validation and cleanup

---

## Task Count Summary

- **Total Tasks**: 85
- **Setup Phase**: 4 tasks
- **Foundational Phase**: 14 tasks (BLOCKS all stories)
- **User Story 1 (P1)**: 21 tasks (9 test tasks + 12 implementation tasks)
- **User Story 2 (P2)**: 17 tasks (7 test tasks + 10 implementation tasks)
- **User Story 3 (P3)**: 13 tasks (5 test tasks + 8 implementation tasks)
- **Polish Phase**: 16 tasks
- **Parallel Opportunities**: 36 tasks marked [P] can run in parallel

**MVP Scope** (User Story 1 only): 39 tasks (Setup + Foundational + US1)
**Full Feature**: 85 tasks total

---

## Notes

- **[P] tasks**: Different files, no dependencies - can run in parallel
- **[Story] label**: Maps task to specific user story for traceability
- **Test-First**: All test tasks MUST be written and MUST FAIL before implementation begins (Constitution Principle V)
- **Independent Stories**: Each user story should be independently completable and testable
- **File Paths**: All tasks include exact file paths for clarity
- **Commit Strategy**: Commit after each task or logical group (e.g., all tests for a story, then implementation)
- **Checkpoints**: Stop at any checkpoint to validate story independently before moving to next
- **AIDEV-NOTE**: Add anchor comments for complex areas (CLI mode detection, password hashing, database locking) per Constitution Principle VI
- **Format Code**: Run `bun run format` before committing
- **Type Check**: Run `bun run compile` to verify TypeScript compilation

---

## Success Criteria Validation

After completing all tasks, verify these success criteria from spec.md:

- ✅ **SC-001**: Administrators can change admin email or password in under 30 seconds
- ✅ **SC-002**: Database exports complete successfully for databases up to 1GB in size within 5 minutes
- ✅ **SC-003**: 100% of password updates are stored with proper cryptographic hashing
- ✅ **SC-004**: All error messages provide actionable guidance
- ✅ **SC-005**: Zero incidents of plaintext passwords stored in the database
- ✅ **SC-006**: CLI operations complete successfully 99% of the time under normal conditions

Use Phase 6 (Polish) tasks T074, T079, T080 to explicitly validate these criteria.

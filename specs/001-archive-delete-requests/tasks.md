# Tasks: Archive and Delete Historical Data

**Input**: Design documents from `/workspace/specs/001-archive-delete-requests/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: This feature specification does NOT explicitly request tests. Tasks focus on implementation. Tests can be added later if needed per Constitution Principle V.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single project structure with client/server separation:
- Server: `/workspace/src/` (TypeScript with Bun runtime)
- Client: `/workspace/src/dashboard/` (React 19)
- Database: `/workspace/src/db/`
- Shared: `/workspace/src/components/`, `/workspace/src/util/`

---

## Phase 1: Setup (Database Schema)

**Purpose**: Database migration to add archived_timestamp column

- [X] T001 Create database migration file `/workspace/src/db/migrations/<timestamp>_add_archived_timestamp_columns.ts` with ALTER TABLE statements for both requests and tcp_connections tables

---

## Phase 2: Foundational (Schema & SSE Infrastructure)

**Purpose**: Core schema changes and event infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Update RequestEvent schema in `/workspace/src/request-events/schema.ts` to add archived_timestamp field with timestampSchema.nullish()
- [X] T003 [P] Update TcpConnection schema in `/workspace/src/tcp-connections/schema.ts` to add archived_timestamp field with timestampSchema.nullish()
- [X] T004 Add SSE event types to `/workspace/src/db/events.ts` AppEvents interface: request:archived, request:unarchived, request:deleted, tcp_connection:archived, tcp_connection:unarchived, tcp_connection:deleted
- [X] T005 [P] Modify getAllRequestEventsMeta function in `/workspace/src/request-events/model.ts` to accept includeArchived parameter and filter by archived_timestamp IS NULL when false
- [X] T006 [P] Modify getAllTcpConnectionsMeta function in `/workspace/src/tcp-connections/model.ts` to accept includeArchived parameter and filter by archived_timestamp IS NULL when false

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Delete Individual Items (Priority: P1) 🎯 MVP

**Goal**: Users can delete individual requests and TCP connections permanently with confirmation dialog

**Independent Test**: Create a request or TCP connection, click delete button, confirm deletion, verify item is removed from database and UI

### Implementation for User Story 1

- [X] T007 [P] [US1] Add deleteRequestEvent function in `/workspace/src/request-events/model.ts` that performs DELETE FROM requests WHERE id = ? and emits request:deleted SSE event
- [X] T008 [P] [US1] Add bulkDeleteRequestEvents transaction function in `/workspace/src/request-events/model.ts` that deletes active requests (archived_timestamp IS NULL) or specific IDs
- [X] T009 [P] [US1] Add bulkDeleteTcpConnections transaction function in `/workspace/src/tcp-connections/model.ts` that deletes active connections or specific IDs (individual delete already exists)
- [X] T010 [P] [US1] Add DELETE /api/requests/:id endpoint in `/workspace/src/request-events/controller.ts` that calls deleteRequestEvent and returns status ok
- [X] T011 [P] [US1] Add DELETE /api/requests endpoint in `/workspace/src/request-events/controller.ts` that calls clearRequestEvents for delete all active requests
- [X] T012 [P] [US1] Add DELETE /api/requests/bulk-delete endpoint with Zod schema validation in `/workspace/src/request-events/controller.ts`
- [X] T013 [P] [US1] Add DELETE /api/tcp-connections/bulk-delete endpoint with Zod schema validation in `/workspace/src/tcp-connections/controller.ts`
- [ ] T014 [US1] Install shadcn/ui alert-dialog component via bunx shadcn@latest add alert-dialog if not already present
- [ ] T015 [US1] Add delete button with AlertDialog confirmation to request sidenav items in `/workspace/src/dashboard/pages/home-page.tsx` that calls DELETE /api/requests/:id
- [ ] T016 [US1] Add delete button with AlertDialog confirmation to TCP connection sidenav items in `/workspace/src/dashboard/pages/tcp-connection-page.tsx` that calls DELETE /api/tcp-connections/:id
- [ ] T017 [US1] Add Delete All menu item with AlertDialog to request sidenav actions in `/workspace/src/dashboard/pages/home-page.tsx` showing count of active items
- [ ] T018 [US1] Add Delete All menu item with AlertDialog to TCP connections sidenav actions in `/workspace/src/dashboard/pages/tcp-connection-page.tsx` showing count of active items
- [ ] T019 [US1] Add React Query mutation hooks for delete operations in request sidenav with query invalidation on success
- [ ] T020 [US1] Add React Query mutation hooks for delete operations in TCP connections sidenav with query invalidation on success
- [ ] T021 [US1] Add SSE event listeners for request:deleted and tcp_connection:deleted to invalidate React Query cache in respective pages

**Checkpoint**: User Story 1 complete - users can delete individual and all items with confirmation

---

## Phase 4: User Story 2 - Archive Individual Items (Priority: P2)

**Goal**: Users can archive individual requests/connections (soft-hide) without confirmation

**Independent Test**: Create items, archive them, verify they disappear from default view but remain in database with archived_timestamp set

### Implementation for User Story 2

- [X] T022 [P] [US2] Add archiveRequestEvent function in `/workspace/src/request-events/model.ts` that sets archived_timestamp to Date.now() via updateRequestEvent and emits request:archived event
- [X] T023 [P] [US2] Add archiveTcpConnection function in `/workspace/src/tcp-connections/model.ts` that sets archived_timestamp to Date.now() and emits tcp_connection:archived event
- [X] T024 [P] [US2] Add PATCH /api/requests/:id endpoint in `/workspace/src/request-events/controller.ts` with archiveBodySchema validation to handle archive/unarchive via archived_timestamp value
- [X] T025 [P] [US2] Add PATCH /api/tcp-connections/:id endpoint in `/workspace/src/tcp-connections/controller.ts` with archiveBodySchema validation to handle archive/unarchive
- [ ] T026 [US2] Add archive button to request sidenav items in `/workspace/src/dashboard/pages/home-page.tsx` that calls PATCH /api/requests/:id with current timestamp (no confirmation dialog)
- [ ] T027 [US2] Add archive button to TCP connection sidenav items in `/workspace/src/dashboard/pages/tcp-connection-page.tsx` that calls PATCH /api/tcp-connections/:id with current timestamp
- [ ] T028 [US2] Add React Query mutation hooks for archive operations in request sidenav with optimistic updates and query invalidation
- [ ] T029 [US2] Add React Query mutation hooks for archive operations in TCP connections sidenav with optimistic updates and query invalidation
- [ ] T030 [US2] Add SSE event listeners for request:archived and tcp_connection:archived to update UI in real-time

**Checkpoint**: User Story 2 complete - users can archive items which disappear from default view

---

## Phase 5: User Story 3 - Toggle Archived Items Visibility (Priority: P3)

**Goal**: Users can toggle Show Archived to view/hide archived items in sidenav with visual distinction

**Independent Test**: Archive items, enable Show Archived toggle, verify archived items appear with muted styling, disable toggle, confirm items hidden

### Implementation for User Story 3

- [ ] T031 [P] [US3] Add Show Archived toggle switch using shadcn/ui Switch component in request sidenav header in `/workspace/src/dashboard/pages/home-page.tsx` with localStorage persistence (key: showArchivedRequests)
- [ ] T032 [P] [US3] Add Show Archived toggle switch in TCP connections sidenav header in `/workspace/src/dashboard/pages/tcp-connection-page.tsx` with localStorage persistence (key: showArchivedTcpConnections)
- [ ] T033 [US3] Update React Query for requests in `/workspace/src/dashboard/pages/home-page.tsx` to include showArchived state in queryKey and pass includeArchived query parameter to GET /api/requests
- [ ] T034 [US3] Update React Query for TCP connections in `/workspace/src/dashboard/pages/tcp-connection-page.tsx` to include showArchived in queryKey and pass includeArchived to GET /api/tcp-connections
- [ ] T035 [US3] Add visual styling for archived request items in sidenav (muted text color, opacity, or archive icon) in `/workspace/src/dashboard/pages/home-page.tsx` based on archived_timestamp not null
- [ ] T036 [US3] Add visual styling for archived TCP connection items in sidenav with muted appearance in `/workspace/src/dashboard/pages/tcp-connection-page.tsx`
- [X] T037 [US3] Update GET /api/requests endpoint in `/workspace/src/request-events/controller.ts` to parse includeArchived query parameter and pass to getAllRequestEventsMeta
- [X] T038 [US3] Update GET /api/tcp-connections endpoint in `/workspace/src/tcp-connections/controller.ts` to parse includeArchived query parameter and pass to getAllTcpConnectionsMeta

**Checkpoint**: User Story 3 complete - users can toggle archived item visibility with clear visual distinction

---

## Phase 6: User Story 4 - Bulk Delete Operations (Priority: P4)

**Goal**: Users can delete all visible requests or connections at once with confirmation showing count

**Independent Test**: Create multiple items, click Delete All, confirm action, verify all active items removed from database and UI

### Implementation for User Story 4

- [ ] T039 [P] [US4] Update Delete All confirmation dialog in request sidenav in `/workspace/src/dashboard/pages/home-page.tsx` to display count of active items to be deleted
- [ ] T040 [P] [US4] Update Delete All confirmation dialog in TCP connections sidenav in `/workspace/src/dashboard/pages/tcp-connection-page.tsx` to display count of items
- [ ] T041 [US4] Add empty state message component to request sidenav in `/workspace/src/dashboard/pages/home-page.tsx` shown when no items exist after Delete All
- [ ] T042 [US4] Add empty state message component to TCP connections sidenav in `/workspace/src/dashboard/pages/tcp-connection-page.tsx` shown when list is empty
- [ ] T043 [US4] Add button disable logic during delete mutation execution to prevent duplicate requests in request sidenav
- [ ] T044 [US4] Add button disable logic during delete mutation execution in TCP connections sidenav

**Checkpoint**: User Story 4 complete - bulk delete operations work smoothly with proper feedback

---

## Phase 7: User Story 5 - Bulk Archive Operations (Priority: P5)

**Goal**: Users can archive all visible items at once without confirmation

**Independent Test**: Create multiple items, click Archive All, verify all items disappear from default view, toggle Show Archived to confirm they're accessible

### Implementation for User Story 5

- [X] T045 [P] [US5] Add bulkArchiveRequestEvents transaction function in `/workspace/src/request-events/model.ts` that updates archived_timestamp for all active items or specific IDs
- [X] T046 [P] [US5] Add bulkArchiveTcpConnections transaction function in `/workspace/src/tcp-connections/model.ts` with same pattern
- [X] T047 [P] [US5] Add PATCH /api/requests/bulk-archive endpoint in `/workspace/src/request-events/controller.ts` with bulkArchiveBodySchema validation (ids array and archived_timestamp)
- [X] T048 [P] [US5] Add PATCH /api/tcp-connections/bulk-archive endpoint in `/workspace/src/tcp-connections/controller.ts` with Zod schema validation
- [ ] T049 [US5] Add Archive All menu item to request sidenav actions in `/workspace/src/dashboard/pages/home-page.tsx` that calls bulk-archive endpoint with empty ids array (no confirmation dialog)
- [ ] T050 [US5] Add Archive All menu item to TCP connections sidenav actions in `/workspace/src/dashboard/pages/tcp-connection-page.tsx` that archives all active connections
- [ ] T051 [US5] Add React Query mutation for bulk archive in request sidenav with query invalidation
- [ ] T052 [US5] Add React Query mutation for bulk archive in TCP connections sidenav
- [ ] T053 [US5] Add empty state message when all items archived in default view for requests
- [ ] T054 [US5] Add empty state message when all items archived for TCP connections

**Checkpoint**: User Story 5 complete - users can archive all items quickly without confirmation

---

## Phase 8: User Story 6 - Unarchive Items (Priority: P6)

**Goal**: Users can restore archived items back to active status

**Independent Test**: Archive items, enable Show Archived, click unarchive button, verify item returns to default active view with archived_timestamp set to null

### Implementation for User Story 6

- [X] T055 [P] [US6] Add unarchiveRequestEvent function in `/workspace/src/request-events/model.ts` that sets archived_timestamp to null via updateRequestEvent and emits request:unarchived event
- [X] T056 [P] [US6] Add unarchiveTcpConnection function in `/workspace/src/tcp-connections/model.ts` that clears archived_timestamp and emits tcp_connection:unarchived event
- [ ] T057 [US6] Add unarchive button to archived request items in sidenav in `/workspace/src/dashboard/pages/home-page.tsx` (visible only when showArchived is true and item has archived_timestamp)
- [ ] T058 [US6] Add unarchive button to archived TCP connection items in sidenav in `/workspace/src/dashboard/pages/tcp-connection-page.tsx`
- [ ] T059 [US6] Add React Query mutation for unarchive operation in request sidenav calling PATCH /api/requests/:id with archived_timestamp: null
- [ ] T060 [US6] Add React Query mutation for unarchive operation in TCP connections sidenav
- [ ] T061 [US6] Add SSE event listeners for request:unarchived and tcp_connection:unarchived to update UI state in real-time
- [X] T062 [US6] Update PATCH endpoint logic in `/workspace/src/request-events/controller.ts` to call unarchiveRequestEvent when archived_timestamp is null
- [X] T063 [US6] Update PATCH endpoint logic in `/workspace/src/tcp-connections/controller.ts` to call unarchiveTcpConnection when archived_timestamp is null

**Checkpoint**: User Story 6 complete - full archive lifecycle (archive → view → unarchive) functional

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and edge cases

- [ ] T064 [P] Add error handling and user-friendly error messages for failed archive/delete operations in request sidenav with toast notifications
- [ ] T065 [P] Add error handling for failed operations in TCP connections sidenav
- [ ] T066 Add 404 error handling when viewing detail page of deleted item in `/workspace/src/dashboard/pages/home-page.tsx` showing not found message
- [X] T067 Add AIDEV-NOTE comment in `/workspace/src/request-events/model.ts` explaining SSE event emission pattern for archive/delete operations
- [X] T068 Add AIDEV-NOTE comment in `/workspace/src/db/events.ts` documenting new archive/delete event types and their usage
- [ ] T069 [P] Format code with bun run format
- [ ] T070 [P] Type check with bun run compile
- [ ] T071 Run manual testing following acceptance scenarios from `/workspace/specs/001-archive-delete-requests/spec.md`
- [ ] T072 Verify edge cases: delete already-deleted item (404), archive already-archived (idempotent), empty list operations, rapid clicking prevention

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1 (Delete Individual) - Independent
  - US2 (Archive Individual) - Independent
  - US3 (Toggle Archived) - Requires US2 (needs archived items to show)
  - US4 (Bulk Delete) - Builds on US1 patterns
  - US5 (Bulk Archive) - Builds on US2 patterns
  - US6 (Unarchive) - Requires US2 and US3 (needs archive functionality and toggle to access archived items)
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational - Independent (can run parallel with US1)
- **User Story 3 (P3)**: Depends on US2 (needs archived items to display) - Cannot run until US2 complete
- **User Story 4 (P4)**: Builds on US1 delete patterns - Should complete US1 first for consistency
- **User Story 5 (P5)**: Builds on US2 archive patterns - Should complete US2 first
- **User Story 6 (P6)**: Depends on US2 (archive) and US3 (toggle) - Cannot start until both complete

### Within Each User Story

- Model functions before controller endpoints
- Backend endpoints before frontend UI components
- UI components before SSE event listeners
- Core functionality before error handling

### Parallel Opportunities

- Phase 2: T002 and T003 (schemas), T005 and T006 (model functions) can run in parallel
- Phase 3 (US1): T007, T008, T009 (models) can run in parallel; T010, T011, T012, T013 (endpoints) can run in parallel; T015, T016, T017, T018 (UI) can run after endpoints
- Phase 4 (US2): T022, T023 (models) parallel; T024, T025 (endpoints) parallel; T026, T027 (UI) parallel
- Phase 5 (US3): T031, T032 (toggles) parallel; T033, T034 (queries) parallel; T035, T036 (styling) parallel; T037, T038 (endpoints) parallel
- Phase 6 (US4): T039, T040 (dialogs) parallel; T041, T042 (empty states) parallel; T043, T044 (button logic) parallel
- Phase 7 (US5): T045, T046 (models) parallel; T047, T048 (endpoints) parallel; T049, T050 (UI) parallel; T051, T052 (mutations) parallel; T053, T054 (empty states) parallel
- Phase 8 (US6): T055, T056 (models) parallel; T057, T058 (buttons) parallel; T059, T060 (mutations) parallel; T062, T063 (endpoint logic) parallel
- Phase 9: T064, T065 (error handling) parallel; T069, T070 (tooling) parallel

---

## Parallel Example: User Story 2

```bash
# Launch model functions together:
Task T022: "Add archiveRequestEvent function in src/request-events/model.ts"
Task T023: "Add archiveTcpConnection function in src/tcp-connections/model.ts"

# Launch endpoint implementations together:
Task T024: "Add PATCH /api/requests/:id endpoint in src/request-events/controller.ts"
Task T025: "Add PATCH /api/tcp-connections/:id endpoint in src/tcp-connections/controller.ts"

# Launch UI components together:
Task T026: "Add archive button to request sidenav items"
Task T027: "Add archive button to TCP connection sidenav items"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (database migration)
2. Complete Phase 2: Foundational (schemas, SSE events, filters)
3. Complete Phase 3: User Story 1 (delete individual items)
4. **STOP and VALIDATE**: Test delete functionality independently
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 (Delete) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (Archive) → Test independently → Deploy/Demo
4. Add User Story 3 (Toggle) → Test independently → Deploy/Demo
5. Add User Story 4 (Bulk Delete) → Test independently → Deploy/Demo
6. Add User Story 5 (Bulk Archive) → Test independently → Deploy/Demo
7. Add User Story 6 (Unarchive) → Test independently → Deploy/Demo
8. Polish phase → Final validation → Production ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Delete Individual)
   - Developer B: User Story 2 (Archive Individual) - can run parallel with US1
3. After US1 and US2 complete:
   - Developer A: User Story 4 (Bulk Delete)
   - Developer B: User Story 3 (Toggle) then User Story 6 (Unarchive)
   - Developer C: User Story 5 (Bulk Archive)
4. Stories integrate cleanly via shared SSE infrastructure

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability (US1-US6)
- Each user story delivers independently testable functionality
- No test tasks included - feature spec does not explicitly request TDD approach
- Tests can be added later following patterns in quickstart.md
- Commit after completing each user story phase for clean history
- Stop at any checkpoint to validate story works independently
- Use `bun run format` before committing
- Use `bun run compile` to verify TypeScript types
- Reference `/workspace/specs/001-archive-delete-requests/quickstart.md` for implementation patterns
- Add AIDEV-NOTE comments for complex SSE and bulk operation logic per Constitution Principle VI

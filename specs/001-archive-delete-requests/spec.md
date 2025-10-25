# Feature Specification: Archive and Delete Historical Data

**Feature Branch**: `001-archive-delete-requests`
**Created**: 2025-10-25
**Status**: Draft
**Input**: User description: "Add support for deleting and archiving historical requests and TCP connections. Archived entities should not be displayed unless a 'Show archived' option is enabled in the sidenav. Include the ability to archive and delete individual requests/connections as well as 'Archive all' and 'Delete all' options in the sidenav action menus. Include a confirmation dialog when deleting (but not archiving)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Delete Individual Items (Priority: P1)

Users need to remove test requests and connections that clutter their workspace, making it difficult to focus on relevant data. This is the most basic and essential capability.

**Why this priority**: Core functionality that provides immediate value - users can clean up their workspace manually. This can be implemented and tested completely independently without any other features.

**Independent Test**: Can be fully tested by creating a request or TCP connection, clicking the delete button on a single item, confirming the deletion, and verifying the item is permanently removed from the database and UI.

**Acceptance Scenarios**:

1. **Given** the sidenav displays several requests, **When** the user clicks the delete button on one request and confirms, **Then** that request is permanently removed from the database and disappears from the sidenav
2. **Given** the sidenav displays several TCP connections, **When** the user clicks the delete button on one connection and confirms, **Then** that connection is permanently removed from the database and disappears from the sidenav
3. **Given** a user clicks delete on an item, **When** the confirmation dialog appears, **Then** the user can cancel without deleting the item
4. **Given** a user is viewing details of a request or connection, **When** they delete that item from the sidenav, **Then** the detail view updates to show the item no longer exists

---

### User Story 2 - Archive Individual Items (Priority: P2)

Users want to hide old or irrelevant requests/connections from view without permanently deleting them, maintaining a clean workspace while preserving historical data for potential future reference.

**Why this priority**: Builds on P1 by adding non-destructive alternative. Can be implemented and tested independently - archive functionality doesn't require delete to work.

**Independent Test**: Can be fully tested by creating items, archiving them, verifying they disappear from the default view, toggling "Show archived" to verify they're still accessible, and confirming the database retains them with an archived flag.

**Acceptance Scenarios**:

1. **Given** the sidenav displays several requests, **When** the user clicks the archive button on one request, **Then** that request immediately disappears from the default view but remains in the database with an archived flag
2. **Given** the sidenav displays several TCP connections, **When** the user clicks the archive button on one connection, **Then** that connection immediately disappears from the default view but remains in the database with an archived flag
3. **Given** a request or connection is archived, **When** no action occurs, **Then** no confirmation dialog appears (archiving is reversible)
4. **Given** the user is viewing an archived item's details, **When** they navigate to it directly (e.g., via URL or bookmark), **Then** the item details are displayed with an indication that it is archived

---

### User Story 3 - Toggle Archived Items Visibility (Priority: P3)

Users need to review or unarchive previously archived items, requiring a way to show/hide archived data in the sidenav.

**Why this priority**: Essential for making archived items accessible, but depends on P2 (archiving) being implemented first. Still independently testable once archive functionality exists.

**Independent Test**: Can be fully tested by archiving several items, enabling the "Show archived" toggle, verifying archived items appear with visual distinction, disabling the toggle, and confirming archived items are hidden again.

**Acceptance Scenarios**:

1. **Given** the user has archived some requests, **When** they enable the "Show archived" toggle in the request sidenav, **Then** archived requests appear in the list with a visual indicator (e.g., muted color, archive icon)
2. **Given** the user has archived some TCP connections, **When** they enable the "Show archived" toggle in the TCP connections sidenav, **Then** archived connections appear in the list with a visual indicator
3. **Given** "Show archived" is enabled, **When** the user disables the toggle, **Then** archived items are immediately hidden from the sidenav
4. **Given** "Show archived" is enabled, **When** the user searches or filters items, **Then** the search includes both active and archived items
5. **Given** an archived item is visible (because "Show archived" is enabled), **When** the user clicks on it, **Then** the detail view opens and shows the archived item with an option to unarchive

---

### User Story 4 - Bulk Delete Operations (Priority: P4)

Users need to clear all requests or all connections at once when starting fresh testing or cleaning up large amounts of accumulated data.

**Why this priority**: High-value for heavy users but not essential for MVP. Can be implemented and tested independently - just requires delete functionality (P1) to exist.

**Independent Test**: Can be fully tested by creating multiple items, clicking "Delete all" in the sidenav menu, confirming the action, and verifying all items are permanently removed from the database and UI.

**Acceptance Scenarios**:

1. **Given** the request sidenav displays multiple requests, **When** the user selects "Delete all" from the action menu and confirms, **Then** all non-archived requests are permanently removed from the database and disappear from the sidenav
2. **Given** the TCP connections sidenav displays multiple connections, **When** the user selects "Delete all" from the action menu and confirms, **Then** all non-archived connections are permanently removed from the database and disappear from the sidenav
3. **Given** a user clicks "Delete all", **When** the confirmation dialog appears, **Then** it displays the count of items to be deleted and the user can cancel without deleting anything
4. **Given** "Show archived" is enabled, **When** the user clicks "Delete all", **Then** only non-archived items are deleted (archived items remain unless explicitly included)
5. **Given** the user confirms "Delete all", **When** the operation completes, **Then** an empty state message appears in the sidenav

---

### User Story 5 - Bulk Archive Operations (Priority: P5)

Users want to archive all visible requests or connections at once to quickly clean up their workspace without losing data.

**Why this priority**: Convenience feature for power users. Requires both archive (P2) and delete all (P4) patterns to be established. Can be tested independently by verifying bulk archive behavior.

**Independent Test**: Can be fully tested by creating multiple items, clicking "Archive all" in the sidenav menu, verifying all items disappear from default view, toggling "Show archived" to confirm they're still accessible, and checking the database marks them as archived.

**Acceptance Scenarios**:

1. **Given** the request sidenav displays multiple requests, **When** the user selects "Archive all" from the action menu, **Then** all non-archived requests are immediately hidden from the default view and marked as archived in the database
2. **Given** the TCP connections sidenav displays multiple connections, **When** the user selects "Archive all" from the action menu, **Then** all non-archived connections are immediately hidden from the default view and marked as archived in the database
3. **Given** a user clicks "Archive all", **When** no action occurs, **Then** no confirmation dialog appears (since archiving is reversible)
4. **Given** "Show archived" is enabled, **When** the user clicks "Archive all", **Then** only currently non-archived items are affected
5. **Given** the user performs "Archive all", **When** the operation completes, **Then** an empty state message appears in the default sidenav view

---

### User Story 6 - Unarchive Items (Priority: P6)

Users need to restore archived items back to active status when they become relevant again or were archived by mistake.

**Why this priority**: Completes the archive workflow but is lowest priority since items can still be viewed when "Show archived" is enabled. Can be tested independently by archiving items, enabling "Show archived", unarchiving them, and verifying they return to default view.

**Independent Test**: Can be fully tested by archiving items, enabling "Show archived" toggle, clicking unarchive on an item, and verifying it returns to the default active view with the archived flag removed from the database.

**Acceptance Scenarios**:

1. **Given** an archived request is visible (because "Show archived" is enabled), **When** the user clicks the unarchive button, **Then** the request returns to the default active view and the archived flag is removed
2. **Given** an archived TCP connection is visible, **When** the user clicks the unarchive button, **Then** the connection returns to the default active view and the archived flag is removed
3. **Given** a user is viewing an archived item's detail page, **When** they click an unarchive button in the detail view, **Then** the item is unarchived and the sidenav updates to show it in the default view
4. **Given** multiple archived items are visible, **When** the user unarchives them one by one, **Then** each unarchived item immediately appears in the default view while still being visible in the "Show archived" view until the toggle is disabled

---

### Edge Cases

- What happens when a user tries to delete an item that was just deleted by another process or user? (System should gracefully handle the 404 and remove it from the UI without error)
- What happens when a user has "Show archived" enabled and archives an item? (The item should remain visible in the list but its visual indicator should update to show it's archived)
- What happens when a user tries to archive an already archived item? (The operation should be idempotent - no error, no change)
- What happens when "Delete all" is triggered on an empty list? (The operation should complete successfully with a message indicating there were no items to delete)
- What happens when a user is viewing the detail page of an item and deletes it from the sidenav? (The detail view should update to show the item no longer exists or redirect to a "not found" page)
- What happens when a user has search/filter active and clicks "Archive all" or "Delete all"? (Only the filtered/searched items should be affected, not all items in the database)
- What happens when deleting or archiving operations fail due to database errors? (User should see an error message and the UI should not update until the operation succeeds)
- What happens when a user rapidly clicks delete/archive buttons multiple times? (Operations should be debounced or disabled during execution to prevent duplicate requests)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST add an `archived_timestamp` column (nullable integer) to the `requests` table to track when a request was archived
- **FR-002**: System MUST add an `archived_timestamp` column (nullable integer) to the `tcp_connections` table to track when a TCP connection was archived
- **FR-003**: System MUST provide a delete button for each individual request in the request sidenav
- **FR-004**: System MUST provide a delete button for each individual TCP connection in the TCP connections sidenav
- **FR-005**: System MUST provide an archive button for each individual request in the request sidenav
- **FR-006**: System MUST provide an archive button for each individual TCP connection in the TCP connections sidenav
- **FR-007**: System MUST display a confirmation dialog when a user initiates a delete operation (individual or bulk)
- **FR-008**: System MUST NOT display a confirmation dialog when a user initiates an archive operation (individual or bulk)
- **FR-009**: System MUST permanently remove deleted requests from the database (hard delete)
- **FR-010**: System MUST permanently remove deleted TCP connections from the database (hard delete)
- **FR-011**: System MUST set the `archived_timestamp` field to the current Unix timestamp (in milliseconds) when archiving an item
- **FR-012**: System MUST exclude archived items from the default sidenav display (where `archived_timestamp IS NULL`)
- **FR-013**: System MUST provide a "Show archived" toggle option in the request sidenav
- **FR-014**: System MUST provide a "Show archived" toggle option in the TCP connections sidenav
- **FR-015**: System MUST display archived items in the sidenav when "Show archived" is enabled, with visual distinction from active items
- **FR-016**: System MUST provide an "Archive all" option in the request sidenav action menu
- **FR-017**: System MUST provide an "Archive all" option in the TCP connections sidenav action menu
- **FR-018**: System MUST provide a "Delete all" option in the request sidenav action menu
- **FR-019**: System MUST provide a "Delete all" option in the TCP connections sidenav action menu
- **FR-020**: System MUST archive or delete only the currently filtered/visible items when bulk operations are performed with active search filters
- **FR-021**: System MUST provide an unarchive button for archived items when "Show archived" is enabled
- **FR-022**: System MUST set `archived_timestamp` to NULL when unarchiving an item
- **FR-023**: System MUST emit SSE events when items are archived, unarchived, or deleted to trigger real-time UI updates
- **FR-024**: System MUST maintain existing sort order (reverse chronological) for both active and archived items
- **FR-025**: System MUST create database models and API endpoints for deleting individual requests (currently only exists for TCP connections)
- **FR-026**: System MUST create database models and API endpoints for bulk deleting requests (similar to existing TCP connections bulk delete)
- **FR-027**: Confirmation dialogs MUST display the count of items to be affected by bulk operations
- **FR-028**: System MUST handle concurrent delete/archive operations gracefully without causing race conditions
- **FR-029**: System MUST disable or debounce archive/delete buttons during operation execution to prevent duplicate requests
- **FR-030**: System MUST display appropriate error messages when archive/delete operations fail

### Key Entities

- **Request Event**: Represents an HTTP request/response pair captured by the webhook server
  - Key attributes: id, request method, URL, timestamps, status, headers, body, response data
  - New attribute: `archived_timestamp` (nullable integer) - Unix timestamp in milliseconds when archived, NULL if active
  - Relationships: Can be archived or deleted independently of TCP connections

- **TCP Connection**: Represents a TCP socket connection to the TCP server
  - Key attributes: id, client IP/port, server IP/port, timestamps, status, sent/received data
  - New attribute: `archived_timestamp` (nullable integer) - Unix timestamp in milliseconds when archived, NULL if active
  - Relationships: Can be archived or deleted independently of requests

- **Archive State**: Conceptual entity representing whether an item is in active or archived state
  - Determined by: `archived_timestamp IS NULL` (active) vs `archived_timestamp IS NOT NULL` (archived)
  - Transitions: Active → Archived (set timestamp), Archived → Active (clear timestamp), Any → Deleted (remove from DB)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can delete a single request or TCP connection in under 5 seconds (including confirmation dialog interaction)
- **SC-002**: Users can archive a single request or TCP connection in under 2 seconds (no confirmation required)
- **SC-003**: Bulk delete operations complete within 5 seconds for up to 1000 items
- **SC-004**: Bulk archive operations complete within 3 seconds for up to 1000 items
- **SC-005**: Toggling "Show archived" updates the sidenav display within 500 milliseconds
- **SC-006**: The sidenav correctly displays only active items by default (archived items are hidden)
- **SC-007**: The sidenav correctly displays both active and archived items when "Show archived" is enabled
- **SC-008**: Deleted items are permanently removed from the database and cannot be recovered
- **SC-009**: Archived items remain in the database and can be unarchived to return to active status
- **SC-010**: Delete operations always show a confirmation dialog before executing
- **SC-011**: Archive operations execute immediately without requiring confirmation
- **SC-012**: Users can successfully complete a workflow of: archive items → review archived items → unarchive selected items → delete unwanted items
- **SC-013**: The system handles 100 concurrent delete/archive operations without data corruption or race conditions
- **SC-014**: Error messages are displayed to users when delete/archive operations fail, with clear indication of what went wrong
- **SC-015**: Visual indicators clearly distinguish archived items from active items in the sidenav (e.g., different opacity, icon, or color)

## Assumptions

- The existing database migration system will be used to add the `archived_timestamp` columns to both tables
- The existing SSE (Server-Sent Events) infrastructure will handle real-time updates for archive/delete operations
- The existing search/filter functionality in sidebars will automatically include or exclude archived items based on the "Show archived" toggle state
- Users accessing archived items via direct URL/bookmark (e.g., `/requests/:id` where the item is archived) will still be able to view the item details
- The existing `keysForSelect()` and related SQL utility functions will be updated to handle the new `archived_timestamp` field
- Archive operations use Unix timestamps in milliseconds to match the existing timestamp convention in the codebase
- The "Show archived" toggle state will be persisted in the component state (localStorage or session state) so users don't have to re-enable it on every page load
- Bulk operations ("Archive all", "Delete all") will respect active search filters - only filtered/visible items will be affected
- The confirmation dialog for delete operations will follow the existing shadcn/ui AlertDialog component pattern
- Unarchive functionality will be available both from the sidenav item and from the detail view page
- When "Show archived" is disabled, the sidenav query will filter with `WHERE archived_timestamp IS NULL`
- When "Show archived" is enabled, the sidenav query will fetch all items regardless of `archived_timestamp` value
- Deleted items will use hard deletes (SQL DELETE) rather than soft deletes to permanently remove data
- The existing TanStack React Query hooks and invalidation patterns will be extended to handle archive/unarchive operations
- Database indexes may be added to the `archived_timestamp` column if query performance requires it

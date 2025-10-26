# Research: Archive and Delete Historical Data

**Feature Branch**: `001-archive-delete-requests`
**Date**: 2025-10-25

## Overview

This document captures research findings and design decisions for implementing archive and delete functionality for HTTP requests and TCP connections in the Webhook Testing Tool.

## Research Areas

### 1. Database Schema for Archive State

**Decision**: Use nullable `archived_timestamp` column (INTEGER) in existing tables

**Rationale**:
- Simplest approach that aligns with Constitution Principle VII (Simplicity & YAGNI)
- Nullable integer allows NULL for active items, Unix timestamp (milliseconds) for archived items
- Matches existing timestamp convention in the codebase (request_timestamp, open_timestamp)
- No additional tables or complex relationships needed
- Easy to query: `WHERE archived_timestamp IS NULL` for active items
- Maintains referential integrity without additional foreign keys

**Alternatives considered**:
- **Separate archive tables**: Rejected - adds unnecessary complexity, requires data migration, complicates queries
- **Boolean flag**: Rejected - loses information about when item was archived
- **Enum state field**: Rejected - doesn't capture archive timestamp, harder to extend if needed
- **Soft delete with deleted_at**: Rejected - conflicts with requirement for both archive (reversible) and delete (permanent)

**Implementation**:
- Add `archived_timestamp INTEGER` column to `requests` table
- Add `archived_timestamp INTEGER` column to `tcp_connections` table
- Update Zod schemas to include optional `archived_timestamp` field
- Modify query functions to filter by `archived_timestamp IS NULL` by default

---

### 2. SSE Event Patterns for Real-Time Updates

**Decision**: Extend existing AppEvents interface with archive/delete event types

**Rationale**:
- Existing SSE infrastructure uses typed EventEmitter in `src/db/events.ts`
- Current events: `request:created`, `request:updated`, `tcp_connection`
- Need to add: `request:archived`, `request:unarchived`, `request:deleted`, `tcp_connection:archived`, `tcp_connection:unarchived`, `tcp_connection:deleted`
- SSE clients listen to these events via `/api/events` endpoint
- Maintains consistency with existing real-time update pattern

**Alternatives considered**:
- **Polling**: Rejected - increases server load, slower UX, inconsistent with existing patterns
- **WebSockets**: Rejected - over-engineered for one-way server→client updates, SSE already works well
- **Generic update event**: Rejected - less precise, clients would need to refetch all data

**Implementation**:
- Add new event types to `AppEvents` interface in `src/db/events.ts`
- Emit events after archive/unarchive/delete operations in model layer
- Frontend React Query hooks invalidate queries on event receipt
- Event payload includes item ID for targeted UI updates

---

### 3. API Endpoint Design

**Decision**: RESTful endpoints following existing controller patterns

**Rationale**:
- Existing pattern: `/api/tcp-connections/:id` for individual operations, `/api/tcp-connections` for bulk
- HTTP method DELETE already used for delete operations on TCP connections
- Need to add PATCH/POST for archive operations (DELETE is destructive, archive is not)
- Consistency with existing codebase reduces cognitive load

**Alternatives considered**:
- **GraphQL mutations**: Rejected - project uses REST, no GraphQL infrastructure exists
- **Custom action verbs in URL**: Rejected - less RESTful, `/api/tcp-connections/:id/archive` could work but PATCH is cleaner
- **Query parameters for bulk**: Rejected - PUT/PATCH body is more explicit for bulk operations

**Implementation**:

**For requests** (currently missing delete endpoints, will add):
- `DELETE /api/requests/:id` - Delete single request
- `DELETE /api/requests` - Delete all (currently missing, TCP has this)
- `PATCH /api/requests/:id` with `{ archived_timestamp: number | null }` - Archive/unarchive
- `PATCH /api/requests/bulk-archive` with `{ ids: string[] }` or empty for "archive all"

**For TCP connections** (has delete, will add archive):
- `DELETE /api/tcp-connections/:id` - Already exists
- `DELETE /api/tcp-connections` - Already exists (clearTcpConnections)
- `PATCH /api/tcp-connections/:id` with `{ archived_timestamp: number | null }` - Archive/unarchive
- `PATCH /api/tcp-connections/bulk-archive` with `{ ids: string[] }` or empty for "archive all"

---

### 4. UI Component Strategy

**Decision**: Use shadcn/ui AlertDialog for delete confirmations, no dialog for archive

**Rationale**:
- Spec requirement: "System MUST display a confirmation dialog when a user initiates a delete operation"
- Spec requirement: "System MUST NOT display a confirmation dialog when a user initiates an archive operation"
- shadcn/ui AlertDialog component already available in project
- Archive is reversible, so immediate action improves UX

**Alternatives considered**:
- **Custom modal component**: Rejected - shadcn/ui provides accessible, styled component
- **Browser confirm()**: Rejected - not customizable, inconsistent with app design
- **Toast notifications only**: Rejected - doesn't meet requirement for explicit confirmation dialog

**Implementation**:
- Import AlertDialog from `@/components/ui/alert-dialog`
- Show count of items to be deleted in confirmation message
- Provide "Cancel" and "Delete" actions in dialog
- Archive button triggers immediate action with toast notification for feedback

---

### 5. "Show Archived" Toggle State Management

**Decision**: Use React component state with localStorage persistence per view

**Rationale**:
- Toggle state should persist across page reloads for better UX
- Each view (requests, TCP connections) should have independent toggle state
- localStorage is simple, synchronous, and sufficient for single-user self-hosted app
- No need for server-side preference storage

**Alternatives considered**:
- **Session storage**: Rejected - loses state on browser restart, worse UX
- **URL query parameter**: Rejected - clutters URL, interferes with shareable links
- **Server-side user preferences**: Rejected - over-engineered for this feature, adds complexity
- **Global application state**: Rejected - requests and TCP connections should have independent toggles

**Implementation**:
- Use `localStorage.getItem('showArchivedRequests')` and `localStorage.getItem('showArchivedTcpConnections')`
- Store boolean as string ("true"/"false")
- Initialize component state from localStorage on mount
- Update localStorage when toggle changes
- React Query will refetch with appropriate filter based on toggle state

---

### 6. Bulk Operations and Filter Scope

**Decision**: Bulk operations affect all items matching current filter state, not just visible in viewport

**Rationale**:
- Spec requirement: "System MUST archive or delete only the currently filtered/visible items when bulk operations are performed with active search filters"
- Search/filter state lives in frontend component
- Backend receives explicit list of IDs or performs operation on all active (non-archived) items
- Prevents accidental deletion of items user can't see

**Alternatives considered**:
- **Backend filters**: Rejected - search/filter logic already in frontend, duplicating in backend adds complexity
- **Delete visible only**: Rejected - confusing when pagination exists, may miss items
- **Always delete all**: Rejected - violates spec requirement about respecting filters

**Implementation**:
- Frontend determines which items match current filter/search
- For "Archive all" / "Delete all": Send array of IDs to backend, or special flag indicating "all active"
- Backend processes only provided IDs or all items with `archived_timestamp IS NULL`
- Confirmation dialog shows count based on filtered items

---

### 7. Concurrency and Race Conditions

**Decision**: Use SQLite transactions for bulk operations, rely on WAL mode for concurrent reads

**Rationale**:
- Database already uses WAL (Write-Ahead Logging) mode: `db.run("PRAGMA journal_mode = WAL")`
- WAL allows concurrent reads during writes
- better-sqlite3 supports synchronous transactions via `db.transaction()`
- Single-user or small team deployment reduces concurrency concerns

**Alternatives considered**:
- **Optimistic locking**: Rejected - adds complexity, not needed for self-hosted single-user app
- **Pessimistic locking**: Rejected - SQLite doesn't support row-level locks
- **Queue-based operations**: Rejected - over-engineered for expected usage patterns

**Implementation**:
- Wrap bulk delete/archive operations in `db.transaction()`
- Individual operations can remain as single statements (SQLite atomic by default)
- Frontend disables buttons during operation to prevent rapid clicking
- Error handling returns 500 with message on failure, UI shows error toast

---

### 8. Migration Strategy

**Decision**: Single migration adding both columns at once

**Rationale**:
- Adding nullable column is non-breaking change
- Both tables (requests, tcp_connections) should be updated in same migration
- Existing data automatically gets NULL value for new column
- Migration timestamp: Use current Unix timestamp for migration filename

**Alternatives considered**:
- **Separate migrations**: Rejected - atomicity benefit of single migration, simpler
- **Default value**: Rejected - NULL is correct semantic meaning for "not archived"
- **Backfill archived items**: Rejected - no existing items should be pre-archived

**Implementation**:
```sql
-- Migration: <timestamp>_add_archived_timestamp_columns.ts
ALTER TABLE requests ADD COLUMN archived_timestamp INTEGER;
ALTER TABLE tcp_connections ADD COLUMN archived_timestamp INTEGER;
```

---

## Technology Choices

### Database: SQLite with better-sqlite3

**Best practices**:
- Use parameterized queries to prevent SQL injection (already done via Zod schemas)
- Use transactions for multi-statement operations
- Index `archived_timestamp` column if query performance degrades (measure first)
- Leverage existing `keysForSelect`, `keysForUpdate` utilities in `@/util/sql`

### Frontend: React 19 + TanStack React Query

**Best practices**:
- Use query invalidation on SSE events for real-time updates
- Optimistic updates for archive operations (instant UI feedback)
- Error boundaries for graceful error handling
- Debounce/throttle user actions to prevent rapid clicks

### Styling: Tailwind CSS + shadcn/ui

**Best practices**:
- Use semantic color classes for archived items (e.g., `text-muted-foreground`)
- Add visual indicators (opacity, icon) for archived state
- Maintain accessibility (ARIA labels, keyboard navigation)
- Consistent spacing and alignment with existing sidenav items

---

## Open Questions Resolved

**Q: Should archived items be included in search results?**
**A**: Yes, when "Show archived" is enabled. Search operates on currently visible items (spec FR-014: searches include both active and archived items when toggle is on).

**Q: Can users archive already-archived items?**
**A**: Yes, operation is idempotent (spec edge case: "no error, no change").

**Q: What happens if user views detail page of deleted item?**
**A**: Return 404 and show "not found" message in UI (spec edge case).

**Q: Should we add index on archived_timestamp?**
**A**: Not initially. Measure query performance first. SQLite indexes have overhead; with expected dataset size (hundreds to thousands), full table scan is likely fast enough. Add index only if measurements show need.

**Q: Do we need soft delete for regulatory compliance?**
**A**: No. This is a self-hosted webhook testing tool, not a production data store. Hard delete is appropriate per spec requirements. Users wanting data retention should use archive feature.

---

## Performance Considerations

### Expected Performance

Per spec success criteria:
- Individual delete: <5 seconds (including confirmation dialog)
- Individual archive: <2 seconds (no confirmation)
- Bulk delete: <5 seconds for up to 1000 items
- Bulk archive: <3 seconds for up to 1000 items
- Toggle "Show archived": <500ms to update UI

### Optimization Strategy

1. **Database**:
   - SQLite with WAL mode handles concurrent reads well
   - Transactions ensure bulk operations are atomic
   - Column already numeric (INTEGER), sorting and filtering are fast

2. **SSE Events**:
   - Only emit events for actual changes
   - Include minimal payload (ID, timestamp)
   - Frontend invalidates queries, doesn't refetch everything

3. **Frontend**:
   - React Query caching reduces network requests
   - Optimistic updates for archive operations
   - Virtual scrolling if sidebars exceed 100 items (future enhancement)

4. **API**:
   - Return only metadata in list endpoints (already done)
   - Pagination if needed (not in initial scope)

---

## Summary

All design decisions prioritize simplicity and consistency with existing codebase patterns:
- ✅ Nullable timestamp column (simplest schema change)
- ✅ Extend existing SSE events (consistent with real-time updates)
- ✅ RESTful endpoints (matches existing API design)
- ✅ shadcn/ui components (follows frontend standards)
- ✅ localStorage for toggle state (appropriate for self-hosted app)
- ✅ SQLite transactions for bulk operations (leverages existing DB capabilities)

No NEEDS CLARIFICATION items remain. Ready to proceed to Phase 1 (Design & Contracts).

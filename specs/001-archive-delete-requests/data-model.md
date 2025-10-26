# Data Model: Archive and Delete Historical Data

**Feature Branch**: `001-archive-delete-requests`
**Date**: 2025-10-25

## Overview

This document defines the data model changes required to support archiving and deleting HTTP requests and TCP connections. The primary change is adding an `archived_timestamp` field to both entities to track archive state.

---

## Entities

### RequestEvent (Modified)

Represents an HTTP request/response pair captured by the webhook server.

**Table**: `requests`

**New Field**:
- `archived_timestamp` (INTEGER, nullable) - Unix timestamp in milliseconds when the request was archived. NULL indicates the request is active (not archived).

**Existing Fields** (no changes):
- `id` (UUID, primary key) - Unique identifier
- `type` (ENUM: "inbound" | "outbound") - Request direction
- `status` (ENUM: BASE_STATUSES) - Request processing status
- `shared_id` (STRING, nullable) - Shared identifier for grouping
- `request_method` (ENUM: HTTP_METHODS) - HTTP method (GET, POST, etc.)
- `request_url` (STRING) - Request URL
- `request_headers` (JSON) - Request headers as key-value list
- `request_query_params` (JSON) - Query parameters as key-value list
- `request_body` (BLOB/Base64, nullable) - Request body
- `request_timestamp` (INTEGER) - Unix timestamp when request was received
- `response_status` (INTEGER, nullable) - HTTP response status code
- `response_status_message` (STRING, nullable) - HTTP response status message
- `response_headers` (JSON, nullable) - Response headers as key-value list
- `response_body` (BLOB/Base64, nullable) - Response body
- `response_timestamp` (INTEGER, nullable) - Unix timestamp when response was sent
- `tls_info` (JSON, nullable) - TLS/SSL connection information

**Zod Schema Update**:
```typescript
export const requestEventSchema = z.object({
  // ... existing fields ...
  archived_timestamp: timestampSchema.nullish(), // NEW
});

export const requestEventMetaSchema = requestEventSchema.omit({
  request_headers: true,
  request_query_params: true,
  request_body: true,
  response_headers: true,
  response_body: true,
  tls_info: true,
  // archived_timestamp is included in meta
});
```

**State Transitions**:
- **Active → Archived**: Set `archived_timestamp` to current Unix timestamp (milliseconds)
- **Archived → Active**: Set `archived_timestamp` to NULL (unarchive)
- **Active → Deleted**: Remove row from database (hard delete)
- **Archived → Deleted**: Remove row from database (hard delete)

**Validation Rules**:
- `archived_timestamp` must be NULL or a positive integer
- `archived_timestamp` must be >= `request_timestamp` if set
- Cannot set `archived_timestamp` to future date

**Relationships**:
- No changes to existing relationships
- Archive state is independent of shared_id grouping

---

### TcpConnection (Modified)

Represents a TCP socket connection to the TCP server.

**Table**: `tcp_connections`

**New Field**:
- `archived_timestamp` (INTEGER, nullable) - Unix timestamp in milliseconds when the connection was archived. NULL indicates the connection is active (not archived).

**Existing Fields** (no changes):
- `id` (UUID, primary key) - Unique identifier
- `client_ip` (STRING) - Client IP address
- `client_port` (INTEGER) - Client port number (1-65535)
- `server_ip` (STRING) - Server IP address
- `server_port` (INTEGER) - Server port number (1-65535)
- `received_data` (BLOB/Base64, nullable) - Data received from client
- `sent_data` (BLOB/Base64, nullable) - Data sent to client
- `status` (ENUM: "active" | "closed" | "failed") - Connection status
- `open_timestamp` (INTEGER) - Unix timestamp when connection opened
- `closed_timestamp` (INTEGER, nullable) - Unix timestamp when connection closed

**Zod Schema Update**:
```typescript
export const tcpConnectionSchema = z.object({
  // ... existing fields ...
  archived_timestamp: timestampSchema.nullish(), // NEW
});

export const tcpConnectionMetaSchema = tcpConnectionSchema.omit({
  received_data: true,
  sent_data: true,
  // archived_timestamp is included in meta
});
```

**State Transitions**:
- **Active → Archived**: Set `archived_timestamp` to current Unix timestamp (milliseconds)
- **Archived → Active**: Set `archived_timestamp` to NULL (unarchive)
- **Active → Deleted**: Remove row from database (hard delete)
- **Archived → Deleted**: Remove row from database (hard delete)

**Validation Rules**:
- `archived_timestamp` must be NULL or a positive integer
- `archived_timestamp` must be >= `open_timestamp` if set
- Cannot set `archived_timestamp` to future date

**Relationships**:
- No changes to existing relationships
- Archive state is independent of connection status (active/closed/failed)

---

## Database Migration

**Migration File**: `<timestamp>_add_archived_timestamp_columns.ts`

**Up Migration**:
```sql
ALTER TABLE requests ADD COLUMN archived_timestamp INTEGER;
ALTER TABLE tcp_connections ADD COLUMN archived_timestamp INTEGER;
```

**Down Migration**:
```sql
ALTER TABLE requests DROP COLUMN archived_timestamp;
ALTER TABLE tcp_connections DROP COLUMN archived_timestamp;
```

**Migration Notes**:
- Adding nullable column is non-breaking for existing data
- All existing rows will have `archived_timestamp = NULL` (active state)
- No data backfill required
- No index created initially (add later if query performance requires)

---

## Query Patterns

### Filtering Active vs Archived Items

**Get All Active Requests**:
```sql
SELECT <fields> FROM requests
WHERE archived_timestamp IS NULL
ORDER BY request_timestamp DESC;
```

**Get All Items (Active + Archived)**:
```sql
SELECT <fields> FROM requests
ORDER BY request_timestamp DESC;
```

**Get Only Archived Items**:
```sql
SELECT <fields> FROM requests
WHERE archived_timestamp IS NOT NULL
ORDER BY request_timestamp DESC;
```

### Archive Operations

**Archive Single Item**:
```sql
UPDATE requests
SET archived_timestamp = ?
WHERE id = ?;
```

**Unarchive Single Item**:
```sql
UPDATE requests
SET archived_timestamp = NULL
WHERE id = ?;
```

**Bulk Archive (All Active)**:
```sql
UPDATE requests
SET archived_timestamp = ?
WHERE archived_timestamp IS NULL;
```

**Bulk Archive (Specific IDs)**:
```sql
UPDATE requests
SET archived_timestamp = ?
WHERE id IN (?, ?, ...);
```

### Delete Operations

**Delete Single Item** (already exists for TCP, will add for requests):
```sql
DELETE FROM requests WHERE id = ?;
```

**Delete All Active Items**:
```sql
DELETE FROM requests WHERE archived_timestamp IS NULL;
```

**Delete Specific IDs**:
```sql
DELETE FROM requests WHERE id IN (?, ?, ...);
```

---

## Model Function Signatures

### Request Events

**New/Modified Functions in `src/request-events/model.ts`**:

```typescript
// Modified - add filter parameter
export function getAllRequestEventsMeta(
  includeArchived?: boolean
): RequestEventMeta[];

// NEW - Archive operations
export function archiveRequestEvent(id: RequestId): RequestEvent;
export function unarchiveRequestEvent(id: RequestId): RequestEvent;
export function bulkArchiveRequestEvents(ids?: RequestId[]): void;

// NEW - Delete operations (currently missing)
export function deleteRequestEvent(id: RequestId): void;
export function bulkDeleteRequestEvents(ids?: RequestId[]): void;

// Existing function - already has clearRequestEvents() for "delete all"
```

### TCP Connections

**New/Modified Functions in `src/tcp-connections/model.ts`**:

```typescript
// Modified - add filter parameter
export function getAllTcpConnectionsMeta(
  includeArchived?: boolean
): TcpConnectionMeta[];

// NEW - Archive operations
export function archiveTcpConnection(id: TcpConnectionId): TcpConnection;
export function unarchiveTcpConnection(id: TcpConnectionId): TcpConnection;
export function bulkArchiveTcpConnections(ids?: TcpConnectionId[]): void;

// Existing delete functions - no changes needed
// - deleteTcpConnection(id)
// - clearTcpConnections()
```

---

## SSE Event Types

**New Event Types in `src/db/events.ts`**:

```typescript
export interface AppEvents {
  // Existing events
  "request:created": (event: RequestEvent) => void;
  "request:updated": (event: RequestEvent) => void;
  tcp_connection: (data: { action: string; id: string }) => void;

  // NEW events for archive/delete
  "request:archived": (event: RequestEventMeta) => void;
  "request:unarchived": (event: RequestEventMeta) => void;
  "request:deleted": (id: RequestId) => void;
  "tcp_connection:archived": (connection: TcpConnectionMeta) => void;
  "tcp_connection:unarchived": (connection: TcpConnectionMeta) => void;
  "tcp_connection:deleted": (id: TcpConnectionId) => void;
}
```

**Event Emission Pattern**:
```typescript
// After successful archive operation
broadcastEvent("request:archived", requestEventMeta);

// After successful delete operation
broadcastEvent("request:deleted", requestId);
```

---

## Validation Rules Summary

### Request Events
- `archived_timestamp` must be NULL or positive integer
- `archived_timestamp` >= `request_timestamp` when set
- Cannot archive to future timestamp
- Cannot delete non-existent request (404 error)

### TCP Connections
- `archived_timestamp` must be NULL or positive integer
- `archived_timestamp` >= `open_timestamp` when set
- Cannot archive to future timestamp
- Cannot delete non-existent connection (404 error)

### Bulk Operations
- Empty ID array = operate on all active items
- Invalid ID in array = skip and continue
- Transaction ensures atomicity

---

## Performance Considerations

### Indexes

**Initial**: No indexes on `archived_timestamp`

**Future**: Add index if query performance measurements show need:
```sql
CREATE INDEX idx_requests_archived ON requests(archived_timestamp);
CREATE INDEX idx_tcp_connections_archived ON tcp_connections(archived_timestamp);
```

**Rationale**: SQLite full table scans are fast for expected dataset size (hundreds to thousands of rows). Indexes have overhead. Measure before optimizing.

### Query Optimization

- Use `archived_timestamp IS NULL` for active items (most common query)
- SQLite optimizes `IS NULL` checks well
- WHERE clause uses indexed timestamp fields (request_timestamp, open_timestamp) for ORDER BY

---

## Data Integrity

### Constraints
- `archived_timestamp` column is nullable (no NOT NULL constraint)
- No foreign key constraints added
- No unique constraints added

### Transactions
- Bulk operations wrapped in `db.transaction()` for atomicity
- Individual operations use single SQL statement (atomic by default)

### Error Handling
- 404 if item doesn't exist on archive/delete
- 500 on database error with error message
- Idempotent operations (archive already-archived item = no-op)

---

## Summary

**Schema Changes**:
- Add `archived_timestamp INTEGER` to `requests` table
- Add `archived_timestamp INTEGER` to `tcp_connections` table

**Code Changes**:
- Extend Zod schemas with new field
- Add archive/unarchive/bulk functions to models
- Add SSE events for archive/delete operations
- Add delete endpoints for requests (currently missing)

**No Breaking Changes**:
- Existing queries continue to work (NULL values ignored)
- Existing API endpoints remain unchanged
- New endpoints are additive

Ready to proceed with contract generation (API endpoint specifications).

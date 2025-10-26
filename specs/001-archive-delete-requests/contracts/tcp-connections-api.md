# TCP Connections API Contract

**Feature**: Archive and Delete Historical Data
**Date**: 2025-10-25

## Overview

API endpoints for archiving, unarchiving TCP connections. Delete functionality already exists and does not require changes, but archive operations are new.

---

## Endpoints

### 1. Get All TCP Connections (Modified)

**Endpoint**: `GET /api/tcp-connections`

**Query Parameters**:
- `includeArchived` (boolean, optional) - If `true`, returns both active and archived connections. If `false` or omitted, returns only active connections (where `archived_timestamp IS NULL`).

**Request**:
```http
GET /api/tcp-connections?includeArchived=true HTTP/1.1
```

**Response** (200 OK):
```json
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "client_ip": "192.168.1.100",
    "client_port": 54321,
    "server_ip": "127.0.0.1",
    "server_port": 3002,
    "status": "closed",
    "open_timestamp": 1729900800000,
    "closed_timestamp": 1729900850000,
    "archived_timestamp": null
  },
  {
    "id": "880e8400-e29b-41d4-a716-446655440001",
    "client_ip": "192.168.1.101",
    "client_port": 54322,
    "server_ip": "127.0.0.1",
    "server_port": 3002,
    "status": "failed",
    "open_timestamp": 1729900700000,
    "closed_timestamp": 1729900701000,
    "archived_timestamp": 1729900900000
  }
]
```

**Notes**:
- Returns `TcpConnectionMeta[]` (excludes received_data and sent_data for performance)
- Default behavior (no query param) returns only active connections
- Items sorted by `open_timestamp DESC` (reverse chronological)

---

### 2. Delete Single TCP Connection (EXISTING - No Changes)

**Endpoint**: `DELETE /api/tcp-connections/:id`

**Path Parameters**:
- `id` (UUID) - TCP connection ID to delete

**Request**:
```http
DELETE /api/tcp-connections/770e8400-e29b-41d4-a716-446655440000 HTTP/1.1
```

**Response** (200 OK):
```json
{
  "status": "ok"
}
```

**Notes**:
- Already implemented in `src/tcp-connections/controller.ts`
- Performs hard delete
- No changes required

---

### 3. Delete All TCP Connections (EXISTING - No Changes)

**Endpoint**: `DELETE /api/tcp-connections`

**Request**:
```http
DELETE /api/tcp-connections HTTP/1.1
```

**Response** (200 OK):
```json
{
  "status": "ok"
}
```

**Notes**:
- Already implemented (calls `clearTcpConnections()`)
- Deletes all connections regardless of archive status
- No changes required

---

### 4. Archive Single TCP Connection (NEW)

**Endpoint**: `PATCH /api/tcp-connections/:id`

**Path Parameters**:
- `id` (UUID) - TCP connection ID to archive

**Request Body**:
```json
{
  "archived_timestamp": 1729901000000
}
```

**Request**:
```http
PATCH /api/tcp-connections/770e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Content-Type: application/json

{
  "archived_timestamp": 1729901000000
}
```

**Response** (200 OK):
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "client_ip": "192.168.1.100",
  "client_port": 54321,
  "server_ip": "127.0.0.1",
  "server_port": 3002,
  "status": "closed",
  "open_timestamp": 1729900800000,
  "closed_timestamp": 1729900850000,
  "archived_timestamp": 1729901000000
}
```

**Error Responses**:

**404 Not Found**:
```json
{
  "error": "TCP connection not found"
}
```

**400 Bad Request** (invalid timestamp):
```json
{
  "error": "archived_timestamp must be >= open_timestamp"
}
```

**Notes**:
- Sets `archived_timestamp` to provided value (Unix milliseconds)
- SSE event `tcp_connection:archived` emitted with connection metadata
- Idempotent - archiving already-archived connection updates timestamp

---

### 5. Unarchive Single TCP Connection (NEW)

**Endpoint**: `PATCH /api/tcp-connections/:id`

**Path Parameters**:
- `id` (UUID) - TCP connection ID to unarchive

**Request Body**:
```json
{
  "archived_timestamp": null
}
```

**Request**:
```http
PATCH /api/tcp-connections/770e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Content-Type: application/json

{
  "archived_timestamp": null
}
```

**Response** (200 OK):
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "client_ip": "192.168.1.100",
  "client_port": 54321,
  "server_ip": "127.0.0.1",
  "server_port": 3002,
  "status": "closed",
  "open_timestamp": 1729900800000,
  "closed_timestamp": 1729900850000,
  "archived_timestamp": null
}
```

**Error Responses**:

**404 Not Found**:
```json
{
  "error": "TCP connection not found"
}
```

**Notes**:
- Sets `archived_timestamp` to NULL
- SSE event `tcp_connection:unarchived` emitted with connection metadata
- Idempotent - unarchiving already-active connection has no effect

---

### 6. Bulk Archive TCP Connections (NEW)

**Endpoint**: `PATCH /api/tcp-connections/bulk-archive`

**Request Body**:

**Archive All Active Connections**:
```json
{
  "ids": [],
  "archived_timestamp": 1729901000000
}
```

**Archive Specific Connections**:
```json
{
  "ids": [
    "770e8400-e29b-41d4-a716-446655440000",
    "880e8400-e29b-41d4-a716-446655440001"
  ],
  "archived_timestamp": 1729901000000
}
```

**Request**:
```http
PATCH /api/tcp-connections/bulk-archive HTTP/1.1
Content-Type: application/json

{
  "ids": ["770e8400-e29b-41d4-a716-446655440000"],
  "archived_timestamp": 1729901000000
}
```

**Response** (200 OK):
```json
{
  "status": "ok",
  "archived_count": 2
}
```

**Error Responses**:

**400 Bad Request** (invalid timestamp):
```json
{
  "error": "archived_timestamp is required and must be a positive integer"
}
```

**Notes**:
- Empty `ids` array archives all active connections (where `archived_timestamp IS NULL`)
- Non-empty `ids` array archives only specified connections
- Invalid IDs are skipped (no error)
- Uses transaction for atomicity
- SSE event `tcp_connection:archived` emitted for each archived connection
- Returns count of successfully archived items

---

### 7. Bulk Delete TCP Connections (NEW)

**Endpoint**: `DELETE /api/tcp-connections/bulk-delete`

**Request Body**:

**Delete All Active Connections** (different from existing `DELETE /api/tcp-connections` which deletes ALL):
```json
{
  "ids": []
}
```

**Delete Specific Connections**:
```json
{
  "ids": [
    "770e8400-e29b-41d4-a716-446655440000",
    "880e8400-e29b-41d4-a716-446655440001"
  ]
}
```

**Request**:
```http
DELETE /api/tcp-connections/bulk-delete HTTP/1.1
Content-Type: application/json

{
  "ids": ["770e8400-e29b-41d4-a716-446655440000"]
}
```

**Response** (200 OK):
```json
{
  "status": "ok",
  "deleted_count": 2
}
```

**Notes**:
- Empty `ids` array deletes all active connections (respects archive status, unlike `DELETE /api/tcp-connections`)
- Non-empty `ids` array deletes only specified connections
- Invalid IDs are skipped (no error)
- Uses transaction for atomicity
- SSE event `tcp_connection:deleted` emitted for each deleted connection ID
- Returns count of successfully deleted items

---

## Zod Validation Schemas

**Archive/Unarchive Request Body**:
```typescript
const archiveTcpConnectionBodySchema = z.object({
  archived_timestamp: timestampSchema.nullish(),
});
```

**Bulk Archive Request Body**:
```typescript
const bulkArchiveTcpConnectionBodySchema = z.object({
  ids: z.array(uuidSchema).optional().default([]),
  archived_timestamp: timestampSchema,
});
```

**Bulk Delete Request Body**:
```typescript
const bulkDeleteTcpConnectionBodySchema = z.object({
  ids: z.array(uuidSchema).optional().default([]),
});
```

---

## SSE Events

**New Events** (to be added to `AppEvents` interface):

1. `tcp_connection:deleted` - When connection is deleted
   ```typescript
   { id: "770e8400-e29b-41d4-a716-446655440000" }
   ```

2. `tcp_connection:archived` - When connection is archived
   ```typescript
   {
     id: "770e8400-e29b-41d4-a716-446655440000",
     archived_timestamp: 1729901000000,
     // ... other TcpConnectionMeta fields
   }
   ```

3. `tcp_connection:unarchived` - When connection is unarchived
   ```typescript
   {
     id: "770e8400-e29b-41d4-a716-446655440000",
     archived_timestamp: null,
     // ... other TcpConnectionMeta fields
   }
   ```

**Existing Event** (may need update to align with new events):
- `tcp_connection` - Generic event with action field (currently used)
  - Consider migrating to specific event types for consistency

---

## Controller Implementation Pattern

**File**: `src/tcp-connections/controller.ts`

```typescript
export const tcpConnectionController = {
  "/api/tcp-connections": {
    GET: (req) => {
      const includeArchived = req.query.includeArchived === "true";
      return Response.json(getAllTcpConnectionsMeta(includeArchived));
    },
    DELETE: (req) => {
      clearTcpConnections(); // EXISTING - deletes all (no filter)
      return Response.json({ status: "ok" });
    },
  },
  "/api/tcp-connections/:id": {
    GET: (req) => {
      // EXISTING - no changes
    },
    DELETE: (req) => {
      // EXISTING - no changes
      deleteTcpConnection(req.params.id);
      return Response.json({ status: "ok" });
    },
    PATCH: async (req) => {
      // NEW
      const body = archiveTcpConnectionBodySchema.parse(await req.json());
      const updated = updateTcpConnection({
        id: req.params.id,
        archived_timestamp: body.archived_timestamp,
      });
      return Response.json(updated);
    },
  },
  "/api/tcp-connections/bulk-archive": {
    PATCH: async (req) => {
      // NEW
      const body = bulkArchiveTcpConnectionBodySchema.parse(await req.json());
      const count = bulkArchiveTcpConnections(body.ids, body.archived_timestamp);
      return Response.json({ status: "ok", archived_count: count });
    },
  },
  "/api/tcp-connections/bulk-delete": {
    DELETE: async (req) => {
      // NEW
      const body = bulkDeleteTcpConnectionBodySchema.parse(await req.json());
      const count = bulkDeleteTcpConnections(body.ids);
      return Response.json({ status: "ok", deleted_count: count });
    },
  },
  "/api/tcp-connections/test": {
    POST: async (req) => {
      // EXISTING - no changes
    },
  },
};
```

---

## Comparison with Requests API

**Differences from Request Events API**:
- TCP connections already have individual and bulk delete endpoints
- Delete behavior: `DELETE /api/tcp-connections` deletes ALL (not just active), while new `DELETE /api/tcp-connections/bulk-delete` with empty IDs respects archive status
- Event naming: TCP uses `tcp_connection:*` prefix vs requests use `request:*` prefix

**Similarities**:
- Both use PATCH for archive/unarchive operations
- Both use same query parameter (`includeArchived`) for filtering
- Both return count in bulk operation responses
- Both use transactions for bulk operations

---

## Summary

**New Endpoints**:
- `PATCH /api/tcp-connections/:id` - Archive/unarchive single connection
- `PATCH /api/tcp-connections/bulk-archive` - Bulk archive connections
- `DELETE /api/tcp-connections/bulk-delete` - Bulk delete connections (with archive filtering)

**Modified Endpoints**:
- `GET /api/tcp-connections` - Add `includeArchived` query parameter

**Existing Endpoints** (no changes):
- `DELETE /api/tcp-connections/:id` - Delete single connection
- `DELETE /api/tcp-connections` - Delete all connections (regardless of archive status)
- `POST /api/tcp-connections/test` - Test TCP connection

**SSE Events**:
- `tcp_connection:deleted` (ID only)
- `tcp_connection:archived` (metadata)
- `tcp_connection:unarchived` (metadata)

All new endpoints follow RESTful conventions and match the patterns established for request events.

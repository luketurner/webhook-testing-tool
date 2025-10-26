# Request Events API Contract

**Feature**: Archive and Delete Historical Data
**Date**: 2025-10-25

## Overview

API endpoints for archiving, unarchiving, and deleting HTTP request/response events. These endpoints extend the existing `/api/requests` controller.

---

## Endpoints

### 1. Get All Requests (Modified)

**Endpoint**: `GET /api/requests`

**Query Parameters**:
- `includeArchived` (boolean, optional) - If `true`, returns both active and archived requests. If `false` or omitted, returns only active requests (where `archived_timestamp IS NULL`).

**Request**:
```http
GET /api/requests?includeArchived=true HTTP/1.1
```

**Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "inbound",
    "status": "complete",
    "shared_id": "abc123",
    "request_method": "POST",
    "request_url": "/webhook",
    "request_timestamp": 1729900800000,
    "response_status": 200,
    "response_status_message": "OK",
    "response_timestamp": 1729900801000,
    "archived_timestamp": null
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "type": "inbound",
    "status": "complete",
    "shared_id": null,
    "request_method": "GET",
    "request_url": "/test",
    "request_timestamp": 1729900700000,
    "response_status": 404,
    "response_status_message": "Not Found",
    "response_timestamp": 1729900701000,
    "archived_timestamp": 1729900900000
  }
]
```

**Notes**:
- Returns `RequestEventMeta[]` (excludes body and headers for performance)
- Default behavior (no query param) returns only active requests
- Items sorted by `request_timestamp DESC` (reverse chronological)

---

### 2. Delete Single Request (NEW)

**Endpoint**: `DELETE /api/requests/:id`

**Path Parameters**:
- `id` (UUID) - Request ID to delete

**Request**:
```http
DELETE /api/requests/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
```

**Response** (200 OK):
```json
{
  "status": "ok"
}
```

**Error Responses**:

**404 Not Found** (request doesn't exist):
```json
{
  "error": "Request not found"
}
```

**Notes**:
- Performs hard delete (removes row from database)
- SSE event `request:deleted` emitted with request ID
- Idempotent - deleting already-deleted request returns 404

---

### 3. Delete All Active Requests (NEW)

**Endpoint**: `DELETE /api/requests`

**Request**:
```http
DELETE /api/requests HTTP/1.1
```

**Response** (200 OK):
```json
{
  "status": "ok",
  "deleted_count": 42
}
```

**Notes**:
- Deletes all requests where `archived_timestamp IS NULL`
- Does NOT delete archived requests
- Returns count of deleted items
- SSE event `request:deleted` emitted for each deleted request ID
- Uses transaction for atomicity

---

### 4. Archive Single Request (NEW)

**Endpoint**: `PATCH /api/requests/:id`

**Path Parameters**:
- `id` (UUID) - Request ID to archive

**Request Body**:
```json
{
  "archived_timestamp": 1729901000000
}
```

**Request**:
```http
PATCH /api/requests/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Content-Type: application/json

{
  "archived_timestamp": 1729901000000
}
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "inbound",
  "status": "complete",
  "shared_id": "abc123",
  "request_method": "POST",
  "request_url": "/webhook",
  "request_timestamp": 1729900800000,
  "response_status": 200,
  "response_status_message": "OK",
  "response_timestamp": 1729900801000,
  "archived_timestamp": 1729901000000
}
```

**Error Responses**:

**404 Not Found**:
```json
{
  "error": "Request not found"
}
```

**400 Bad Request** (invalid timestamp):
```json
{
  "error": "archived_timestamp must be >= request_timestamp"
}
```

**Notes**:
- Sets `archived_timestamp` to provided value (Unix milliseconds)
- SSE event `request:archived` emitted with request metadata
- Idempotent - archiving already-archived request updates timestamp

---

### 5. Unarchive Single Request (NEW)

**Endpoint**: `PATCH /api/requests/:id`

**Path Parameters**:
- `id` (UUID) - Request ID to unarchive

**Request Body**:
```json
{
  "archived_timestamp": null
}
```

**Request**:
```http
PATCH /api/requests/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Content-Type: application/json

{
  "archived_timestamp": null
}
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "inbound",
  "status": "complete",
  "shared_id": "abc123",
  "request_method": "POST",
  "request_url": "/webhook",
  "request_timestamp": 1729900800000,
  "response_status": 200,
  "response_status_message": "OK",
  "response_timestamp": 1729900801000,
  "archived_timestamp": null
}
```

**Error Responses**:

**404 Not Found**:
```json
{
  "error": "Request not found"
}
```

**Notes**:
- Sets `archived_timestamp` to NULL
- SSE event `request:unarchived` emitted with request metadata
- Idempotent - unarchiving already-active request has no effect

---

### 6. Bulk Archive Requests (NEW)

**Endpoint**: `PATCH /api/requests/bulk-archive`

**Request Body**:

**Archive All Active Requests**:
```json
{
  "ids": [],
  "archived_timestamp": 1729901000000
}
```

**Archive Specific Requests**:
```json
{
  "ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001"
  ],
  "archived_timestamp": 1729901000000
}
```

**Request**:
```http
PATCH /api/requests/bulk-archive HTTP/1.1
Content-Type: application/json

{
  "ids": ["550e8400-e29b-41d4-a716-446655440000"],
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
- Empty `ids` array archives all active requests (where `archived_timestamp IS NULL`)
- Non-empty `ids` array archives only specified requests
- Invalid IDs are skipped (no error)
- Uses transaction for atomicity
- SSE event `request:archived` emitted for each archived request
- Returns count of successfully archived items

---

### 7. Bulk Delete Requests (NEW)

**Endpoint**: `DELETE /api/requests/bulk-delete`

**Request Body**:

**Delete All Active Requests** (equivalent to `DELETE /api/requests`):
```json
{
  "ids": []
}
```

**Delete Specific Requests**:
```json
{
  "ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001"
  ]
}
```

**Request**:
```http
DELETE /api/requests/bulk-delete HTTP/1.1
Content-Type: application/json

{
  "ids": ["550e8400-e29b-41d4-a716-446655440000"]
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
- Empty `ids` array deletes all active requests
- Non-empty `ids` array deletes only specified requests
- Invalid IDs are skipped (no error)
- Uses transaction for atomicity
- SSE event `request:deleted` emitted for each deleted request ID
- Returns count of successfully deleted items

---

## Zod Validation Schemas

**Archive/Unarchive Request Body**:
```typescript
const archiveRequestBodySchema = z.object({
  archived_timestamp: timestampSchema.nullish(),
});
```

**Bulk Archive Request Body**:
```typescript
const bulkArchiveRequestBodySchema = z.object({
  ids: z.array(uuidSchema).optional().default([]),
  archived_timestamp: timestampSchema,
});
```

**Bulk Delete Request Body**:
```typescript
const bulkDeleteRequestBodySchema = z.object({
  ids: z.array(uuidSchema).optional().default([]),
});
```

---

## SSE Events

**Emitted Events**:

1. `request:deleted` - When request is deleted
   ```typescript
   { id: "550e8400-e29b-41d4-a716-446655440000" }
   ```

2. `request:archived` - When request is archived
   ```typescript
   {
     id: "550e8400-e29b-41d4-a716-446655440000",
     archived_timestamp: 1729901000000,
     // ... other RequestEventMeta fields
   }
   ```

3. `request:unarchived` - When request is unarchived
   ```typescript
   {
     id: "550e8400-e29b-41d4-a716-446655440000",
     archived_timestamp: null,
     // ... other RequestEventMeta fields
   }
   ```

---

## Controller Implementation Pattern

**File**: `src/request-events/controller.ts`

```typescript
export const requestEventController = {
  "/api/requests": {
    GET: (req) => {
      const includeArchived = req.query.includeArchived === "true";
      return Response.json(getAllRequestEventsMeta(includeArchived));
    },
    DELETE: (req) => {
      const count = clearRequestEvents(); // deletes all active
      return Response.json({ status: "ok", deleted_count: count });
    },
  },
  "/api/requests/:id": {
    GET: (req) => {
      // existing implementation
    },
    DELETE: (req) => {
      deleteRequestEvent(req.params.id);
      return Response.json({ status: "ok" });
    },
    PATCH: async (req) => {
      const body = archiveRequestBodySchema.parse(await req.json());
      const updated = updateRequestEvent({
        id: req.params.id,
        archived_timestamp: body.archived_timestamp,
      });
      return Response.json(updated);
    },
  },
  "/api/requests/bulk-archive": {
    PATCH: async (req) => {
      const body = bulkArchiveRequestBodySchema.parse(await req.json());
      const count = bulkArchiveRequestEvents(body.ids, body.archived_timestamp);
      return Response.json({ status: "ok", archived_count: count });
    },
  },
  "/api/requests/bulk-delete": {
    DELETE: async (req) => {
      const body = bulkDeleteRequestBodySchema.parse(await req.json());
      const count = bulkDeleteRequestEvents(body.ids);
      return Response.json({ status: "ok", deleted_count: count });
    },
  },
};
```

---

## Summary

**New Endpoints**:
- `DELETE /api/requests/:id` - Delete single request
- `DELETE /api/requests` - Delete all active requests
- `PATCH /api/requests/:id` - Archive/unarchive single request
- `PATCH /api/requests/bulk-archive` - Bulk archive requests
- `DELETE /api/requests/bulk-delete` - Bulk delete requests

**Modified Endpoints**:
- `GET /api/requests` - Add `includeArchived` query parameter

**SSE Events**:
- `request:deleted` (ID only)
- `request:archived` (metadata)
- `request:unarchived` (metadata)

All endpoints follow RESTful conventions and match existing TCP connections controller patterns.

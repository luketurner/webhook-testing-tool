# Quickstart Guide: Archive and Delete Feature

**Feature Branch**: `001-archive-delete-requests`
**Date**: 2025-10-25

## Overview

This guide helps developers quickly understand and implement the archive/delete functionality for HTTP requests and TCP connections. It provides essential context, key files, and implementation patterns.

---

## 🎯 Feature Summary

**What**: Add ability to archive (soft-hide) and delete (permanently remove) HTTP requests and TCP connections.

**Why**: Users need to manage workspace clutter from test data while preserving historical information when needed.

**How**:
- Database: Add nullable `archived_timestamp` column to both tables
- Backend: Extend model and controller with archive/delete operations
- Frontend: Add UI controls for archive/delete actions with "Show archived" toggle
- Real-time: Emit SSE events for live updates across clients

---

## 📁 Key Files & Locations

### Database Schema
- `/workspace/src/db/migrations/<timestamp>_add_archived_timestamp_columns.ts` *(create new)*
  - Adds `archived_timestamp INTEGER` column to `requests` and `tcp_connections` tables

### Request Events (HTTP)
- `/workspace/src/request-events/schema.ts` - Add `archived_timestamp` field to Zod schemas
- `/workspace/src/request-events/model.ts` - Add archive/delete model functions
- `/workspace/src/request-events/controller.ts` - Add archive/delete API endpoints

### TCP Connections
- `/workspace/src/tcp-connections/schema.ts` - Add `archived_timestamp` field to Zod schemas
- `/workspace/src/tcp-connections/model.ts` - Add archive/unarchive model functions
- `/workspace/src/tcp-connections/controller.ts` - Add archive/unarchive API endpoints (delete already exists)

### SSE Events
- `/workspace/src/db/events.ts` - Add new event types for archive/delete operations

### Frontend UI
- `/workspace/src/dashboard/pages/home-page.tsx` - Add archive/delete controls to request sidenav
- `/workspace/src/dashboard/pages/tcp-connection-page.tsx` - Add archive/delete controls to TCP sidenav
- *(May need additional UI component files)*

---

## 🔧 Implementation Steps

### Phase 1: Database Migration

1. Create migration file: `bun run migrate:create add_archived_timestamp_columns`
2. Write up/down SQL:
   ```sql
   -- UP
   ALTER TABLE requests ADD COLUMN archived_timestamp INTEGER;
   ALTER TABLE tcp_connections ADD COLUMN archived_timestamp INTEGER;

   -- DOWN
   ALTER TABLE requests DROP COLUMN archived_timestamp;
   ALTER TABLE tcp_connections DROP COLUMN archived_timestamp;
   ```
3. Run migration: migrations run automatically on server start

### Phase 2: Zod Schemas

Update both `schema.ts` files:
```typescript
import { timestampSchema } from "@/util/datetime";

export const requestEventSchema = z.object({
  // ... existing fields ...
  archived_timestamp: timestampSchema.nullish(),
});

// Meta schema includes archived_timestamp (don't omit it)
```

### Phase 3: Model Functions

**Pattern for `model.ts` files**:

```typescript
// Modified: Add filter parameter
export function getAllRequestEventsMeta(
  includeArchived = false
): RequestEventMeta[] {
  const filter = includeArchived
    ? ""
    : "WHERE archived_timestamp IS NULL";

  return db
    .query(`SELECT ${keysForSelect(requestEventMetaSchema)}
            FROM requests ${filter}
            ORDER BY request_timestamp DESC`)
    .all()
    .map((v) => requestEventMetaSchema.parse(v));
}

// NEW: Archive
export function archiveRequestEvent(id: RequestId): RequestEvent {
  const archived_timestamp = Date.now();
  const updated = updateRequestEvent({ id, archived_timestamp });
  broadcastEvent("request:archived", updated);
  return updated;
}

// NEW: Unarchive
export function unarchiveRequestEvent(id: RequestId): RequestEvent {
  const updated = updateRequestEvent({ id, archived_timestamp: null });
  broadcastEvent("request:unarchived", updated);
  return updated;
}

// NEW: Bulk archive
export const bulkArchiveRequestEvents = db.transaction(
  (ids?: RequestId[]): number => {
    const archived_timestamp = Date.now();
    let result;

    if (!ids || ids.length === 0) {
      // Archive all active
      result = db.run(
        "UPDATE requests SET archived_timestamp = ? WHERE archived_timestamp IS NULL",
        [archived_timestamp]
      );
    } else {
      // Archive specific IDs
      const placeholders = ids.map(() => "?").join(",");
      result = db.run(
        `UPDATE requests SET archived_timestamp = ? WHERE id IN (${placeholders})`,
        [archived_timestamp, ...ids]
      );
    }

    broadcastEvent("request:archived", { count: result.changes });
    return result.changes;
  }
);

// NEW: Delete single (requests only - TCP already has this)
export function deleteRequestEvent(id: RequestId): void {
  db.run("DELETE FROM requests WHERE id = ?", [id]);
  broadcastEvent("request:deleted", id);
}

// NEW: Bulk delete
export const bulkDeleteRequestEvents = db.transaction(
  (ids?: RequestId[]): number => {
    let result;

    if (!ids || ids.length === 0) {
      // Delete all active only
      result = db.run("DELETE FROM requests WHERE archived_timestamp IS NULL");
    } else {
      // Delete specific IDs
      const placeholders = ids.map(() => "?").join(",");
      result = db.run(`DELETE FROM requests WHERE id IN (${placeholders})`, ids);
    }

    broadcastEvent("request:deleted", { count: result.changes });
    return result.changes;
  }
);
```

### Phase 4: API Controllers

**Pattern for `controller.ts` files**:

```typescript
import { z } from "zod/v4";
import { timestampSchema, uuidSchema } from "@/util/*";

const archiveBodySchema = z.object({
  archived_timestamp: timestampSchema.nullish(),
});

const bulkArchiveBodySchema = z.object({
  ids: z.array(uuidSchema).optional().default([]),
  archived_timestamp: timestampSchema,
});

const bulkDeleteBodySchema = z.object({
  ids: z.array(uuidSchema).optional().default([]),
});

export const requestEventController = {
  "/api/requests": {
    GET: (req) => {
      const includeArchived = req.query.includeArchived === "true";
      return Response.json(getAllRequestEventsMeta(includeArchived));
    },
    DELETE: (req) => {
      const count = clearRequestEvents();
      return Response.json({ status: "ok", deleted_count: count });
    },
  },
  "/api/requests/:id": {
    PATCH: async (req) => {
      const body = archiveBodySchema.parse(await req.json());

      if (body.archived_timestamp === null) {
        const result = unarchiveRequestEvent(req.params.id);
        return Response.json(result);
      } else {
        const result = updateRequestEvent({
          id: req.params.id,
          archived_timestamp: body.archived_timestamp,
        });
        broadcastEvent("request:archived", result);
        return Response.json(result);
      }
    },
    DELETE: (req) => {
      deleteRequestEvent(req.params.id);
      return Response.json({ status: "ok" });
    },
  },
  "/api/requests/bulk-archive": {
    PATCH: async (req) => {
      const body = bulkArchiveBodySchema.parse(await req.json());
      const count = bulkArchiveRequestEvents(
        body.ids.length > 0 ? body.ids : undefined,
        body.archived_timestamp
      );
      return Response.json({ status: "ok", archived_count: count });
    },
  },
  "/api/requests/bulk-delete": {
    DELETE: async (req) => {
      const body = bulkDeleteBodySchema.parse(await req.json());
      const count = bulkDeleteRequestEvents(
        body.ids.length > 0 ? body.ids : undefined
      );
      return Response.json({ status: "ok", deleted_count: count });
    },
  },
};
```

### Phase 5: SSE Events

Update `/workspace/src/db/events.ts`:

```typescript
export interface AppEvents {
  // Existing
  "request:created": (event: RequestEvent) => void;
  "request:updated": (event: RequestEvent) => void;
  tcp_connection: (data: { action: string; id: string }) => void;

  // NEW
  "request:archived": (event: RequestEventMeta) => void;
  "request:unarchived": (event: RequestEventMeta) => void;
  "request:deleted": (id: RequestId) => void;
  "tcp_connection:archived": (connection: TcpConnectionMeta) => void;
  "tcp_connection:unarchived": (connection: TcpConnectionMeta) => void;
  "tcp_connection:deleted": (id: TcpConnectionId) => void;
}
```

### Phase 6: Frontend UI Components

**Requirements**:
1. "Show archived" toggle in sidenav header (persisted in localStorage)
2. Archive button on each item (no confirmation)
3. Delete button on each item (with AlertDialog confirmation)
4. "Archive all" menu item in sidenav actions
5. "Delete all" menu item in sidenav actions (with confirmation)
6. Visual indicator for archived items (muted color, icon)
7. Unarchive button visible when "Show archived" is enabled

**Example Toggle**:
```tsx
const [showArchived, setShowArchived] = useState(() => {
  return localStorage.getItem('showArchivedRequests') === 'true';
});

const handleToggle = (checked: boolean) => {
  setShowArchived(checked);
  localStorage.setItem('showArchivedRequests', String(checked));
};

// In JSX
<Switch checked={showArchived} onCheckedChange={handleToggle} />
```

**Example Delete Confirmation**:
```tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel,
         AlertDialogContent, AlertDialogDescription,
         AlertDialogFooter, AlertDialogHeader,
         AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Request</AlertDialogTitle>
      <AlertDialogDescription>
        This will permanently delete the request. This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => deleteRequest(id)}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**React Query Pattern**:
```tsx
// Fetch with archive filter
const { data: requests } = useQuery({
  queryKey: ['requests', showArchived],
  queryFn: () => fetch(`/api/requests?includeArchived=${showArchived}`)
    .then(r => r.json()),
});

// Archive mutation
const archiveMutation = useMutation({
  mutationFn: (id: string) =>
    fetch(`/api/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ archived_timestamp: Date.now() }),
    }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['requests'] });
  },
});

// Delete mutation
const deleteMutation = useMutation({
  mutationFn: (id: string) =>
    fetch(`/api/requests/${id}`, { method: 'DELETE' }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['requests'] });
  },
});
```

---

## 🧪 Testing Strategy

### Unit Tests
- Test model functions with various inputs
- Test Zod schema validation
- Test transaction rollback on errors

### Integration Tests
- Test API endpoints with Bun test
- Verify SSE events are emitted correctly
- Test bulk operations with different ID arrays

### Contract Tests
- Verify API request/response shapes match contracts
- Test error responses (404, 400)

### Example Test**:
```typescript
import { expect, test, beforeEach } from "bun:test";
import { createRequestEvent, archiveRequestEvent,
         getAllRequestEventsMeta } from "./model";
import { randomUUID } from "@/util/uuid";

beforeEach(() => {
  // DB automatically reset between tests
});

test("archiveRequestEvent sets archived_timestamp", () => {
  const request = createRequestEvent({
    id: randomUUID(),
    // ... other required fields
  });

  const archived = archiveRequestEvent(request.id);

  expect(archived.archived_timestamp).toBeGreaterThan(0);
  expect(archived.archived_timestamp).toBeLessThanOrEqual(Date.now());
});

test("getAllRequestEventsMeta filters archived by default", () => {
  const active = createRequestEvent({ id: randomUUID(), /* ... */ });
  const archived = createRequestEvent({ id: randomUUID(), /* ... */ });
  archiveRequestEvent(archived.id);

  const results = getAllRequestEventsMeta(false);

  expect(results).toContainEqual(expect.objectContaining({ id: active.id }));
  expect(results).not.toContainEqual(expect.objectContaining({ id: archived.id }));
});

test("getAllRequestEventsMeta includes archived when requested", () => {
  const active = createRequestEvent({ id: randomUUID(), /* ... */ });
  const archived = createRequestEvent({ id: randomUUID(), /* ... */ });
  archiveRequestEvent(archived.id);

  const results = getAllRequestEventsMeta(true);

  expect(results).toContainEqual(expect.objectContaining({ id: active.id }));
  expect(results).toContainEqual(expect.objectContaining({ id: archived.id }));
});
```

---

## 🚀 Development Workflow

1. **Create feature branch**: Already on `001-archive-delete-requests`
2. **Write tests first** (TDD per Constitution Principle V)
3. **Implement database migration**
4. **Update schemas and models**
5. **Add API endpoints**
6. **Update SSE events**
7. **Build frontend UI**
8. **Run tests**: `bun test`
9. **Format code**: `bun run format`
10. **Type check**: `bun run compile`
11. **Manual testing**: Start dev server and test UI flows
12. **Commit changes**: `git commit -m "claude: add archive/delete functionality"`

---

## 💡 Key Concepts

### Archive vs Delete
- **Archive**: Soft-hide with reversible timestamp. Item remains in DB. Use for "clean up view" without data loss.
- **Delete**: Hard remove from DB. Permanent. Use for "never want to see this again."

### Nullable Timestamp Pattern
- `NULL` = active (default state, all existing rows)
- `<integer>` = archived (Unix milliseconds when archived)
- Simple to query: `WHERE archived_timestamp IS NULL`

### Bulk Operations
- Empty `ids` array = apply to all active items
- Non-empty `ids` array = apply only to specified items
- Transactions ensure all-or-nothing behavior

### SSE for Real-Time
- Emit events after successful DB operations
- Frontend React Query invalidates on event receipt
- Multiple clients stay synchronized automatically

---

## 📚 Reference Documents

- **Spec**: `/workspace/specs/001-archive-delete-requests/spec.md`
- **Research**: `/workspace/specs/001-archive-delete-requests/research.md`
- **Data Model**: `/workspace/specs/001-archive-delete-requests/data-model.md`
- **API Contracts**: `/workspace/specs/001-archive-delete-requests/contracts/`
- **Constitution**: `/workspace/.specify/memory/constitution.md`
- **Project README**: `/workspace/CLAUDE.md`

---

## ⚠️ Common Pitfalls

1. **Don't modify shadcn/ui files**: Never edit `/workspace/src/components/ui/*` - use components as-is
2. **Don't forget SSE events**: Always emit events after DB changes for real-time updates
3. **Don't skip tests**: Constitution requires test-first development
4. **Don't use `any` type**: Always use proper TypeScript types
5. **Don't forget transactions**: Bulk operations must be wrapped in `db.transaction()`
6. **Don't forget to update `getAllXMeta`**: Must accept `includeArchived` parameter
7. **Don't forget localStorage**: Persist "Show archived" toggle state

---

## 🎓 Learning Resources

### Existing Patterns to Follow

**Database Operations**:
- See `/workspace/src/request-events/model.ts` for query patterns
- See `/workspace/src/db/migrations/*` for migration examples

**API Controllers**:
- See `/workspace/src/tcp-connections/controller.ts` for delete patterns
- See `/workspace/src/handlers/controller.ts` for CRUD patterns

**Frontend Components**:
- See `/workspace/src/dashboard/pages/home-page.tsx` for sidenav structure
- See `/workspace/src/components/ui/alert-dialog.tsx` for dialog component

**Testing**:
- See `/workspace/src/request-events/model.spec.ts` for model tests
- See `/workspace/src/handlers/controller.spec.ts` for API tests

---

## 🔍 Debugging Tips

**Database**:
```typescript
// Check migration status
console.log(db.query("SELECT * FROM migrations").all());

// Verify column exists
console.log(db.query("PRAGMA table_info(requests)").all());

// Check archived items
console.log(db.query("SELECT id, archived_timestamp FROM requests").all());
```

**SSE Events**:
```typescript
// Add logging in events.ts
broadcastEvent("request:archived", meta);
console.log("[SSE] Emitted request:archived", meta.id);
```

**Frontend State**:
```tsx
// Log toggle state
useEffect(() => {
  console.log("[Archive Toggle]", showArchived);
}, [showArchived]);
```

---

## ✅ Checklist Before PR

- [ ] Database migration created and tested
- [ ] Zod schemas updated with `archived_timestamp`
- [ ] Model functions implemented with tests
- [ ] API endpoints added to controllers
- [ ] SSE events added and emitted
- [ ] Frontend UI components functional
- [ ] All tests passing (`bun test`)
- [ ] Code formatted (`bun run format`)
- [ ] Type check passing (`bun run compile`)
- [ ] Manual testing completed for all user stories
- [ ] Constitution principles followed
- [ ] AIDEV-NOTE comments added for complex logic

---

## Need Help?

- Review user stories in spec.md for acceptance criteria
- Check research.md for design decisions and rationale
- Refer to data-model.md for schema details
- See contracts/ for API endpoint specifications
- Read constitution.md for coding principles

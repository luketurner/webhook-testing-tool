# Request List Pagination & Virtualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the dashboard freezing on large datasets by paginating the request list API (keyset), rendering it with infinite scroll + virtualization, and patching real-time SSE updates into the cache instead of refetching everything.

**Architecture:** The server gains a keyset-paginated, server-searchable `GET /api/requests` returning `{ events, nextCursor, total }`, backed by a new index. The sidebar consumes it through a `useInfiniteQuery` hook and renders only visible rows via `@tanstack/react-virtual`. SSE `request:created`/`request:updated` payloads are enriched with row metadata so the client patches its React Query cache directly.

**Tech Stack:** Bun + `bun:sqlite` (strict mode, `WITHOUT ROWID` `requests` table), Express/Bun.serve, Zod v4, React 19, `@tanstack/react-query` v5, `@tanstack/react-virtual` (new), shadcn/ui, Tailwind.

## Global Constraints

- Use `bun` for all package commands. NEVER `npm`.
- NEVER use the `any` type to fix TypeScript errors.
- Compile with `bun run compile` (NOT `bunx tsc`). Format with `bun run format`.
- Run tests with `NODE_ENV=test bun test` (or a specific file). DB state resets between tests automatically — do not do expensive work in `beforeEach`.
- Generate UUIDs in tests with `randomUUID` from `@/util/uuid`; base64 with `parseBase64` from `@/util/base64`.
- Zod schemas parse all external/DB data.
- Server-only modules start with `import "@/server-only";` and must never be imported from the frontend.
- Prefix commit messages with `claude: `.
- Any new dashboard route must also be registered as a static route in `src/dashboard/server.ts` (N/A for this plan — no new routes).
- SQL bind params are passed as an object with keys WITHOUT the `$` prefix (e.g. SQL `$limit`, params `{ limit }`), matching existing model code.

---

### Task 1: Add index on `requests(request_timestamp, id)`

**Files:**
- Create: `src/db/migrations/1785000000000_add_requests_timestamp_index.ts`
- Modify: `src/db/index.ts` (register the migration in the static import list and `migrations` array)
- Test: `src/db/migrations/requests-timestamp-index.spec.ts`

**Interfaces:**
- Produces: an index named `idx_requests_timestamp` on `requests (request_timestamp, id)`.

- [ ] **Step 1: Write the failing test**

Create `src/db/migrations/requests-timestamp-index.spec.ts`:

```ts
import { expect, test, describe } from "bun:test";
import { db } from "@/db";

describe("migration: requests timestamp index", () => {
  test("idx_requests_timestamp exists on the requests table", () => {
    const row = db
      .query(
        `SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_requests_timestamp';`,
      )
      .get() as { name: string } | null;
    expect(row?.name).toBe("idx_requests_timestamp");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `NODE_ENV=test bun test src/db/migrations/requests-timestamp-index.spec.ts`
Expected: FAIL — `row` is null (index does not exist yet).

- [ ] **Step 3: Create the migration file**

Create `src/db/migrations/1785000000000_add_requests_timestamp_index.ts`:

```ts
import "@/server-only";

export const up = `
  CREATE INDEX IF NOT EXISTS idx_requests_timestamp
    ON requests (request_timestamp, id);
`;

export const down = `
  DROP INDEX IF EXISTS idx_requests_timestamp;
`;
```

- [ ] **Step 4: Register the migration in `src/db/index.ts`**

Add the import alongside the other `migration*` imports (after `migration17`):

```ts
import * as migration18 from "./migrations/1785000000000_add_requests_timestamp_index";
```

Add to the `migrations` array (after the `1783296000000_add_http2_columns` entry):

```ts
  {
    name: "1785000000000_add_requests_timestamp_index",
    ...migration18,
  },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `NODE_ENV=test bun test src/db/migrations/requests-timestamp-index.spec.ts`
Expected: PASS. (Migrations run at DB module import, creating the index.)

- [ ] **Step 6: Compile and commit**

```bash
bun run compile
bun run format
git add src/db/migrations/1785000000000_add_requests_timestamp_index.ts src/db/index.ts src/db/migrations/requests-timestamp-index.spec.ts
git commit -m "claude: add index on requests(request_timestamp, id)"
```

---

### Task 2: Cursor encode/decode utility

**Files:**
- Create: `src/request-events/cursor.ts`
- Test: `src/request-events/cursor.spec.ts`

**Interfaces:**
- Produces:
  - `interface RequestCursor { request_timestamp: Timestamp; id: RequestId }`
  - `encodeRequestCursor(cursor: RequestCursor): string`
  - `decodeRequestCursor(raw: string): RequestCursor` — throws on malformed input.

- [ ] **Step 1: Write the failing test**

Create `src/request-events/cursor.spec.ts`:

```ts
import { expect, test, describe } from "bun:test";
import { encodeRequestCursor, decodeRequestCursor } from "./cursor";
import { randomUUID } from "@/util/uuid";
import { timestampSchema } from "@/util/datetime";

describe("request-events/cursor", () => {
  test("round-trips a cursor", () => {
    const id = randomUUID();
    const ts = timestampSchema.parse(1_700_000_000_123);
    const encoded = encodeRequestCursor({ request_timestamp: ts, id });
    const decoded = decodeRequestCursor(encoded);
    expect(decoded.request_timestamp).toBe(ts);
    expect(decoded.id).toBe(id);
  });

  test("decodes an id that contains no underscores", () => {
    const id = randomUUID();
    const encoded = `1700000000123_${id}`;
    const decoded = decodeRequestCursor(encoded);
    expect(decoded.id).toBe(id);
    expect(decoded.request_timestamp).toBe(1_700_000_000_123);
  });

  test("throws on malformed cursor", () => {
    expect(() => decodeRequestCursor("not-a-cursor")).toThrow();
    expect(() => decodeRequestCursor("123_")).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `NODE_ENV=test bun test src/request-events/cursor.spec.ts`
Expected: FAIL — module `./cursor` not found.

- [ ] **Step 3: Write the implementation**

Create `src/request-events/cursor.ts`:

```ts
import { z } from "zod/v4";
import { timestampSchema, type Timestamp } from "@/util/datetime";
import { uuidSchema } from "@/util/uuid";
import type { RequestId } from "./schema";

export interface RequestCursor {
  request_timestamp: Timestamp;
  id: RequestId;
}

const cursorSchema = z.object({
  request_timestamp: timestampSchema,
  id: uuidSchema,
});

export function encodeRequestCursor(cursor: RequestCursor): string {
  return `${cursor.request_timestamp}_${cursor.id}`;
}

export function decodeRequestCursor(raw: string): RequestCursor {
  const separator = raw.indexOf("_");
  if (separator === -1) {
    throw new Error("Invalid cursor: missing separator");
  }
  const timestampPart = raw.slice(0, separator);
  const idPart = raw.slice(separator + 1);
  return cursorSchema.parse({
    request_timestamp: Number(timestampPart),
    id: idPart,
  }) as RequestCursor;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `NODE_ENV=test bun test src/request-events/cursor.spec.ts`
Expected: PASS.

- [ ] **Step 5: Compile and commit**

```bash
bun run compile
bun run format
git add src/request-events/cursor.ts src/request-events/cursor.spec.ts
git commit -m "claude: add request event cursor encode/decode util"
```

---

### Task 3: `getRequestEventsPage` model function

**Files:**
- Modify: `src/request-events/model.ts` (add function + exported types; keep all existing functions)
- Test: `src/request-events/model.spec.ts` (add a new `describe` block)

**Interfaces:**
- Consumes: `encodeRequestCursor`, `decodeRequestCursor`, `RequestCursor` from `./cursor` (Task 2); `requestEventMetaSchema`, `RequestEventMeta` from `./schema`; `keysForSelect` from `@/util/sql`.
- Produces:
  - `interface RequestEventPage { events: RequestEventMeta[]; nextCursor: string | null; total: number }`
  - `interface GetRequestEventsPageOptions { limit: number; cursor?: string | null; includeArchived?: boolean; search?: string | null }`
  - `getRequestEventsPage(options: GetRequestEventsPageOptions): RequestEventPage`

- [ ] **Step 1: Write the failing test**

Add to `src/request-events/model.spec.ts`. First extend the import at the top of the file to include the new function:

```ts
import {
  createRequestEvent,
  updateRequestEvent,
  getRequestEvent,
  getRequestEventMeta,
  getAllRequestEvents,
  getAllRequestEventsMeta,
  getRequestEventsPage,
  deleteRequestEvent,
} from "./model";
```

Then add this `describe` block inside the top-level `describe("request-events/model", ...)`:

```ts
describe("getRequestEventsPage()", () => {
  function seed(count: number, base: Partial<RequestEvent> = {}) {
    // Distinct, descending-friendly timestamps; created oldest-first.
    const created: RequestEvent[] = [];
    for (let i = 0; i < count; i++) {
      created.push(
        createRequestEvent({
          ...testRequestEvent,
          id: randomUUID(),
          request_timestamp: now(),
          request_url: `/seed-${i}`,
          request_method: "GET",
          status: "complete",
          ...base,
        }),
      );
    }
    return created;
  }

  test("returns at most `limit` events, newest first", () => {
    seed(5);
    const page = getRequestEventsPage({ limit: 2 });
    expect(page.events).toHaveLength(2);
    expect(page.total).toBeGreaterThanOrEqual(5);
    expect(page.nextCursor).not.toBeNull();
    // newest-first: timestamps are non-increasing
    expect(page.events[0].request_timestamp).toBeGreaterThanOrEqual(
      page.events[1].request_timestamp,
    );
  });

  test("cursor pagination covers every row with no overlap or skip", () => {
    seed(7);
    const seen = new Set<string>();
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page = getRequestEventsPage({ limit: 3, cursor });
      for (const e of page.events) {
        expect(seen.has(e.id)).toBe(false); // no duplicates across pages
        seen.add(e.id);
      }
      cursor = page.nextCursor;
      pages++;
      expect(pages).toBeLessThan(20); // guard against infinite loop
    } while (cursor);
    expect(seen.size).toBeGreaterThanOrEqual(7);
  });

  test("paginates correctly when timestamps collide", () => {
    const ts = now();
    seed(5, { request_timestamp: ts }); // all identical timestamps
    const seen = new Set<string>();
    let cursor: string | null = null;
    do {
      const page = getRequestEventsPage({ limit: 2, cursor });
      for (const e of page.events) {
        expect(seen.has(e.id)).toBe(false);
        seen.add(e.id);
      }
      cursor = page.nextCursor;
    } while (cursor);
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });

  test("nextCursor is null on the final page", () => {
    seed(2);
    const page = getRequestEventsPage({ limit: 100 });
    expect(page.nextCursor).toBeNull();
  });

  test("excludes archived rows unless includeArchived", () => {
    const [visible] = seed(1, { request_url: "/active-row" });
    const [archived] = seed(1, {
      request_url: "/archived-row",
      archived_timestamp: now(),
    });

    const active = getRequestEventsPage({ limit: 100 });
    const activeIds = active.events.map((e) => e.id);
    expect(activeIds).toContain(visible.id);
    expect(activeIds).not.toContain(archived.id);

    const all = getRequestEventsPage({ limit: 100, includeArchived: true });
    const allIds = all.events.map((e) => e.id);
    expect(allIds).toContain(archived.id);
  });

  test("filters by search across method, url, and status", () => {
    const [match] = seed(1, {
      request_url: "/unique-search-target",
      request_method: "DELETE",
    });
    seed(3, { request_url: "/other", request_method: "GET" });

    const byUrl = getRequestEventsPage({ limit: 100, search: "unique-search" });
    expect(byUrl.events.map((e) => e.id)).toContain(match.id);
    expect(byUrl.total).toBe(1);

    const byMethod = getRequestEventsPage({ limit: 100, search: "delete" });
    expect(byMethod.events.map((e) => e.id)).toContain(match.id);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `NODE_ENV=test bun test src/request-events/model.spec.ts`
Expected: FAIL — `getRequestEventsPage` is not exported.

- [ ] **Step 3: Write the implementation**

In `src/request-events/model.ts`, add the cursor import near the top imports:

```ts
import {
  decodeRequestCursor,
  encodeRequestCursor,
} from "./cursor";
```

Add these exported types and the function (place after `getAllRequestEventsMeta`):

```ts
export interface RequestEventPage {
  events: RequestEventMeta[];
  nextCursor: string | null;
  total: number;
}

export interface GetRequestEventsPageOptions {
  limit: number;
  cursor?: string | null;
  includeArchived?: boolean;
  search?: string | null;
}

export function getRequestEventsPage(
  options: GetRequestEventsPageOptions,
): RequestEventPage {
  const { limit, cursor, includeArchived = false, search } = options;

  // Filter conditions (archived scope + search) are shared by the page query
  // and the total count. The cursor predicate applies ONLY to the page query.
  const filterConditions: string[] = [];
  const filterParams: Record<string, any> = {};

  if (!includeArchived) {
    filterConditions.push("archived_timestamp IS NULL");
  }

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    filterConditions.push(
      "(request_method LIKE $search OR request_url LIKE $search OR status LIKE $search OR CAST(response_status AS TEXT) LIKE $search)",
    );
    filterParams.search = `%${trimmedSearch}%`;
  }

  const pageConditions = [...filterConditions];
  const pageParams: Record<string, any> = { ...filterParams };

  if (cursor) {
    const decoded = decodeRequestCursor(cursor);
    pageConditions.push(
      "(request_timestamp < $cursorTs OR (request_timestamp = $cursorTs AND id < $cursorId))",
    );
    pageParams.cursorTs = decoded.request_timestamp;
    pageParams.cursorId = decoded.id;
  }

  const filterWhere = filterConditions.length
    ? `WHERE ${filterConditions.join(" AND ")}`
    : "";
  const pageWhere = pageConditions.length
    ? `WHERE ${pageConditions.join(" AND ")}`
    : "";

  const events = db
    .query(
      `select ${keysForSelect(
        requestEventMetaSchema,
      )} from "${tableName}" ${pageWhere} order by request_timestamp desc, id desc limit $limit;`,
    )
    .all({ ...pageParams, limit })
    .map((v) => requestEventMetaSchema.parse(v));

  const totalRow = db
    .query(`select count(*) as count from "${tableName}" ${filterWhere};`)
    .get({ ...filterParams }) as { count: number };

  const last = events[events.length - 1];
  const nextCursor =
    events.length === limit && last
      ? encodeRequestCursor({
          request_timestamp: last.request_timestamp,
          id: last.id,
        })
      : null;

  return { events, nextCursor, total: totalRow.count };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `NODE_ENV=test bun test src/request-events/model.spec.ts`
Expected: PASS (all existing tests plus the new `getRequestEventsPage` block).

- [ ] **Step 5: Compile and commit**

```bash
bun run compile
bun run format
git add src/request-events/model.ts src/request-events/model.spec.ts
git commit -m "claude: add keyset-paginated getRequestEventsPage model fn"
```

---

### Task 4: Paginate `GET /api/requests`

**Files:**
- Modify: `src/request-events/controller.ts` (rewrite the `GET` for `/api/requests`)
- Test: `src/request-events/controller.spec.ts` (replace the two existing `GET /api/requests` tests, which assert a bare array)

**Interfaces:**
- Consumes: `getRequestEventsPage`, `RequestEventPage` from `./model` (Task 3).
- Produces: `GET /api/requests?includeArchived&search&cursor&limit` → JSON `{ events, nextCursor, total }`.

- [ ] **Step 1: Write the failing test**

In `src/request-events/controller.spec.ts`, extend the model import to include `getRequestEventsPage` is NOT needed; instead replace the whole `describe("GET /api/requests", ...)` block with:

```ts
describe("GET /api/requests", () => {
  test("returns a page object with events, nextCursor, and total", async () => {
    const event1 = createRequestEvent({ ...testRequestEvent, id: randomUUID() });
    const event2 = createRequestEvent({
      ...testRequestEvent,
      id: randomUUID(),
      type: "outbound",
    });

    const mockReq = { url: "http://localhost:3000/api/requests" } as any;
    const response = requestEventController["/api/requests"].GET(mockReq);
    expect(response).toBeInstanceOf(Response);

    const data = await response.json();
    expect(Array.isArray(data.events)).toBe(true);
    expect(typeof data.total).toBe("number");
    expect("nextCursor" in data).toBe(true);

    const ourEvents = data.events.filter(
      (event: any) => event.id === event1.id || event.id === event2.id,
    );
    expect(ourEvents).toHaveLength(2);
    ourEvents.forEach((event: any) => {
      expect(event).not.toHaveProperty("request_headers");
      expect(event).not.toHaveProperty("request_body");
      expect(event).toHaveProperty("id");
      expect(event).toHaveProperty("status");
    });
  });

  test("honors the limit query param and returns a nextCursor", async () => {
    for (let i = 0; i < 3; i++) {
      createRequestEvent({ ...testRequestEvent, id: randomUUID() });
    }
    const mockReq = {
      url: "http://localhost:3000/api/requests?limit=1",
    } as any;
    const response = requestEventController["/api/requests"].GET(mockReq);
    const data = await response.json();
    expect(data.events).toHaveLength(1);
    expect(data.nextCursor).not.toBeNull();

    // second page via cursor returns a different event
    const next = requestEventController["/api/requests"].GET({
      url: `http://localhost:3000/api/requests?limit=1&cursor=${encodeURIComponent(
        data.nextCursor,
      )}`,
    } as any);
    const nextData = await next.json();
    expect(nextData.events[0].id).not.toBe(data.events[0].id);
  });

  test("clamps invalid limit to the default", async () => {
    const mockReq = {
      url: "http://localhost:3000/api/requests?limit=999999",
    } as any;
    const response = requestEventController["/api/requests"].GET(mockReq);
    const data = await response.json();
    expect(data.events.length).toBeLessThanOrEqual(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `NODE_ENV=test bun test src/request-events/controller.spec.ts`
Expected: FAIL — response is currently a bare array, so `data.events` is undefined.

- [ ] **Step 3: Write the implementation**

In `src/request-events/controller.ts`:

Update the model import to add `getRequestEventsPage` (keep `getAllRequestEventsMeta` — it is still used elsewhere by MCP):

```ts
import {
  getAllRequestEventsMeta,
  getRequestEventsPage,
  getRequestEvent,
  updateRequestEvent,
  getRequestEventBySharedId,
  deleteRequestEvent,
  clearRequestEvents,
  bulkDeleteRequestEvents,
  archiveRequestEvent,
  unarchiveRequestEvent,
  bulkArchiveRequestEvents,
} from "./model";
```

Add a limit schema near the other schemas at the top of the file:

```ts
const limitSchema = z.coerce.number().int().positive().max(200).catch(50);
```

Replace the `/api/requests` `GET` handler body with:

```ts
    GET: (req) => {
      const url = new URL(req.url);
      const includeArchived =
        url.searchParams.get("includeArchived") === "true";
      const search = url.searchParams.get("search") ?? undefined;
      const cursor = url.searchParams.get("cursor") ?? undefined;
      const limit = limitSchema.parse(url.searchParams.get("limit") ?? 50);
      return Response.json(
        getRequestEventsPage({ limit, cursor, includeArchived, search }),
      );
    },
```

(Leave `getAllRequestEventsMeta` imported and used nowhere in this file is fine only if lint does not error on unused; it IS still imported here for no reason now — remove it from THIS file's usage only if it becomes unused. It is not referenced elsewhere in controller.ts, so drop `getAllRequestEventsMeta` from the import list above if `bun run compile` flags it as unused. The MCP tool imports it directly from `./model`, so the function itself stays.)

- [ ] **Step 4: Run test to verify it passes**

Run: `NODE_ENV=test bun test src/request-events/controller.spec.ts`
Expected: PASS.

- [ ] **Step 5: Compile and commit**

```bash
bun run compile
bun run format
git add src/request-events/controller.ts src/request-events/controller.spec.ts
git commit -m "claude: paginate GET /api/requests with cursor and search"
```

---

### Task 5: Enrich SSE `request:created`/`request:updated` payloads

**Files:**
- Modify: `src/dashboard/server.ts` (the `onRequestCreated` / `onRequestUpdated` handlers inside `sseEndpoint`)
- Modify: `src/util/hooks/use-sse.ts` (widen the `SSEEvent.payload` type)

**Interfaces:**
- Consumes: `requestEventMetaSchema`, `RequestEventMeta` from `@/request-events/schema`.
- Produces: SSE `request:created` and `request:updated` events whose `payload` is a full `RequestEventMeta`.

- [ ] **Step 1: Widen the client SSE payload type**

In `src/util/hooks/use-sse.ts`, add an import and update the `SSEEvent` interface:

```ts
import type { RequestEventMeta } from "@/request-events/schema";
```

Change the `payload` field of `SSEEvent` to:

```ts
  payload?:
    | RequestEventMeta
    | {
        id: string;
        status?: string;
      };
```

- [ ] **Step 2: Enrich the server payloads**

In `src/dashboard/server.ts`, add the schema import near the top with the other imports:

```ts
import { requestEventMetaSchema } from "@/request-events/schema";
```

Replace the two handler bodies inside `sseEndpoint`:

```ts
        const onRequestCreated = (event: any) => {
          try {
            controller.enqueue(
              `data: ${JSON.stringify({
                type: "request:created",
                payload: requestEventMetaSchema.parse(event),
              })}\n\n`,
            );
          } catch (error) {
            console.error("Error sending request:created event:", error);
          }
        };

        const onRequestUpdated = (event: any) => {
          try {
            controller.enqueue(
              `data: ${JSON.stringify({
                type: "request:updated",
                payload: requestEventMetaSchema.parse(event),
              })}\n\n`,
            );
          } catch (error) {
            console.error("Error sending request:updated event:", error);
          }
        };
```

- [ ] **Step 3: Compile**

Run: `bun run compile`
Expected: no type errors. (This change has no unit test — the SSE stream is set up inline in `sseEndpoint`; it is verified end-to-end during the manual check in Task 8, and by the cache-patching tests in Task 6 which exercise the payload shape.)

- [ ] **Step 4: Run the existing suite to confirm nothing broke**

Run: `NODE_ENV=test bun test`
Expected: PASS (no behavioral regressions).

- [ ] **Step 5: Format and commit**

```bash
bun run format
git add src/dashboard/server.ts src/util/hooks/use-sse.ts
git commit -m "claude: include request metadata in SSE created/updated payloads"
```

---

### Task 6: Search matcher + infinite-query hook + cache-patch helpers

**Files:**
- Create: `src/util/request-search.ts`
- Create: `src/request-events/use-infinite-requests.ts`
- Create: `src/request-events/request-cache.ts`
- Test: `src/util/request-search.spec.ts`
- Test: `src/request-events/request-cache.spec.ts`

**Interfaces:**
- Consumes: `RequestEventMeta` from `@/request-events/schema`; `useInfiniteQuery`, `QueryClient` from `@tanstack/react-query`.
- Produces:
  - `matchesRequestSearch(meta: RequestEventMeta, query: string): boolean`
  - `interface RequestEventPageResponse { events: RequestEventMeta[]; nextCursor: string | null; total: number }`
  - `useInfiniteRequests(options: { includeArchived: boolean; search: string }): UseInfiniteQueryResult`
  - `prependRequestToCache(queryClient: QueryClient, meta: RequestEventMeta): void`
  - `updateRequestInCache(queryClient: QueryClient, meta: RequestEventMeta): void`

- [ ] **Step 1: Write the failing matcher test**

Create `src/util/request-search.spec.ts`:

```ts
import { expect, test, describe } from "bun:test";
import { matchesRequestSearch } from "./request-search";
import type { RequestEventMeta } from "@/request-events/schema";
import { randomUUID } from "@/util/uuid";
import { now } from "@/util/datetime";

function meta(overrides: Partial<RequestEventMeta> = {}): RequestEventMeta {
  return {
    id: randomUUID(),
    type: "inbound",
    status: "complete",
    request_method: "GET",
    request_url: "/webhooks/stripe",
    request_timestamp: now(),
    response_status: 200,
    ...overrides,
  } as RequestEventMeta;
}

describe("matchesRequestSearch", () => {
  test("empty query matches everything", () => {
    expect(matchesRequestSearch(meta(), "")).toBe(true);
    expect(matchesRequestSearch(meta(), "   ")).toBe(true);
  });

  test("matches on url substring, case-insensitively", () => {
    expect(matchesRequestSearch(meta(), "STRIPE")).toBe(true);
  });

  test("matches on method and status code", () => {
    expect(matchesRequestSearch(meta({ request_method: "POST" }), "post")).toBe(
      true,
    );
    expect(matchesRequestSearch(meta({ response_status: 404 }), "404")).toBe(
      true,
    );
  });

  test("returns false when nothing matches", () => {
    expect(matchesRequestSearch(meta(), "nonexistent")).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `NODE_ENV=test bun test src/util/request-search.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the matcher**

Create `src/util/request-search.ts`:

```ts
import type { RequestEventMeta } from "@/request-events/schema";

/**
 * Client-side mirror of the server's SQL LIKE search in
 * `getRequestEventsPage`. Used to decide whether an SSE-delivered request
 * belongs in the current filtered view. Keep the searched fields in sync
 * with the model's search predicate.
 */
export function matchesRequestSearch(
  meta: RequestEventMeta,
  query: string,
): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  return (
    meta.request_method.toLowerCase().includes(q) ||
    meta.request_url.toLowerCase().includes(q) ||
    meta.status.toLowerCase().includes(q) ||
    (meta.response_status?.toString().includes(q) ?? false)
  );
}
```

- [ ] **Step 4: Run to verify the matcher passes**

Run: `NODE_ENV=test bun test src/util/request-search.spec.ts`
Expected: PASS.

- [ ] **Step 5: Implement the infinite-query hook**

Create `src/request-events/use-infinite-requests.ts`:

```ts
import { useInfiniteQuery } from "@tanstack/react-query";
import type { RequestEventMeta } from "./schema";

export interface RequestEventPageResponse {
  events: RequestEventMeta[];
  nextCursor: string | null;
  total: number;
}

const PAGE_SIZE = 50;

export function useInfiniteRequests(options: {
  includeArchived: boolean;
  search: string;
}) {
  const { includeArchived, search } = options;
  return useInfiniteQuery({
    queryKey: ["requests", { includeArchived, search }],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<RequestEventPageResponse> => {
      const params = new URLSearchParams();
      params.set("includeArchived", String(includeArchived));
      params.set("limit", String(PAGE_SIZE));
      if (search.trim()) params.set("search", search.trim());
      if (pageParam) params.set("cursor", pageParam);
      const resp = await fetch(`/api/requests?${params.toString()}`);
      if (!resp.ok) {
        throw new Error(`Failed to load requests (${resp.status})`);
      }
      return resp.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
```

- [ ] **Step 6: Write the failing cache-patch test**

Create `src/request-events/request-cache.spec.ts`:

```ts
import { expect, test, describe } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import {
  prependRequestToCache,
  updateRequestInCache,
} from "./request-cache";
import type { RequestEventPageResponse } from "./use-infinite-requests";
import type { RequestEventMeta } from "./schema";
import { randomUUID } from "@/util/uuid";
import { now } from "@/util/datetime";

function meta(overrides: Partial<RequestEventMeta> = {}): RequestEventMeta {
  return {
    id: randomUUID(),
    type: "inbound",
    status: "complete",
    request_method: "GET",
    request_url: "/hook",
    request_timestamp: now(),
    response_status: 200,
    ...overrides,
  } as RequestEventMeta;
}

function seedCache(
  qc: QueryClient,
  key: unknown[],
  events: RequestEventMeta[],
) {
  qc.setQueryData(key, {
    pages: [
      { events, nextCursor: null, total: events.length },
    ] as RequestEventPageResponse[],
    pageParams: [null],
  });
}

describe("request-cache", () => {
  test("prepends a created event to page 0 and bumps total", () => {
    const qc = new QueryClient();
    const key = ["requests", { includeArchived: false, search: "" }];
    const existing = meta();
    seedCache(qc, key, [existing]);

    const created = meta({ request_url: "/new" });
    prependRequestToCache(qc, created);

    const data = qc.getQueryData(key) as any;
    expect(data.pages[0].events[0].id).toBe(created.id);
    expect(data.pages[0].events).toHaveLength(2);
    expect(data.pages[0].total).toBe(2);
  });

  test("does not prepend a non-matching search result", () => {
    const qc = new QueryClient();
    const key = ["requests", { includeArchived: false, search: "stripe" }];
    seedCache(qc, key, [meta({ request_url: "/stripe/hook" })]);

    prependRequestToCache(qc, meta({ request_url: "/paypal/hook" }));

    const data = qc.getQueryData(key) as any;
    expect(data.pages[0].events).toHaveLength(1);
  });

  test("does not prepend an archived event to an active-only view", () => {
    const qc = new QueryClient();
    const key = ["requests", { includeArchived: false, search: "" }];
    seedCache(qc, key, [meta()]);

    prependRequestToCache(qc, meta({ archived_timestamp: now() }));

    const data = qc.getQueryData(key) as any;
    expect(data.pages[0].events).toHaveLength(1);
  });

  test("does not double-prepend the same id", () => {
    const qc = new QueryClient();
    const key = ["requests", { includeArchived: false, search: "" }];
    const dupe = meta();
    seedCache(qc, key, [dupe]);

    prependRequestToCache(qc, dupe);

    const data = qc.getQueryData(key) as any;
    expect(data.pages[0].events).toHaveLength(1);
  });

  test("updates an existing event in place", () => {
    const qc = new QueryClient();
    const key = ["requests", { includeArchived: false, search: "" }];
    const original = meta({ status: "running", response_status: undefined });
    seedCache(qc, key, [original]);

    updateRequestInCache(qc, {
      ...original,
      status: "complete",
      response_status: 201,
    });

    const data = qc.getQueryData(key) as any;
    expect(data.pages[0].events[0].status).toBe("complete");
    expect(data.pages[0].events[0].response_status).toBe(201);
  });

  test("ignores single-resource cache entries without pages", () => {
    const qc = new QueryClient();
    const singleKey = ["requests", randomUUID()];
    qc.setQueryData(singleKey, { id: "x" });
    // Should not throw when iterating request queries.
    updateRequestInCache(qc, meta());
    expect(qc.getQueryData(singleKey)).toEqual({ id: "x" });
  });
});
```

- [ ] **Step 7: Run to verify the cache test fails**

Run: `NODE_ENV=test bun test src/request-events/request-cache.spec.ts`
Expected: FAIL — module `./request-cache` not found.

- [ ] **Step 8: Implement the cache helpers**

Create `src/request-events/request-cache.ts`:

```ts
import type { QueryClient } from "@tanstack/react-query";
import type { RequestEventMeta } from "./schema";
import type { RequestEventPageResponse } from "./use-infinite-requests";
import { matchesRequestSearch } from "@/util/request-search";

interface InfiniteRequestData {
  pages: RequestEventPageResponse[];
  pageParams: unknown[];
}

interface RequestQueryFilter {
  includeArchived: boolean;
  search: string;
}

function readFilter(queryKey: readonly unknown[]): RequestQueryFilter | null {
  const filter = queryKey[1];
  if (
    filter &&
    typeof filter === "object" &&
    "includeArchived" in filter &&
    "search" in filter
  ) {
    return filter as RequestQueryFilter;
  }
  return null;
}

function hasEvent(data: InfiniteRequestData, id: string): boolean {
  return data.pages.some((page) => page.events.some((e) => e.id === id));
}

/**
 * Prepend a newly-created request to every cached infinite-requests view it
 * belongs to (respecting each view's archived scope and search filter).
 */
export function prependRequestToCache(
  queryClient: QueryClient,
  meta: RequestEventMeta,
): void {
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: ["requests"] });

  for (const query of queries) {
    const filter = readFilter(query.queryKey);
    if (!filter) continue; // skip single-resource ["requests", id] entries
    if (meta.archived_timestamp && !filter.includeArchived) continue;
    if (!matchesRequestSearch(meta, filter.search)) continue;

    queryClient.setQueryData<InfiniteRequestData>(query.queryKey, (data) => {
      if (!data?.pages?.length) return data;
      if (hasEvent(data, meta.id)) return data;
      const [first, ...rest] = data.pages;
      return {
        ...data,
        pages: [
          {
            ...first,
            events: [meta, ...first.events],
            total: first.total + 1,
          },
          ...rest,
        ],
      };
    });
  }
}

/**
 * Replace an existing request (matched by id) across all cached pages of
 * every infinite-requests view. No-op for views that have not loaded it.
 */
export function updateRequestInCache(
  queryClient: QueryClient,
  meta: RequestEventMeta,
): void {
  queryClient.setQueriesData<InfiniteRequestData>(
    { queryKey: ["requests"] },
    (data) => {
      if (!data?.pages) return data;
      let changed = false;
      const pages = data.pages.map((page) => {
        if (!page.events.some((e) => e.id === meta.id)) return page;
        changed = true;
        return {
          ...page,
          events: page.events.map((e) =>
            e.id === meta.id ? { ...e, ...meta } : e,
          ),
        };
      });
      return changed ? { ...data, pages } : data;
    },
  );
}
```

- [ ] **Step 9: Run to verify all Task 6 tests pass**

Run: `NODE_ENV=test bun test src/util/request-search.spec.ts src/request-events/request-cache.spec.ts`
Expected: PASS.

- [ ] **Step 10: Compile and commit**

```bash
bun run compile
bun run format
git add src/util/request-search.ts src/util/request-search.spec.ts src/request-events/use-infinite-requests.ts src/request-events/request-cache.ts src/request-events/request-cache.spec.ts
git commit -m "claude: add request search matcher, infinite hook, and cache patch helpers"
```

---

### Task 7: Wire SSE provider to patch the cache

**Files:**
- Modify: `src/components/sse-provider.tsx`

**Interfaces:**
- Consumes: `prependRequestToCache`, `updateRequestInCache` from `@/request-events/request-cache` (Task 6); `requestEventMetaSchema` from `@/request-events/schema`.

- [ ] **Step 1: Rewrite the request branch of `onEvent`**

Replace the body of `src/components/sse-provider.tsx` with:

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { SSEContext, useSSE } from "@/util/hooks/use-sse";
import { requestEventMetaSchema } from "@/request-events/schema";
import {
  prependRequestToCache,
  updateRequestInCache,
} from "@/request-events/request-cache";

export function SSEProvider({ children }) {
  const queryClient = useQueryClient();

  const state = useSSE({
    url: `/api/events/stream`,
    onEvent: (event) => {
      if (event.type === "request:created") {
        const parsed = requestEventMetaSchema.safeParse(event.payload);
        if (parsed.success) {
          prependRequestToCache(queryClient, parsed.data);
        } else {
          queryClient.invalidateQueries({ queryKey: ["requests"] });
        }
      } else if (event.type === "request:updated") {
        const parsed = requestEventMetaSchema.safeParse(event.payload);
        if (parsed.success) {
          updateRequestInCache(queryClient, parsed.data);
        } else {
          queryClient.invalidateQueries({ queryKey: ["requests"] });
        }
      } else if (
        event.type === "request:archived" ||
        event.type === "request:unarchived" ||
        event.type === "request:deleted"
      ) {
        // User-initiated, low-frequency: a targeted refetch is fine.
        queryClient.invalidateQueries({ queryKey: ["requests"] });
      } else if (
        event.type === "tcp_connection:created" ||
        event.type === "tcp_connection:updated" ||
        event.type === "tcp_connection:closed" ||
        event.type === "tcp_connection:failed" ||
        event.type === "tcp_connection:archived" ||
        event.type === "tcp_connection:unarchived" ||
        event.type === "tcp_connection:deleted"
      ) {
        queryClient.invalidateQueries({ queryKey: ["tcp-connections"] });
      }
    },
    onError: (error) => {
      console.error("SSE connection error:", error);
    },
  });

  return <SSEContext value={state}>{children}</SSEContext>;
}
```

- [ ] **Step 2: Compile**

Run: `bun run compile`
Expected: no type errors.

- [ ] **Step 3: Run the full suite**

Run: `NODE_ENV=test bun test`
Expected: PASS.

- [ ] **Step 4: Format and commit**

```bash
bun run format
git add src/components/sse-provider.tsx
git commit -m "claude: patch request cache from SSE instead of full refetch"
```

---

### Task 8: Virtualize the sidebar with infinite scroll + debounced search

**Files:**
- Create: `src/util/hooks/use-debounced-value.ts`
- Modify: `src/components/request-sidebar.tsx`
- Modify: `package.json` / lockfile (add `@tanstack/react-virtual`)

**Interfaces:**
- Consumes: `useInfiniteRequests` from `@/request-events/use-infinite-requests` (Task 6); `useVirtualizer` from `@tanstack/react-virtual`.
- Produces: `useDebouncedValue<T>(value: T, delayMs: number): T`.

- [ ] **Step 1: Install the virtualization library**

```bash
bun add @tanstack/react-virtual
```

Expected: `@tanstack/react-virtual` appears in `package.json` dependencies.

- [ ] **Step 2: Add the debounce hook**

Create `src/util/hooks/use-debounced-value.ts`:

```ts
import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}
```

- [ ] **Step 3: Rewrite `RequestSidebar` to use the infinite query + virtualizer**

In `src/components/request-sidebar.tsx`:

1. Update imports — remove `useMemo`, add `useRef`, `useEffect`; add the new hooks and the virtualizer:

```ts
import { useState, useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useInfiniteRequests } from "@/request-events/use-infinite-requests";
import { useDebouncedValue } from "@/util/hooks/use-debounced-value";
```

Remove the old `import { useResourceList } from "@/dashboard/hooks";` (the sidebar no longer uses it).

2. Replace the data-fetching and derived-state block (the `useResourceList` call, `filteredRequests` `useMemo`, and `activeRequestsCount` `useMemo`) with:

```ts
  const debouncedSearch = useDebouncedValue(searchQuery, 250);

  const {
    data,
    isLoading: requestsLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteRequests({
    includeArchived: showArchived,
    search: debouncedSearch,
  });

  const events = data?.pages.flatMap((page) => page.events) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const activeRequestsCount = total;

  const scrollParentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 84,
    overscan: 8,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    const last = virtualItems[virtualItems.length - 1];
    if (!last) return;
    if (
      last.index >= events.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [virtualItems, events.length, hasNextPage, isFetchingNextPage, fetchNextPage]);
```

3. Replace the `<SidebarContent>...</SidebarContent>` block's inner list rendering. The scroll container must be a single measured element that the virtualizer owns. Use this structure:

```tsx
        <SidebarContent>
          <div ref={scrollParentRef} className="h-full overflow-auto">
            {requestsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 border-b p-4 last:border-b-0"
                >
                  <div className="flex w-full items-center gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="ml-auto h-3 w-12" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                </div>
              ))
            ) : events.length === 0 && debouncedSearch.trim() ? (
              <EmptyState
                message={`No requests found matching "${debouncedSearch}"`}
              />
            ) : events.length === 0 ? (
              <EmptyState message="No requests yet. Send a request to get started." />
            ) : (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {virtualItems.map((virtualRow) => {
                  const request = events[virtualRow.index];
                  const statusColor =
                    request.status === "complete"
                      ? "text-green-600"
                      : request.status === "error"
                        ? "text-red-600"
                        : "text-yellow-600";
                  const isArchived = !!request.archived_timestamp;
                  return (
                    <div
                      key={request.id}
                      data-index={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className={`border-b hover:bg-sidebar-accent group ${
                        isArchived ? "opacity-60" : ""
                      }`}
                    >
                      <NavLink
                        to={`/requests/${request.id}`}
                        className="flex flex-col items-start gap-2 p-4 text-sm leading-tight whitespace-nowrap"
                      >
                        <div className="flex w-full items-center gap-2">
                          <span className={`font-medium ${statusColor}`}>
                            {request.request_method}
                          </span>
                          {request.http_version === "2.0" && (
                            <Badge
                              variant="outline"
                              className="px-1 py-0 text-[10px]"
                            >
                              H2
                            </Badge>
                          )}
                          {request.type === "outbound" && (
                            <Badge
                              variant="outline"
                              className="px-1 py-0 text-[10px]"
                            >
                              Outbound
                            </Badge>
                          )}
                          {isArchived && (
                            <Archive className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="ml-auto text-xs">
                            <DateDisplay
                              timestamp={request.request_timestamp}
                              interactive={false}
                            />
                          </span>
                        </div>
                        <span
                          className="font-medium truncate w-full"
                          title={request.request_url}
                        >
                          {request.request_url}
                        </span>
                        <div className="flex items-center gap-2 text-xs w-full">
                          <span className={`capitalize ${statusColor}`}>
                            {request.status}
                          </span>
                          {request.response_status && (
                            <span className="text-muted-foreground">
                              • {request.response_status}
                            </span>
                          )}
                        </div>
                      </NavLink>
                    </div>
                  );
                })}
              </div>
            )}
            {isFetchingNextPage && (
              <div className="text-muted-foreground p-4 text-center text-xs">
                Loading more…
              </div>
            )}
          </div>
        </SidebarContent>
```

Remove the now-unused `SidebarGroup` / `SidebarGroupContent` wrappers from this block if they are no longer referenced elsewhere in the file (drop their imports only if `bun run compile` flags them unused).

Note the row uses `ref={rowVirtualizer.measureElement}` for dynamic height, so the `estimateSize: () => 84` is only an initial guess. Keep `data-index` — the measurer requires it.

- [ ] **Step 4: Compile**

Run: `bun run compile`
Expected: no type errors. Resolve any unused-import errors by deleting the specific unused imports (`useMemo`, `useResourceList`, `SidebarGroup`, `SidebarGroupContent`) flagged by the compiler.

- [ ] **Step 5: Manual verification (no automated UI harness in this repo)**

```bash
bun run dev
```

Then in the browser dashboard:
1. Confirm the request list renders and scrolls. Scrolling to the bottom loads more (network tab shows `/api/requests?...&cursor=...`).
2. Type in the search box — after ~250ms the list refetches server-side and filters across all events.
3. Send a webhook (e.g. `curl` the webhook port) — the new request appears at the top of the list without a full reload.
4. Toggle "Show Archived" and confirm the list updates.

Expected: no freeze, incremental loading, live prepend on new requests.

- [ ] **Step 6: Run the full test suite and commit**

```bash
NODE_ENV=test bun test
bun run format
git add package.json bun.lock src/util/hooks/use-debounced-value.ts src/components/request-sidebar.tsx
git commit -m "claude: virtualize request sidebar with infinite scroll and debounced search"
```

---

### Task 9: Update documentation and changelog

**Files:**
- Modify: `src/docs/inspecting-requests.md`
- Modify: `CHANGELOG.md`

**Interfaces:** none.

- [ ] **Step 1: Add a "Finding requests" section to the docs**

In `src/docs/inspecting-requests.md`, add this section after the intro paragraph (before `## Payloads`):

```markdown
## Finding requests

The sidebar lists captured requests newest-first and loads them in pages as you
scroll, so a database with thousands of events stays responsive. The search box
filters across the method, URL, status, and response code of every stored
request — not just the ones currently loaded — and new requests appear at the
top of the list in real time as they arrive.
```

- [ ] **Step 2: Add a changelog entry**

Open `CHANGELOG.md` and add an entry under a new unreleased/next-version heading following the file's existing format, for example:

```markdown
## Unreleased

- Fixed the dashboard freezing with large numbers of stored requests (#3). The
  request list is now paginated, virtualized, and loaded via infinite scroll,
  search runs server-side across all requests, and real-time updates patch the
  list instead of refetching everything.
```

Match the exact heading style already used in `CHANGELOG.md` (inspect the top of the file first and mirror it).

- [ ] **Step 3: Commit**

```bash
bun run format
git add src/docs/inspecting-requests.md CHANGELOG.md
git commit -m "claude: document paginated request list and update changelog"
```

---

## Final verification

- [ ] Run the full suite: `NODE_ENV=test bun test` — all green.
- [ ] `bun run compile` — no type errors.
- [ ] `bun run format` — clean.
- [ ] Manual smoke test from Task 8 Step 5 passes.

# Request List Pagination & Virtualization — Design

**Date:** 2026-08-04
**Issue:** [#3 — Browser stuck for WTT when having a lot of data](https://github.com/luketurner/webhook-testing-tool/issues/3)

## Problem

With ~2,000+ recorded events (26 MB SQLite DB), the dashboard tab freezes in
Chrome and Firefox. Deleting all events restores responsiveness.

### Root cause

The event list uses a fetch-everything / render-everything pattern, force-refetched
on every incoming webhook:

1. **Unbounded query.** `GET /api/requests` → `getAllRequestEventsMeta()` runs
   `select ... from requests order by request_timestamp desc` with **no `LIMIT`**
   (`src/request-events/controller.ts:36`, `src/request-events/model.ts:74`). All rows
   are returned and Zod-parsed server-side on every call.
2. **Render-everything.** `RequestSidebar` does `filteredRequests.map(...)`, mounting a
   `NavLink` plus ~10 nested nodes per event (`src/components/request-sidebar.tsx:245`).
   2,000 events → ~20k DOM nodes in a single synchronous pass, with no virtualization.
   **This is the dominant cost that locks the tab.**
3. **Refetch amplifier.** Every `request:created/updated/archived/unarchived/deleted`
   SSE event calls `queryClient.invalidateQueries({ queryKey: ["requests"] })`
   (`src/components/sse-provider.tsx:20`), re-fetching all rows and re-rendering the whole
   list. Under active traffic the UI thrashes repeatedly.

Contributing factor: **no index on `requests(request_timestamp)`** (only `tcp_connections`
has a timestamp index), so the `ORDER BY` is a full scan + filesort.

`GET /api/requests` is consumed **only** by the sidebar — the MCP tools call model
functions directly — so its response shape can change safely.

## Goals

- Stop returning and rendering the entire event set at once.
- Load events incrementally via infinite scroll, backed by paginated + searchable API.
- Keep search correct across the whole dataset (server-side).
- Make real-time SSE updates incremental instead of refetch-everything.

## Non-goals

- Changing TCP connection list behavior (same pattern exists, but out of scope for this issue).
- Changing the per-event detail view (`/api/requests/:id`).

## Design

### A. Database — add the missing index

New migration:

```sql
CREATE INDEX idx_requests_timestamp ON requests (request_timestamp, id);
```

SQLite reverse-scans an ascending index for our `ORDER BY request_timestamp DESC, id DESC`,
so a plain `(request_timestamp, id)` index supports both the sort and keyset seeks. The
`archived_timestamp IS NULL` predicate remains a cheap residual filter at these scales.
Down migration drops the index.

### B. Server — keyset pagination + server-side search

New model function `getRequestEventsPage({ limit, cursor, includeArchived, search })` in
`src/request-events/model.ts`:

- **WHERE** composed from:
  - archived filter: `archived_timestamp IS NULL` unless `includeArchived`.
  - optional **keyset** predicate:
    `(request_timestamp < :ts OR (request_timestamp = :ts AND id < :id))`.
  - optional **search** predicate: `LIKE '%q%'` (case-insensitive) against
    `request_method`, `request_url`, `status`, and `CAST(response_status AS TEXT)`.
- `ORDER BY request_timestamp DESC, id DESC LIMIT :limit`.
- **Cursor** is an opaque string `"<request_timestamp>_<id>"`, validated with a small Zod
  schema. The `id` tiebreaker is required: millisecond timestamps collide under load, and
  without a tiebreaker a keyset page can skip or duplicate rows.
- Returns `{ events: RequestEventMeta[], nextCursor: string | null, total: number }`.
  - `nextCursor` is built from the last returned row when a full page (`events.length === limit`)
    is returned; otherwise `null`.
  - `total` is `COUNT(*)` under the same filter (archived scope + search), used for the
    count labels and empty state.

`GET /api/requests` (`src/request-events/controller.ts`) parses query params with Zod:
`includeArchived` (bool), `search` (string, optional), `cursor` (string, optional),
`limit` (int, default 50, clamped to ≤200), and returns the object above.

**Response shape changes** from `RequestEventMeta[]` to `{ events, nextCursor, total }`.
The sidebar is the only consumer.

`getAllRequestEventsMeta` is retained (unused by the controller after this change, but kept
if referenced elsewhere; removed only if confirmed dead).

### C. Server — enrich SSE payloads

`onRequestCreated` / `onRequestUpdated` in `src/dashboard/server.ts` already receive the full
event object. They will send the full `RequestEventMeta` (parsed via `requestEventMetaSchema`)
in the payload instead of just `{ id, status }`, so the client can patch its cache without
any refetch. Archive/unarchive/deleted are not forwarded over SSE today and remain
mutation-driven (see D).

### D. Client — infinite query + incremental cache patching

- New hook `useInfiniteRequests({ includeArchived, search })` using `useInfiniteQuery`:
  - queryKey `["requests", { includeArchived, search }]`
  - `queryFn` fetches `/api/requests?includeArchived=&search=&cursor=&limit=`
  - `getNextPageParam: (lastPage) => lastPage.nextCursor`, `initialPageParam: undefined`
  - flattened list via `data.pages.flatMap(p => p.events)`
- `src/components/sse-provider.tsx` stops calling `invalidateQueries(["requests"])` for
  created/updated. Instead it patches the cache with `setQueryData` over matching
  `["requests", ...]` infinite queries:
  - **created** → prepend the meta to page 0; dedup by `id`; skip if it does not match the
    query's active filter (archived scope) or active search.
  - **updated** → replace the row in-place by `id` across pages (no-op if not loaded yet).
  - A shared, unit-tested util `matchesRequestSearch(meta, query)` mirrors the server's
    search fields so client-side prepend-matching stays consistent with server filtering.
  - **archived / unarchived / deleted** and bulk actions stay mutation-driven
    (`invalidateQueries` prefix) — rare, user-initiated, and cheap after the action.

### E. Client — virtualize the sidebar list

- Add `@tanstack/react-virtual`.
- `SidebarContent` becomes the scroll parent (ref attached); `useVirtualizer` windows the
  flat list with dynamic row measurement (`measureElement`) so only visible rows mount,
  regardless of scroll depth.
- Infinite scroll: when the last virtual item is within a threshold of the list end and
  `hasNextPage && !isFetchingNextPage`, call `fetchNextPage()`.
- The search input is **debounced (~250 ms)** and feeds the query key, so typing resets
  server-side pagination. The old client-side `filteredRequests` `useMemo` is removed.
- Count labels (Archive All / Delete All) and empty state use `total`.
- Existing row markup (method, H2/Outbound badges, date, URL, status) is preserved inside
  virtualized rows.

### F. Tests (no mocking, per repo convention)

- **Model** (`getRequestEventsPage`): limit honored; cursor continuation with **no overlap
  or skip across rows sharing a timestamp**; archived filter; search filter; `nextCursor`
  and `total` correctness; end-of-list returns `nextCursor: null`.
- **Controller**: query-param parsing, defaults, limit clamping, response shape.
- **Util**: `matchesRequestSearch` matches/does not match across method/url/status/response_status.

### G. Docs

Update `src/docs/inspecting-requests.md` if it describes list or search behavior.

## Trade-offs

- **Keyset over offset pagination.** Offset would duplicate or skip rows as new events are
  inserted at the top of a live list. Keyset is stable under insertion; its cost is carrying
  a cursor and a composite tiebreaker.
- **Duplicated search logic.** Server-side search is authoritative; the client needs a small
  matcher only to decide whether an SSE-created event belongs in the current filtered view.
  Isolated into one tested util to keep the two in sync.

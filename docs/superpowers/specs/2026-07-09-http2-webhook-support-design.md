# HTTP/2 Webhook Support — Design

**Date:** 2026-07-09
**Status:** Approved, ready for implementation planning

## Summary

Add HTTP/2 support to the WTT webhook server and surface HTTP/2-specific protocol
information in the request event viewer.

The work is explicitly **phased**:

- **Phase 1 (this spec):** accept `h2` requests over TLS, record the HTTP/2 metadata
  that the runtime readily exposes, and display it in the request event viewer.
- **Phase 2 (designed for, not built):** a true HTTP/2 frame log (DATA, WINDOW_UPDATE,
  PRIORITY, …). The phase-1 data model and server bootstrap leave a proven seam for it.

## Runtime constraints (verified, not assumed)

Every design decision below is forced by behavior empirically verified against
**Bun 1.3.14** (the runtime this project targets). These were established with
throwaway probe scripts and `curl` before any design was committed.

| Capability | Result |
| --- | --- |
| `http2.createSecureServer` serves `h2` | Works |
| `allowHTTP1: true` serves HTTP/1.1 | **Broken** — TLS alert 632 `no application protocol` |
| Explicit `ALPNProtocols: ['h2','http/1.1']` on `createSecureServer` | **Ignored** — still `h2`-only |
| `http2Server.emit('connection', tlsSocket)` | Works |
| `httpServer.emit('connection', socket)` | **Broken** — never responds (even for a plain `net` socket) |
| `httpsServer.emit('secureConnection', tlsSocket)` | **Broken** — never responds |
| TLS introspection (`getProtocol()`/`getCipher()`) on the h2 path | Works |
| Both `'stream'` and `'request'` fire for one h2 request | **Bun deviates from Node** |
| Connection-specific response headers (`connection`, `transfer-encoding`) | Bun silently accepts; Node throws |
| Multi-value request headers | Bun joins to a single string (`cookie: "a=1; b=2"`) |
| HTTP/2 has no status reason phrase | Confirmed (`:status` only) |

Upstream references:

- [oven-sh/bun#26721](https://github.com/oven-sh/bun/issues/26721) — `allowHTTP1` ignored, ALPN only advertises `h2`
- [oven-sh/bun#15419](https://github.com/oven-sh/bun/issues/15419) — support `allowHTTP1` option in http2
- [oven-sh/bun#16834](https://github.com/oven-sh/bun/issues/16834) — TLS socket introspection broken on the HTTP/1 path (already noted in `src/webhook-server/index.ts`)

Two consequences drive the whole design:

1. **Bun cannot serve HTTP/1.1 and HTTP/2 on one TLS port.** ALPN-based coexistence on
   port 3443 is impossible today, and no workaround exists, because handing the
   decrypted `http/1.1` socket to Express requires socket injection, which Bun does not
   support in either the `'connection'` or `'secureConnection'` form.
2. **TLS info finally works on the h2 path.** `tls_info` is captured today but is always
   `null` under Bun (`https.spec.ts` marks its test `test.failing`). The h2 listener is
   the first code path where it is populated for real.

## Scope

**In scope**

- `h2` over TLS on a dedicated port.
- Recording HTTP/2 metadata on the request event.
- Displaying that metadata (and, finally, the existing `tls_info`) in the viewer.
- An `http_version` indicator on every inbound request, including HTTP/1.1.

**Out of scope**

- `h2c` (cleartext HTTP/2), whether via prior knowledge or `Upgrade`.
- HTTP/2 for *outbound* requests (`send-request.ts`) and the TCP server.
- Server push (deprecated and unsupported by modern clients).
- A frame log — designed for, deferred to phase 2.

## Architecture

### Topology

A new **h2-only TLS listener** on `WTT_WEBHOOK_H2_PORT` (default `3444`), reusing the
existing certificate and key, including the ACME-issued cert and its renewal path.

Existing listeners are untouched, so there is **zero regression risk** for current
traffic:

| Port | Protocol | Handler |
| --- | --- | --- |
| `3000` | HTTP/1.1 cleartext | Express (unchanged) |
| `3443` | HTTP/1.1 over TLS | Express (unchanged) |
| `3444` *(new)* | HTTP/2 over TLS (`h2`) | native `'stream'` handler |

The listener is created as
`http2.createSecureServer({ key, cert, allowHTTP1: false })` with **only** a `'stream'`
listener. Both details are deliberate:

- `allowHTTP1: false` is set **explicitly** rather than left to default, so the port
  behaves identically on Bun and on Node. Bun ignores `true` anyway; pinning it `false`
  means the implementation never depends on the buggy path.
- **No `'request'` listener is ever attached to this server.** Bun fires *both*
  `'stream'` and `'request'` for a single h2 request. An Express app mounted there would
  race the stream handler, respond first, and destroy the stream — producing
  `ERR_HTTP2_INVALID_STREAM`. Attaching only `'stream'` is correct on both runtimes.

An `AIDEV-NOTE` in the h2 server bootstrap must record *why* the ports are split, citing
bun#26721, so a future reader knows merging them is a Bun fix away and not an intrinsic
design choice.

### Shared core extraction

`handleRequest()` is already transport-agnostic: it takes a `RequestEvent` and returns
`[Error | null, Partial<RequestEvent>]`. The only HTTP/1-coupled logic is the request
normalization and response writing inside Express's `app.all("*")` handler.

That logic is extracted into a transport-agnostic core, leaving two thin adapters:

```
                    ┌─────────────────────────┐
  Express (h1) ────►│                         │
                    │   process-request.ts    │──► handleRequest() ──► handlers
  h2 'stream'  ────►│  (event lifecycle)      │
                    └─────────────────────────┘
```

`process-request.ts` owns the entire event lifecycle in one place: build the
`RequestEvent`, emit `request:created`, call `handleRequest`, update the event, emit
`request:updated`.

It accepts a normalized inbound request plus a small `Responder` interface:

```ts
interface Responder {
  respond(status: number, headers: KVList<string>, body: Buffer | null): void;
  abort(): void;                  // h1: socket.destroy() | h2: RST_STREAM(CANCEL)
  writeRaw(data: string): void;   // h1: socket.write() | h2: unsupported
}
```

The `Responder` seam is what keeps the `_socketRawData` and `AbortSocketError` escape
hatches from leaking transport assumptions into the core.

### File layout

Organized by feature area, one concept per file, per `CLAUDE.md`.

| File | Purpose |
| --- | --- |
| `src/webhook-server/process-request.ts` | **New.** Transport-agnostic event lifecycle + `Responder` interface. Server-only (`import "@/server-only"`). |
| `src/webhook-server/index.ts` | Express `app.all` becomes a thin adapter over the core. Behavior-preserving. |
| `src/webhook-server/http2/server.ts` | **New.** h2 listener bootstrap. |
| `src/webhook-server/http2/stream-handler.ts` | **New.** Normalizes a stream into the core; implements `Responder` over `Http2Stream`. |
| `src/webhook-server/http2/metadata.ts` | **New.** Server-only; imports `node:http2`; extracts `Http2Info`. |
| `src/request-events/http2-info.ts` | **New.** Pure Zod schema + `Http2Info` type. |
| `src/db/migrations/1783296000000_add_http2_columns.ts` | **New.** Adds `http2_info` and `http_version`. |

`src/request-events/schema.ts` is reachable from the client, so it must **not** import
`node:http2`. The Zod schema therefore lives in a pure `http2-info.ts`, while the
extraction code that does import `node:http2` stays server-only under
`webhook-server/http2/metadata.ts`.

## Data model

Two new nullable columns on `requests`, mirroring the established `tls_info` pattern
(TEXT column holding JSON, `jsonFieldToSql` on write, `fromJSONString` preprocessing on
read):

- **`http2_info` TEXT** — JSON blob, `null` for HTTP/1.1 requests. Omitted from
  `requestEventMetaSchema`, exactly as `tls_info` is.
- **`http_version` TEXT** — `"1.1"` or `"2.0"`, populated on **every** inbound request.
  **Included in `requestEventMetaSchema`** so the request list can show a protocol badge
  without loading the full event. Nullable: it stays `null` for `outbound` request events
  (those created by `send-request.ts`), and the UI shows no badge when it is `null`.

### `Http2Info` shape

Phase 1 populates only fields verified to be available at runtime:

```ts
{
  alpn_protocol: string;          // "h2"
  stream_id: number;              // e.g. 1
  pseudo_headers: KVList<string>; // :method, :path, :scheme, :authority
  weight: number;                 // from stream.state.weight
  headers_frame_flags: {          // from the 'stream' event's `flags` argument
    end_stream: boolean;
    end_headers: boolean;
  };
  local_settings: Http2Settings;
  remote_settings: Http2Settings; // headerTableSize, enablePush, initialWindowSize,
                                  // maxConcurrentStreams, maxFrameSize,
                                  // maxHeaderListSize, enableConnectProtocol
}
```

`headers_frame_flags` is genuine frame-level data available for free: the `'stream'`
event's third argument carries the HEADERS frame flags, verified to report `END_STREAM`
and `END_HEADERS` correctly.

**Phase-2 seam.** Phase 1 defines **no** `frames` field and **no** `Http2Frame` schema —
writing an unused schema now would be dead code. What phase 1 *does* guarantee is that
`http2InfoSchema` is a plain (non-`.strict()`) Zod object. Phase 2 can therefore add an
optional `frames` field, and rows written during phase 1 will continue to parse
unchanged, since the field is optional and unknown keys are not rejected. That makes the
frame log a purely additive change rather than a migration.

### Pseudo-header handling

HTTP/2 pseudo-headers (`:method`, `:path`, `:scheme`, `:authority`) are **stripped from
`request_headers`** and stored under `http2_info.pseudo_headers`. This keeps the headers
table clean and prevents existing consumers — copy-as-curl, resend, and user handlers —
from ever seeing `:method` as an ordinary header.

`EXCLUDE_HEADER_MAP` filtering applies to h2 requests exactly as it does to h1.

## Response path semantics

Each rule below is forced by a verified runtime behavior.

- **No reason phrase.** HTTP/2 carries only `:status`, so `response_status_message` is
  always `null` for h2 requests.
- **Strip connection-specific response headers** (`connection`, `keep-alive`,
  `transfer-encoding`, `upgrade`, `proxy-connection`) before calling `stream.respond`.
  Bun silently forwards them, which is protocol-illegal; Node throws. Stripping is both
  correct and portable.
- **`AbortSocketError` → `stream.close(NGHTTP2_CANCEL)`** (RST_STREAM), then record the
  event as complete with a null response, mirroring the h1 socket-destroy behavior.
- **`resp.socket` raw-data escape hatch is HTTP/1-only.** Writing raw bytes into an h2
  connection would corrupt its binary framing. On h2, log a clear warning and reset the
  stream with `NGHTTP2_INTERNAL_ERROR`. Silently ignoring a handler's explicit
  instruction would be misleading, so the failure is made loud.
- **Header values are normalized** `string[] → join(", ")`. Bun already joins them; Node
  does not always. Normalizing defensively keeps `kvListSchema(z.string())` valid on both.
- **Request body** is collected from `stream.on('data')`; an empty body stores `null`.
- **Response body** is written via `stream.end(buffer)`. When a handler returns no body,
  the default `{ status }` JSON is sent, mirroring the Express path.
- **Query params** are parsed from `:path`; `request_url` stores the pathname only,
  exactly matching the h1 path.

## Viewer UI

Frontend conventions per `CLAUDE.md`: shadcn/ui components, Tailwind for all styles,
nothing under `src/components/ui` is edited.

- **Protocol badge.** `http_version` renders as a badge in the `RequestEventDisplay`
  header card and in each `request-sidebar.tsx` row, so HTTP/2 is visible from the list
  and not only the detail page.
- **`src/components/display/http2-info-section.tsx`** (new). Rendered by
  `RequestEventDisplay` only when `http2_info` is present:
  - a summary row: ALPN protocol, stream ID, weight, and `END_STREAM` / `END_HEADERS`
    flag chips;
  - a pseudo-headers table, reusing the existing `HeadersTable`;
  - a local-vs-remote SETTINGS comparison table.
- **`src/components/display/tls-info-section.tsx`** (new). Renders the existing
  `tls_info`, which is captured today but displayed nowhere. HTTP/2 is always TLS, and
  the h2 listener is the first path where this data is ever non-null, so surfacing it
  belongs squarely in this feature.

No new dashboard routes are added, so no static-route registration in
`src/dashboard/server.ts` is required.

## Configuration

New environment variables, following existing naming:

| Variable | Default | Purpose |
| --- | --- | --- |
| `WTT_WEBHOOK_H2_ENABLED` | `false` | Enable the h2 listener. |
| `WTT_WEBHOOK_H2_PORT` | `3444` | h2 listener port. |
| `WTT_PUBLIC_WEBHOOK_H2_PORT` | falls back to `WTT_WEBHOOK_H2_PORT` | Public-facing port, for URL display. |

The h2 listener requires TLS but is **independent of `WTT_WEBHOOK_SSL_ENABLED`**: it can
be enabled on its own, and enabling it does not implicitly turn on the HTTPS/1.1
listener. Concretely:

- It reuses `SSL_CERT_PATH` / `SSL_KEY_PATH`, and the ACME certificate when
  `ACME_ENABLED`, participating in the existing certificate-renewal restart path.
- The self-signed cert bootstrap in `src/server.ts` currently reads
  `if ((WEBHOOK_SSL_ENABLED && !ACME_ENABLED) || DASHBOARD_SSL_ENABLED)`. It must gain
  `WEBHOOK_H2_ENABLED`, otherwise enabling h2 without HTTPS starts a listener with no
  certificate on disk.

`WebhookServerOptions` gains an `http2: { enabled, port }` group, and
`WebhookServerResp` gains an `http2Server` field.

## Testing

Functional tests, nothing mocked or stubbed, per `CLAUDE.md`. DB state resets between
tests automatically.

**Bootstrap.** `test-config.ts` moves to `findAvailablePorts(4000, 5000, 3)` to add
`TEST_H2_PORT`; `test-setup.ts` starts and closes the h2 server alongside the others.

**`src/webhook-server/http2/server.spec.ts`** — drives a real `http2.connect` client
against the real server:

- GET and POST round-trip; request body captured; response returned.
- `http2_info` populated: `stream_id`, `pseudo_headers`, `alpn_protocol === "h2"`,
  local and remote settings, `headers_frame_flags`.
- Pseudo-headers are stripped from `request_headers`.
- `http_version === "2.0"` on h2; `"1.1"` on the Express path.
- `tls_info` is non-null — a **passing** test, in contrast to the h1 `test.failing`.
- The handler chain still runs: register a handler, assert its response.
- `AbortSocketError` produces a stream reset and an event with a null response.
- Connection-specific response headers are stripped.
- `response_status_message` is `null`.
- `resp.socket` on h2 resets the stream and logs a warning.

**`src/request-events/http2-info.spec.ts`** — Zod parse and round-trip, including
JSON-string preprocessing and the `null` case.

**Regression.** The proof that the core extraction is behavior-preserving is that the
existing `index.spec.ts`, `https.spec.ts`, and `handle-request.spec.ts` pass
**unchanged**.

Use `bun run format` and `bun run compile` (never `bunx tsc`). Note: `bun run compile`
already fails on five pre-existing files at `HEAD`; those are not regressions.

## Phase 2 seam — frame logging

Recorded now so phase 1 does not foreclose it. **No phase-2 code is written now.**

Neither Node nor Bun exposes DATA, WINDOW_UPDATE, or PRIORITY frames through the public
HTTP/2 API. Logging them requires owning the socket:

```
tls.createServer({ ALPNProtocols: ['h2'] })
  └─► decrypted socket
        └─► wrap in an observing Duplex (tees bytes to a frame parser)
              └─► http2Server.emit('connection', wrapped)
```

This is proven, not speculative: `emit('connection', tlsSocket)` into
`http2.createServer()` was verified to work on Bun, and TLS introspection survives the
hand-off.

Frame *headers* need no HPACK decoding. The 9-byte prefix gives everything needed:
length (24 bits), type (8), flags (8), reserved (1) + stream ID (31).

**The wrinkle to remember:** frames are *connection*-scoped while requests are
*stream*-scoped. A single h2 connection multiplexes many streams. `frames[]` on a
request should therefore hold the frames matching that request's stream ID, plus
session-scoped frames (stream 0: SETTINGS, PING, GOAWAY, WINDOW_UPDATE) observed during
the request's window.

Only the h2 listener bootstrap changes. The stream handler, the core, the schema, and
the UI all extend additively.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Core extraction regresses HTTP/1.1 | Existing h1 test suites must pass unchanged; Express adapter is behavior-preserving. |
| Bun fires `'request'` alongside `'stream'` | Never attach a `'request'` listener to the h2 server. Covered by an `AIDEV-NOTE`. |
| Bun accepts protocol-illegal response headers | Strip them in the h2 adapter, so behavior is correct on Bun and Node alike. |
| A future Bun fix makes the extra port redundant | `AIDEV-NOTE` cites bun#26721; merging ports later is additive. |
| Handlers using `resp.socket` break on h2 | Documented as h1-only; fails loudly with a warning and RST_STREAM. |

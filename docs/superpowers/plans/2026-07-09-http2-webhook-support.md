# HTTP/2 Webhook Support (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Accept HTTP/2 (`h2`) webhook requests on a dedicated TLS port, record HTTP/2 protocol metadata on each request event, and display it in the request event viewer.

**Architecture:** A new `h2`-only listener (`http2.createSecureServer`) runs on its own port because Bun cannot serve HTTP/1.1 and HTTP/2 on one TLS port. The existing Express `app.all` handler and the new h2 `'stream'` handler both delegate to a new transport-agnostic core (`process-request.ts`) that owns the `RequestEvent` lifecycle; each transport supplies a `Responder` that knows how to write its own response.

**Tech Stack:** Bun 1.3.14, TypeScript, `node:http2`, Express, Zod v4, SQLite (`bun:sqlite`), React, shadcn/ui, Tailwind.

**Spec:** `docs/superpowers/specs/2026-07-09-http2-webhook-support-design.md`

## Global Constraints

- **NEVER use the `any` type to fix TypeScript errors.** (Existing code uses `any` in places; do not add more. Where a cast is unavoidable, cast to a named interface.)
- Use `bun` for all package management. **DO NOT use `npm`.** Prefer editing `package.json` + `bun install` over `bun add` (`bun add` hangs in this devcontainer).
- Use `bun run format` to format code changes. Use `bun run compile` to typecheck. **DO NOT use `bunx tsc`.**
- `bun run compile` already fails on **five pre-existing files** at `HEAD`. Those are **not** regressions. Compare against a baseline before/after; only newly-introduced errors matter.
- Run tests with `bun test` (which is `NODE_ENV=test bun test`).
- Commit messages are terse, describe what changed, and are **prefixed with `claude: `**.
- Zod schemas parse all external data (DB rows, network input).
- Files marked server-only must start with `import "@/server-only";` and must never be imported from the frontend.
- Frontend: shadcn/ui components + Tailwind classes only. **Do not edit `src/components/ui/*`** or `src/util/ui.ts`.
- Tests: no mocks, no stubs. DB state resets between tests automatically — do not add DB cleanup in `afterEach`.
- Use `randomUUID` from `@/util/uuid` and `parseBase64` from `@/util/base64` in tests so values carry the correct brands.
- Work on the existing `http2-webhook-support` branch.

## Runtime facts this plan depends on (already verified against Bun 1.3.14)

Do **not** re-litigate these; they were established empirically before planning.

| Fact | Consequence |
| --- | --- |
| `allowHTTP1: true` is ignored; ALPN advertises only `h2` ([bun#26721](https://github.com/oven-sh/bun/issues/26721)) | h2 needs its own port |
| Bun fires **both** `'stream'` and `'request'` for one h2 request | **Never** attach a `'request'` listener to the h2 server |
| Bun silently accepts `connection`/`transfer-encoding` response headers; Node throws | Strip them before `stream.respond` |
| Bun joins multi-value request headers into one string | Still normalize `string[] → join(", ")` for Node portability |
| HTTP/2 has no status reason phrase | `response_status_message` is always `null` for h2 |
| `'end'` fires on GET/HEAD/empty-POST streams | Safe to always await `'end'` before processing |
| `stream.state.weight`, `session.alpnProtocol`, `socket.getProtocol()` all readable inside `'end'` | Metadata extraction can happen there |
| HEADERS frame flags: `END_STREAM = 0x1`, `END_HEADERS = 0x4` | `flags & 0x1`, `flags & 0x4` |

## File Structure

| File | Responsibility |
| --- | --- |
| `src/db/migrations/1783296000000_add_http2_columns.ts` | **Create.** Adds `http2_info`, `http_version` to `requests`. |
| `src/db/index.ts` | **Modify.** Register migration 17. |
| `src/request-events/http2-info.ts` | **Create.** Pure Zod schema + `Http2Info`/`Http2Settings` types. No `node:http2`. |
| `src/request-events/schema.ts` | **Modify.** Add the two columns; omit `http2_info` from the meta schema. |
| `src/request-events/model.ts` | **Modify.** `jsonFieldToSql` for `http2_info`. |
| `src/webhook-server/tls-info.ts` | **Create.** `extractTlsInfo`, moved out of `index.ts` so both transports share it. |
| `src/webhook-server/process-request.ts` | **Create.** Transport-agnostic event lifecycle; `NormalizedRequest`, `Responder`, `ResponseOutcome`, `SentResponse`. Server-only. |
| `src/webhook-server/index.ts` | **Modify.** Express becomes a thin adapter over the core. |
| `src/webhook-server/http2/headers.ts` | **Create.** Pure header helpers (split pseudo-headers, normalize values, strip forbidden, parse flags). |
| `src/webhook-server/http2/metadata.ts` | **Create.** Server-only; builds `Http2Info` from a stream. |
| `src/webhook-server/http2/stream-handler.ts` | **Create.** Normalizes a stream into the core; `Responder` over `ServerHttp2Stream`. |
| `src/webhook-server/http2/server.ts` | **Create.** h2 listener bootstrap. |
| `src/config.ts` | **Modify.** `WEBHOOK_H2_ENABLED`, `WEBHOOK_H2_PORT`, `PUBLIC_WEBHOOK_H2_PORT`. |
| `src/server.ts` | **Modify.** Start h2 server; include it in the self-signed cert bootstrap condition. |
| `src/test-config.ts`, `src/test-setup.ts` | **Modify.** Add `TEST_H2_PORT`; start/stop the h2 server. |
| `src/components/display/http2-info-section.tsx` | **Create.** Renders `http2_info`. |
| `src/components/display/tls-info-section.tsx` | **Create.** Renders `tls_info`. |
| `src/components/request-event-display.tsx` | **Modify.** Protocol badge + the two new sections. |
| `src/components/request-sidebar.tsx` | **Modify.** Protocol badge on list rows. |
| `README.md`, `CHANGELOG.md` | **Modify.** Document the new env vars. |

---

### Task 1: Data model — `http2_info` and `http_version` columns

**Files:**
- Create: `src/db/migrations/1783296000000_add_http2_columns.ts`
- Create: `src/request-events/http2-info.ts`
- Create: `src/request-events/http2-info.spec.ts`
- Modify: `src/db/index.ts`
- Modify: `src/request-events/schema.ts`
- Modify: `src/request-events/model.ts:24-36`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `http2InfoSchema`, `http2SettingsSchema`, `http2HeadersFrameFlagsSchema` (Zod)
  - `interface Http2Info { alpn_protocol: string; stream_id: number; pseudo_headers: KVList<string>; weight?: number | null; headers_frame_flags: { end_stream: boolean; end_headers: boolean }; local_settings: Http2Settings; remote_settings: Http2Settings }`
  - `type Http2Settings = { headerTableSize?, enablePush?, initialWindowSize?, maxConcurrentStreams?, maxFrameSize?, maxHeaderListSize?, enableConnectProtocol? }` (all nullish)
  - `RequestEvent` gains `http_version?: string | null` and `http2_info?: Http2Info | null`
  - `RequestEventMeta` gains `http_version` (but **not** `http2_info`)

- [ ] **Step 1: Write the failing schema test**

Create `src/request-events/http2-info.spec.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { http2InfoSchema } from "@/request-events/http2-info";
import { requestEventSchema } from "@/request-events/schema";
import { createRequestEvent, getRequestEvent } from "@/request-events/model";
import { randomUUID } from "@/util/uuid";
import { now } from "@/util/datetime";
import type { RequestEvent } from "@/request-events/schema";

const VALID_HTTP2_INFO = {
  alpn_protocol: "h2",
  stream_id: 1,
  pseudo_headers: [
    [":method", "POST"],
    [":path", "/webhook"],
    [":scheme", "https"],
    [":authority", "localhost:3444"],
  ],
  weight: 16,
  headers_frame_flags: { end_stream: false, end_headers: true },
  local_settings: { maxConcurrentStreams: 100, initialWindowSize: 65535 },
  remote_settings: { maxConcurrentStreams: 4294967295, enablePush: true },
};

describe("http2InfoSchema", () => {
  test("parses a full HTTP/2 info object", () => {
    const parsed = http2InfoSchema.parse(VALID_HTTP2_INFO);
    expect(parsed.alpn_protocol).toBe("h2");
    expect(parsed.stream_id).toBe(1);
    expect(parsed.headers_frame_flags.end_headers).toBe(true);
    expect(parsed.pseudo_headers).toHaveLength(4);
  });

  test("rejects an object missing required fields", () => {
    expect(() => http2InfoSchema.parse({ alpn_protocol: "h2" })).toThrow();
  });

  test("is not strict: unknown keys (e.g. a future `frames` field) do not throw", () => {
    // AIDEV-NOTE: This is the phase-2 seam. Adding `frames` later must not break
    // parsing of rows written during phase 1, and vice versa.
    const parsed = http2InfoSchema.parse({ ...VALID_HTTP2_INFO, frames: [{ type: "DATA" }] });
    expect(parsed.stream_id).toBe(1);
  });
});

describe("request event http2 columns", () => {
  test("round-trips http2_info and http_version through the database", () => {
    const event: RequestEvent = {
      id: randomUUID(),
      type: "inbound",
      status: "complete",
      request_method: "POST",
      request_url: "/webhook",
      request_headers: [["content-type", "application/json"]],
      request_query_params: [],
      request_timestamp: now(),
      http_version: "2.0",
      http2_info: http2InfoSchema.parse(VALID_HTTP2_INFO),
    } as RequestEvent;

    createRequestEvent(event);
    const loaded = getRequestEvent(event.id);

    expect(loaded.http_version).toBe("2.0");
    expect(loaded.http2_info).toBeDefined();
    expect(loaded.http2_info?.alpn_protocol).toBe("h2");
    expect(loaded.http2_info?.stream_id).toBe(1);
    expect(loaded.http2_info?.pseudo_headers).toContainEqual([":method", "POST"]);
  });

  test("http_version is null and http2_info is null for a plain HTTP/1.1 event", () => {
    const event: RequestEvent = {
      id: randomUUID(),
      type: "inbound",
      status: "complete",
      request_method: "GET",
      request_url: "/plain",
      request_headers: [],
      request_query_params: [],
      request_timestamp: now(),
    } as RequestEvent;

    createRequestEvent(event);
    const loaded = getRequestEvent(event.id);
    expect(loaded.http2_info ?? null).toBeNull();
  });

  test("requestEventSchema accepts http2_info as a JSON string (as SQLite returns it)", () => {
    const parsed = requestEventSchema.parse({
      id: randomUUID(),
      type: "inbound",
      status: "complete",
      request_method: "GET",
      request_url: "/x",
      request_headers: "[]",
      request_query_params: "[]",
      request_timestamp: now(),
      http_version: "2.0",
      http2_info: JSON.stringify(VALID_HTTP2_INFO),
    });
    expect(parsed.http2_info?.stream_id).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/request-events/http2-info.spec.ts`
Expected: FAIL — `Cannot find module '@/request-events/http2-info'`

- [ ] **Step 3: Create the migration**

Create `src/db/migrations/1783296000000_add_http2_columns.ts`:

```ts
import "@/server-only";

export const up = `
  ALTER TABLE requests ADD COLUMN http2_info TEXT;
  ALTER TABLE requests ADD COLUMN http_version TEXT;
`;

export const down = `
  ALTER TABLE requests DROP COLUMN http2_info;
  ALTER TABLE requests DROP COLUMN http_version;
`;
```

- [ ] **Step 4: Register the migration**

In `src/db/index.ts`, add the import after `migration16`:

```ts
import * as migration17 from "./migrations/1783296000000_add_http2_columns";
```

and add the entry at the end of the `migrations` array:

```ts
  { name: "1783296000000_add_http2_columns", ...migration17 },
```

- [ ] **Step 5: Create the Zod schema**

Create `src/request-events/http2-info.ts`:

```ts
import { kvListSchema, type KVList } from "@/util/kv-list";
import { z } from "zod/v4";

// AIDEV-NOTE: This file must stay free of `node:http2` imports -- it is reachable
// from the frontend via request-events/schema.ts. The extraction code that does
// import node:http2 lives in src/webhook-server/http2/metadata.ts (server-only).

export const http2SettingsSchema = z.object({
  headerTableSize: z.number().nullish(),
  enablePush: z.boolean().nullish(),
  initialWindowSize: z.number().nullish(),
  maxConcurrentStreams: z.number().nullish(),
  maxFrameSize: z.number().nullish(),
  maxHeaderListSize: z.number().nullish(),
  enableConnectProtocol: z.boolean().nullish(),
});

export const http2HeadersFrameFlagsSchema = z.object({
  end_stream: z.boolean(),
  end_headers: z.boolean(),
});

// AIDEV-NOTE: Deliberately NOT `.strict()`. Phase 2 adds an optional `frames` field;
// leaving this permissive means phase-1 rows and phase-2 rows both parse without a
// data migration. See docs/superpowers/specs/2026-07-09-http2-webhook-support-design.md
export const http2InfoSchema = z.object({
  alpn_protocol: z.string(),
  stream_id: z.number(),
  pseudo_headers: kvListSchema(z.string()),
  weight: z.number().nullish(),
  headers_frame_flags: http2HeadersFrameFlagsSchema,
  local_settings: http2SettingsSchema,
  remote_settings: http2SettingsSchema,
});

export type Http2Settings = z.infer<typeof http2SettingsSchema>;
export type Http2HeadersFrameFlags = z.infer<typeof http2HeadersFrameFlagsSchema>;

export interface Http2Info extends z.infer<typeof http2InfoSchema> {
  pseudo_headers: KVList<string>;
}
```

- [ ] **Step 6: Wire the columns into the request event schema**

In `src/request-events/schema.ts`, add the import at the top:

```ts
import { http2InfoSchema, type Http2Info } from "./http2-info";
```

Add these two fields to `requestEventSchema`, immediately after `tls_info`:

```ts
  http_version: z.string().nullish(),
  http2_info: z.preprocess(fromJSONString, http2InfoSchema.nullish()).nullish(),
```

Add `http2_info: true` to the `requestEventMetaSchema` omit list (leave `http_version` in, so the list view gets it):

```ts
export const requestEventMetaSchema = requestEventSchema.omit({
  request_headers: true,
  request_query_params: true,
  request_body: true,
  response_headers: true,
  response_body: true,
  tls_info: true,
  http2_info: true,
});
```

Add to the `RequestEvent` interface so the branded/structural types survive:

```ts
export interface RequestEvent extends z.infer<typeof requestEventSchema> {
  request_headers: KVList<string>;
  request_query_params: KVList<string>;
  response_headers?: KVList<string> | undefined | null;
  http2_info?: Http2Info | undefined | null;
}
```

- [ ] **Step 7: Serialize `http2_info` to SQL**

In `src/request-events/model.ts`, inside `requestEventToSql`, add one line after the `tls_info` line:

```ts
    ...jsonFieldToSql(event, "tls_info"),
    ...jsonFieldToSql(event, "http2_info"),
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `bun test src/request-events/http2-info.spec.ts`
Expected: PASS (7 tests)

- [ ] **Step 9: Verify no regressions and typecheck**

Run: `bun test src/request-events/`
Expected: PASS (existing `model.spec.ts`, `schema.spec.ts`, `controller.spec.ts` all still pass)

Run: `bun run compile`
Expected: same five pre-existing errors as at `HEAD`, no new ones.

- [ ] **Step 10: Format and commit**

```bash
bun run format
git add src/db/migrations/1783296000000_add_http2_columns.ts src/db/index.ts \
        src/request-events/http2-info.ts src/request-events/http2-info.spec.ts \
        src/request-events/schema.ts src/request-events/model.ts
git commit -m "claude: add http2_info and http_version columns to request events"
```

---

### Task 2: Extract the transport-agnostic request core

Behavior-preserving refactor. The existing HTTP/1.1 test suites are the proof.

**Critical:** the current Express handler intercepts `res.write`/`res.end` to record the **actual bytes and headers sent** (including `content-length`, `etag`, etc. added by Express). The core must **not** record the handler's intended response instead — that would silently degrade HTTP/1.1 fidelity. This is why `Responder.send()` returns what was *actually* sent.

**Files:**
- Create: `src/webhook-server/tls-info.ts`
- Create: `src/webhook-server/process-request.ts`
- Modify: `src/webhook-server/index.ts:53-225`
- Modify: `src/webhook-server/index.spec.ts` (add one test)

**Interfaces:**
- Consumes: `RequestEvent`, `Http2Info` (Task 1).
- Produces:
  - `extractTlsInfo(socket: unknown): TLSInfo | null`
  - `interface NormalizedRequest { method: HttpMethod; url: string; headers: KVList<string>; queryParams: KVList<string>; body: Base64 | null; httpVersion: string; tlsInfo: TLSInfo | null; http2Info: Http2Info | null }`
  - `type ResponseOutcome = { kind: "abort" } | { kind: "raw"; data: string } | { kind: "http"; status: number; headers: KVList<string>; body: Buffer | null }`
  - `interface SentResponse { status: number | null; statusMessage: string | null; headers: KVList<string>; body: Buffer | null }`
  - `interface Responder { send(outcome: ResponseOutcome): Promise<SentResponse> }`
  - `const EMPTY_SENT: SentResponse`
  - `processRequest(normalized: NormalizedRequest, responder: Responder): Promise<void>`

- [ ] **Step 1: Write the failing test**

Append to `src/webhook-server/index.spec.ts`, inside the existing top-level `describe`:

```ts
  test("records http_version 1.1 for plain HTTP requests", async () => {
    const response = await fetch(`${baseUrl}/http-version-check`);
    expect(response.status).toBe(200);

    const allEvents = getAllRequestEvents();
    const event = allEvents.find((e) => e.request_url === "/http-version-check");
    expect(event).toBeDefined();
    expect(event?.http_version).toBe("1.1");
    expect(event?.http2_info ?? null).toBeNull();
  });

  test("still records the actual response headers written by Express", async () => {
    // AIDEV-NOTE: Guards the res.end interception. `content-length` is added by
    // Express, not by the handler, so it only appears if we capture what was SENT.
    const response = await fetch(`${baseUrl}/response-fidelity`);
    expect(response.status).toBe(200);

    const allEvents = getAllRequestEvents();
    const event = allEvents.find((e) => e.request_url === "/response-fidelity");
    expect(event).toBeDefined();
    const headerNames = (event?.response_headers ?? []).map(([k]) => k.toLowerCase());
    expect(headerNames).toContain("content-length");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/webhook-server/index.spec.ts -t "http_version"`
Expected: FAIL — `expected "1.1", got undefined`

(The `response-fidelity` test should already PASS at this point; it exists to catch a regression in Step 4.)

- [ ] **Step 3: Extract the TLS helper**

Create `src/webhook-server/tls-info.ts` by moving `extractTlsInfo` verbatim out of `index.ts`:

```ts
import "@/server-only";
import type { TLSSocket } from "tls";
import type { TLSInfo } from "@/request-events/schema";

interface MaybeTlsSocket {
  encrypted?: boolean;
}

// AIDEV-NOTE: This does not work for HTTP/1 sockets in Bun due to
// https://github.com/oven-sh/bun/issues/16834 -- it returns null there.
// It DOES work on the HTTP/2 path (session.socket), which is the first place
// tls_info is ever populated under Bun.
export function extractTlsInfo(socket: unknown): TLSInfo | null {
  const maybe = socket as MaybeTlsSocket | null | undefined;
  if (!maybe || !maybe.encrypted) {
    return null;
  }

  const tlsSocket = socket as TLSSocket;

  try {
    const tlsInfo: TLSInfo = {};

    if (typeof tlsSocket.getProtocol === "function") {
      tlsInfo.protocol = tlsSocket.getProtocol();
    }

    if (typeof tlsSocket.getCipher === "function") {
      tlsInfo.cipher = tlsSocket.getCipher();
    }

    if (typeof tlsSocket.getPeerCertificate === "function") {
      const cert = tlsSocket.getPeerCertificate();
      if (cert && Object.keys(cert).length > 0) {
        tlsInfo.peerCertificate = {
          subject: cert.subject,
          issuer: cert.issuer,
          valid_from: cert.valid_from,
          valid_to: cert.valid_to,
          fingerprint: cert.fingerprint,
        };
      }
    }

    if (typeof tlsSocket.isSessionReused === "function") {
      tlsInfo.isSessionReused = tlsSocket.isSessionReused();
    }

    if (Object.keys(tlsInfo).length === 0) {
      return null;
    }

    return tlsInfo;
  } catch (err) {
    console.error("Failed to extract TLS info:", err);
    return null;
  }
}
```

- [ ] **Step 4: Create the transport-agnostic core**

Create `src/webhook-server/process-request.ts`:

```ts
import "@/server-only";
import type { RequestEvent, TLSInfo } from "@/request-events/schema";
import type { Http2Info } from "@/request-events/http2-info";
import { createRequestEvent, updateRequestEvent } from "@/request-events/model";
import { appEvents } from "@/db/events";
import { handleRequest } from "./handle-request";
import { isAbortSocketError } from "./errors";
import { randomUUID } from "@/util/uuid";
import { now } from "@/util/datetime";
import { fromBufferLike, type Base64 } from "@/util/base64";
import type { KVList } from "@/util/kv-list";
import type { HttpMethod } from "@/util/http";

export interface NormalizedRequest {
  method: HttpMethod;
  url: string;
  headers: KVList<string>;
  queryParams: KVList<string>;
  body: Base64 | null;
  httpVersion: string;
  tlsInfo: TLSInfo | null;
  http2Info: Http2Info | null;
}

export type ResponseOutcome =
  | { kind: "abort" }
  | { kind: "raw"; data: string }
  | { kind: "http"; status: number; headers: KVList<string>; body: Buffer | null };

export interface SentResponse {
  status: number | null;
  statusMessage: string | null;
  headers: KVList<string>;
  body: Buffer | null;
}

/**
 * A transport adapter. `send` performs the write and resolves with what was
 * ACTUALLY transmitted, which is not always what the handler asked for
 * (Express adds content-length, etag, etc.).
 */
export interface Responder {
  send(outcome: ResponseOutcome): Promise<SentResponse>;
}

export const EMPTY_SENT: SentResponse = {
  status: null,
  statusMessage: null,
  headers: [],
  body: null,
};

interface RawSocketResponse {
  _socketRawData?: string;
}

// AIDEV-NOTE: Single owner of the RequestEvent lifecycle for every transport.
// Express (HTTP/1.x) and the HTTP/2 stream handler both funnel through here.
export async function processRequest(
  normalized: NormalizedRequest,
  responder: Responder,
): Promise<void> {
  const event: RequestEvent = {
    id: randomUUID(),
    type: "inbound",
    status: "running",
    request_url: normalized.url,
    request_method: normalized.method,
    request_timestamp: now(),
    request_body: normalized.body,
    request_headers: normalized.headers,
    request_query_params: normalized.queryParams,
    tls_info: normalized.tlsInfo,
    http_version: normalized.httpVersion,
    http2_info: normalized.http2Info,
  };

  const createdEvent = createRequestEvent(event);
  appEvents.emit("request:created", createdEvent);

  const [error, response] = await handleRequest(event);

  const outcome = toResponseOutcome(error, response);
  const sent = await responder.send(outcome);

  const updatedEvent = updateRequestEvent({
    id: event.id,
    status: "complete",
    response_status: sent.status,
    response_status_message: sent.statusMessage,
    response_headers: sent.headers,
    response_body: sent.body && sent.body.length > 0 ? fromBufferLike(sent.body) : null,
    response_timestamp: now(),
  });
  appEvents.emit("request:updated", updatedEvent);
}

function toResponseOutcome(
  error: Error | null,
  response: Partial<RequestEvent>,
): ResponseOutcome {
  if (error && isAbortSocketError(error)) {
    return { kind: "abort" };
  }

  const rawData = (response as RawSocketResponse)?._socketRawData;
  if (rawData) {
    return { kind: "raw", data: rawData };
  }

  const status =
    typeof response?.response_status === "number" ? response.response_status : 200;

  return {
    kind: "http",
    status,
    headers: response?.response_headers ?? [],
    body:
      response?.response_body === null || response?.response_body === undefined
        ? null
        : Buffer.from(response.response_body, "base64"),
  };
}
```

- [ ] **Step 5: Rewrite the Express handler as a thin adapter**

In `src/webhook-server/index.ts`: delete the local `extractTlsInfo` function and the whole `app.all("*", ...)` body, and replace with the following. Update the imports accordingly (drop `TLSSocket`, `randomUUID`, `now`, `createRequestEvent`, `updateRequestEvent`, `appEvents`, `handleRequest`, `isAbortSocketError`, `RequestEvent`, `TLSInfo`; add the ones below).

```ts
import { extractTlsInfo } from "./tls-info";
import {
  processRequest,
  EMPTY_SENT,
  type NormalizedRequest,
  type Responder,
  type SentResponse,
} from "./process-request";

function normalizeExpressRequest(req: express.Request): NormalizedRequest {
  const headers = { ...req.headers };
  for (const header of Object.keys(headers)) {
    if (EXCLUDE_HEADER_MAP[header]) delete headers[header];
  }

  // AIDEV-NOTE: Query parameters are extracted using URL and URLSearchParams APIs
  // which automatically handles decoding. The base URL doesn't matter since we only
  // care about the query string portion of req.originalUrl.
  const url = new URL(req.originalUrl, `http://${req.headers.host || "localhost"}`);

  return {
    method: req.method as HttpMethod,
    url: url.pathname,
    headers: fromObject(headers as Record<string, string | string[]>),
    queryParams: [...url.searchParams.entries()],
    body: Buffer.isBuffer(req.body) ? fromBufferLike(req.body) : null,
    httpVersion: req.httpVersion,
    tlsInfo: extractTlsInfo(req.socket),
    http2Info: null,
  };
}

function createExpressResponder(
  req: express.Request,
  res: express.Response,
): Responder {
  // intercept response write so we can log the response info actually sent
  // ref. https://stackoverflow.com/a/50161321
  const oldWrite = res.write;
  const oldEnd = res.end;
  const chunks: Buffer[] = [];
  let onSent: ((sent: SentResponse) => void) | null = null;

  res.write = (...restArgs) => {
    chunks.push(Buffer.from(restArgs[0]));
    return oldWrite.apply(res, restArgs);
  };

  res.end = (...restArgs) => {
    if (restArgs[0]) {
      chunks.push(Buffer.from(restArgs[0]));
    }
    const body = Buffer.concat(chunks);
    const result = oldEnd.apply(res, restArgs);

    onSent?.({
      status: res.statusCode,
      // Express leaves statusMessage as "" for some codes; the schema requires min(1) or null.
      statusMessage: res.statusMessage || null,
      headers: fromObject(res.getHeaders() as Record<string, string | string[]>),
      body: body.length > 0 ? body : null,
    });
    return result;
  };

  return {
    send(outcome) {
      return new Promise<SentResponse>((resolve) => {
        // AIDEV-NOTE: Destroy the socket without sending any response.
        if (outcome.kind === "abort") {
          req.socket.destroy();
          resolve(EMPTY_SENT);
          return;
        }

        // AIDEV-NOTE: Write raw data directly to the socket, bypassing HTTP.
        if (outcome.kind === "raw") {
          req.socket.write(outcome.data, "utf8");
          req.socket.end(() => resolve(EMPTY_SENT));
          return;
        }

        onSent = resolve;
        res.status(outcome.status);
        for (const [k, v] of outcome.headers) {
          res.set(k, v.toString());
        }
        res.send(outcome.body === null ? { status: outcome.status } : outcome.body);
      });
    },
  };
}

app.all("*", async (req: express.Request, res: express.Response) => {
  await processRequest(normalizeExpressRequest(req), createExpressResponder(req, res));
});
```

- [ ] **Step 6: Run the full HTTP/1.x suites to prove the refactor is behavior-preserving**

Run: `bun test src/webhook-server/`
Expected: PASS — `index.spec.ts`, `https.spec.ts`, `handle-request.spec.ts` all green, including the two new tests. `https.spec.ts` still has its one `test.failing` for TLS info (which is expected to keep failing on the h1 path).

- [ ] **Step 7: Typecheck**

Run: `bun run compile`
Expected: no new errors vs. the `HEAD` baseline.

- [ ] **Step 8: Format and commit**

```bash
bun run format
git add src/webhook-server/tls-info.ts src/webhook-server/process-request.ts \
        src/webhook-server/index.ts src/webhook-server/index.spec.ts
git commit -m "claude: extract transport-agnostic request core from express handler"
```

---

### Task 3: Pure HTTP/2 header helpers

Pure functions, no I/O, no `node:http2` runtime import. Fast unit tests.

**Files:**
- Create: `src/webhook-server/http2/headers.ts`
- Create: `src/webhook-server/http2/headers.spec.ts`

**Interfaces:**
- Consumes: `KVList` from `@/util/kv-list`.
- Produces:
  - `type RawHeaders = Record<string, string | string[] | number | undefined>`
  - `normalizeHeaderValue(value: string | string[] | number | undefined): string | null`
  - `splitPseudoHeaders(headers: RawHeaders): { pseudo: KVList<string>; regular: KVList<string> }`
  - `stripForbiddenResponseHeaders(headers: KVList<string>): KVList<string>`
  - `parseHeadersFrameFlags(flags: number): { end_stream: boolean; end_headers: boolean }`
  - `FORBIDDEN_RESPONSE_HEADERS: ReadonlySet<string>`

- [ ] **Step 1: Write the failing test**

Create `src/webhook-server/http2/headers.spec.ts`:

```ts
import { describe, expect, test } from "bun:test";
import {
  normalizeHeaderValue,
  splitPseudoHeaders,
  stripForbiddenResponseHeaders,
  parseHeadersFrameFlags,
} from "@/webhook-server/http2/headers";

describe("normalizeHeaderValue", () => {
  test("passes strings through", () => {
    expect(normalizeHeaderValue("text/plain")).toBe("text/plain");
  });

  test("joins arrays with a comma and space (Node returns arrays; Bun pre-joins)", () => {
    expect(normalizeHeaderValue(["p", "q"])).toBe("p, q");
  });

  test("stringifies numbers", () => {
    expect(normalizeHeaderValue(42)).toBe("42");
  });

  test("returns null for undefined", () => {
    expect(normalizeHeaderValue(undefined)).toBeNull();
  });
});

describe("splitPseudoHeaders", () => {
  test("separates pseudo-headers from regular headers", () => {
    const { pseudo, regular } = splitPseudoHeaders({
      ":method": "POST",
      ":path": "/webhook?a=1",
      ":scheme": "https",
      ":authority": "localhost:3444",
      "content-type": "application/json",
      "user-agent": "test",
    });

    expect(pseudo).toEqual([
      [":method", "POST"],
      [":path", "/webhook?a=1"],
      [":scheme", "https"],
      [":authority", "localhost:3444"],
    ]);
    expect(regular).toEqual([
      ["content-type", "application/json"],
      ["user-agent", "test"],
    ]);
  });

  test("drops undefined values", () => {
    const { regular } = splitPseudoHeaders({ "x-a": undefined, "x-b": "1" });
    expect(regular).toEqual([["x-b", "1"]]);
  });

  test("normalizes multi-value regular headers", () => {
    const { regular } = splitPseudoHeaders({ "x-dup": ["p", "q"] });
    expect(regular).toEqual([["x-dup", "p, q"]]);
  });
});

describe("stripForbiddenResponseHeaders", () => {
  test("removes HTTP/2 connection-specific headers regardless of case", () => {
    const result = stripForbiddenResponseHeaders([
      ["Content-Type", "text/plain"],
      ["Connection", "keep-alive"],
      ["transfer-encoding", "chunked"],
      ["Keep-Alive", "timeout=5"],
      ["Upgrade", "h2c"],
      ["proxy-connection", "keep-alive"],
      ["x-custom", "kept"],
    ]);

    expect(result).toEqual([
      ["Content-Type", "text/plain"],
      ["x-custom", "kept"],
    ]);
  });
});

describe("parseHeadersFrameFlags", () => {
  test("flags=5 means END_STREAM + END_HEADERS (a GET with no body)", () => {
    expect(parseHeadersFrameFlags(5)).toEqual({ end_stream: true, end_headers: true });
  });

  test("flags=4 means END_HEADERS only (a POST with a body to follow)", () => {
    expect(parseHeadersFrameFlags(4)).toEqual({ end_stream: false, end_headers: true });
  });

  test("flags=0 means neither", () => {
    expect(parseHeadersFrameFlags(0)).toEqual({ end_stream: false, end_headers: false });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/webhook-server/http2/headers.spec.ts`
Expected: FAIL — `Cannot find module '@/webhook-server/http2/headers'`

- [ ] **Step 3: Implement the helpers**

Create `src/webhook-server/http2/headers.ts`:

```ts
import type { KVList } from "@/util/kv-list";

export type RawHeaders = Record<string, string | string[] | number | undefined>;

// AIDEV-NOTE: RFC 9113 section 8.2.2 -- connection-specific header fields are
// forbidden in HTTP/2. Node throws ERR_HTTP2_INVALID_CONNECTION_HEADERS on these;
// Bun silently forwards them, which produces a protocol-illegal response.
// Strip them so behavior is correct and identical on both runtimes.
export const FORBIDDEN_RESPONSE_HEADERS: ReadonlySet<string> = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-connection",
]);

export function normalizeHeaderValue(
  value: string | string[] | number | undefined,
): string | null {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return String(value);
  return value;
}

/**
 * Splits an HTTP/2 header object into pseudo-headers (`:method`, `:path`,
 * `:scheme`, `:authority`) and ordinary headers. Pseudo-headers are kept out of
 * `request_headers` so consumers (copy-as-curl, resend, user handlers) never see
 * `:method` as though it were an ordinary header.
 */
export function splitPseudoHeaders(headers: RawHeaders): {
  pseudo: KVList<string>;
  regular: KVList<string>;
} {
  const pseudo: KVList<string> = [];
  const regular: KVList<string> = [];

  // NOTE: Object.entries skips the `http2.sensitiveHeaders` symbol key.
  for (const [key, rawValue] of Object.entries(headers)) {
    const value = normalizeHeaderValue(rawValue);
    if (value === null) continue;
    if (key.startsWith(":")) {
      pseudo.push([key, value]);
    } else {
      regular.push([key, value]);
    }
  }

  return { pseudo, regular };
}

export function stripForbiddenResponseHeaders(headers: KVList<string>): KVList<string> {
  return headers.filter(([key]) => !FORBIDDEN_RESPONSE_HEADERS.has(key.toLowerCase()));
}

// NGHTTP2_FLAG_END_STREAM = 0x1, NGHTTP2_FLAG_END_HEADERS = 0x4
export function parseHeadersFrameFlags(flags: number): {
  end_stream: boolean;
  end_headers: boolean;
} {
  return {
    end_stream: (flags & 0x1) !== 0,
    end_headers: (flags & 0x4) !== 0,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/webhook-server/http2/headers.spec.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Format and commit**

```bash
bun run format
git add src/webhook-server/http2/headers.ts src/webhook-server/http2/headers.spec.ts
git commit -m "claude: add pure http/2 header helpers"
```

---

### Task 4: HTTP/2 server, stream handler, and metadata capture

**Files:**
- Create: `src/webhook-server/http2/metadata.ts`
- Create: `src/webhook-server/http2/stream-handler.ts`
- Create: `src/webhook-server/http2/server.ts`
- Create: `src/webhook-server/http2/server.spec.ts`
- Modify: `src/config.ts:54-70`
- Modify: `src/webhook-server/index.ts` (`WebhookServerOptions`, `WebhookServerResp`, `startWebhookServer`)
- Modify: `src/server.ts:44-60`
- Modify: `src/test-config.ts`
- Modify: `src/test-setup.ts`

**Interfaces:**
- Consumes: `processRequest`, `NormalizedRequest`, `Responder`, `EMPTY_SENT` (Task 2); `splitPseudoHeaders`, `stripForbiddenResponseHeaders`, `parseHeadersFrameFlags`, `normalizeHeaderValue` (Task 3); `Http2Info` (Task 1); `extractTlsInfo` (Task 2).
- Produces:
  - `extractHttp2Info(stream: ServerHttp2Stream, pseudoHeaders: KVList<string>, flags: number): Http2Info`
  - `handleHttp2Stream(stream: ServerHttp2Stream, headers: IncomingHttpHeaders, flags: number): void`
  - `startHttp2WebhookServer(options: { port: number; certPath: string; keyPath: string }): Promise<Http2SecureServer>`
  - `WebhookServerOptions` gains `http2: { enabled: boolean; port: number }`
  - `WebhookServerResp` gains `http2Server?: Http2SecureServer`
  - `TEST_H2_PORT` exported from `@/test-config`
  - Config: `WEBHOOK_H2_ENABLED`, `WEBHOOK_H2_PORT`, `PUBLIC_WEBHOOK_H2_PORT`

- [ ] **Step 1: Write the failing test**

Create `src/webhook-server/http2/server.spec.ts`:

```ts
import { getAllRequestEvents } from "@/request-events/model";
import { TEST_H2_PORT } from "@/test-config";
import { describe, expect, test } from "bun:test";
import http2 from "node:http2";

// AIDEV-NOTE: We use a raw node:http2 client rather than fetch() because Bun's
// fetch does not let us assert on HTTP/2-specific behavior (stream ids, pseudo-headers).
interface H2Result {
  status: number;
  body: string;
  headers: http2.IncomingHttpHeaders;
}

async function h2Request(
  path: string,
  options: { method?: string; body?: string; headers?: Record<string, string> } = {},
): Promise<H2Result> {
  const client = http2.connect(`https://localhost:${TEST_H2_PORT}`, {
    rejectUnauthorized: false,
  });

  try {
    return await new Promise<H2Result>((resolve, reject) => {
      const req = client.request({
        ":method": options.method ?? "GET",
        ":path": path,
        ...options.headers,
      });

      let body = "";
      let status = 0;
      let headers: http2.IncomingHttpHeaders = {};

      req.on("response", (h) => {
        status = Number(h[":status"]);
        headers = h;
      });
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => resolve({ status, body, headers }));
      req.on("error", reject);

      if (options.body) req.end(options.body);
      else req.end();
    });
  } finally {
    client.close();
  }
}

describe("HTTP/2 webhook server", () => {
  test("GET request returns a response and is recorded", async () => {
    const result = await h2Request("/h2-get?a=1&b=two");
    expect(result.status).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ status: 200 });

    const event = getAllRequestEvents().find((e) => e.request_url === "/h2-get");
    expect(event).toBeDefined();
    expect(event?.request_method).toBe("GET");
    expect(event?.request_query_params).toEqual([
      ["a", "1"],
      ["b", "two"],
    ]);
  });

  test("POST request body is captured", async () => {
    const result = await h2Request("/h2-post", { method: "POST", body: "hello-body" });
    expect(result.status).toBe(200);

    const event = getAllRequestEvents().find((e) => e.request_url === "/h2-post");
    expect(event).toBeDefined();
    expect(Buffer.from(event!.request_body!, "base64").toString()).toBe("hello-body");
  });

  test("records http_version 2.0", async () => {
    await h2Request("/h2-version");
    const event = getAllRequestEvents().find((e) => e.request_url === "/h2-version");
    expect(event?.http_version).toBe("2.0");
  });

  test("captures http2_info with stream id, alpn, settings and frame flags", async () => {
    await h2Request("/h2-info");
    const event = getAllRequestEvents().find((e) => e.request_url === "/h2-info");

    const info = event?.http2_info;
    expect(info).toBeDefined();
    expect(info?.alpn_protocol).toBe("h2");
    expect(info?.stream_id).toBeGreaterThan(0);
    expect(typeof info?.weight).toBe("number");
    // A GET with no body sets END_STREAM on the HEADERS frame.
    expect(info?.headers_frame_flags).toEqual({ end_stream: true, end_headers: true });
    expect(info?.local_settings.maxConcurrentStreams).toBeGreaterThan(0);
    expect(info?.remote_settings.initialWindowSize).toBeGreaterThan(0);
  });

  test("captures pseudo-headers and strips them from request_headers", async () => {
    await h2Request("/h2-pseudo", { method: "POST", body: "x" });
    const event = getAllRequestEvents().find((e) => e.request_url === "/h2-pseudo");

    const pseudo = event?.http2_info?.pseudo_headers ?? [];
    expect(pseudo).toContainEqual([":method", "POST"]);
    expect(pseudo).toContainEqual([":scheme", "https"]);
    expect(pseudo.find(([k]) => k === ":path")?.[1]).toBe("/h2-pseudo");

    const headerNames = (event?.request_headers ?? []).map(([k]) => k);
    expect(headerNames.some((k) => k.startsWith(":"))).toBe(false);
  });

  test("captures TLS info on the HTTP/2 path", async () => {
    // AIDEV-NOTE: This PASSES, unlike the equivalent HTTP/1 test in https.spec.ts
    // which is marked test.failing due to https://github.com/oven-sh/bun/issues/16834
    await h2Request("/h2-tls");
    const event = getAllRequestEvents().find((e) => e.request_url === "/h2-tls");

    expect(event?.tls_info).toBeDefined();
    expect(event?.tls_info).not.toBeNull();
    expect(event?.tls_info?.protocol).toMatch(/^TLSv1/);
    expect(event?.tls_info?.cipher?.name).toBeTruthy();
  });

  test("runs the handler chain and returns its response", async () => {
    createHandler({
      id: randomUUID(),
      version_id: "1",
      name: "h2 handler",
      method: "GET",
      path: "/h2-handler",
      code: `resp.status = 201; resp.body = { ok: true };`,
      order: 0,
    });

    const result = await h2Request("/h2-handler");
    expect(result.status).toBe(201);
    expect(JSON.parse(result.body)).toEqual({ ok: true });

    const event = getAllRequestEvents().find((e) => e.request_url === "/h2-handler");
    expect(event?.response_status).toBe(201);
  });

  test("response_status_message is null because HTTP/2 has no reason phrase", async () => {
    await h2Request("/h2-no-reason");
    const event = getAllRequestEvents().find((e) => e.request_url === "/h2-no-reason");
    expect(event?.status).toBe("complete");
    expect(event?.response_status).toBe(200);
    expect(event?.response_status_message ?? null).toBeNull();
  });

  test("strips connection-specific response headers set by a handler", async () => {
    createHandler({
      id: randomUUID(),
      version_id: "1",
      name: "forbidden headers",
      method: "GET",
      path: "/h2-forbidden",
      code: `
        resp.headers.push(["connection", "keep-alive"]);
        resp.headers.push(["transfer-encoding", "chunked"]);
        resp.headers.push(["x-kept", "yes"]);
        resp.body = "ok";
      `,
      order: 0,
    });

    const result = await h2Request("/h2-forbidden");
    expect(result.status).toBe(200);
    expect(result.headers["x-kept"]).toBe("yes");
    expect(result.headers["connection"]).toBeUndefined();
    expect(result.headers["transfer-encoding"]).toBeUndefined();

    const event = getAllRequestEvents().find((e) => e.request_url === "/h2-forbidden");
    const names = (event?.response_headers ?? []).map(([k]) => k.toLowerCase());
    expect(names).not.toContain("connection");
    expect(names).toContain("x-kept");
  });
});
```

`createHandler` requires **all** of `id`, `version_id`, `name`, `code`, `path`, `method`, `order` (see `src/handlers/schema.ts`). Omitting `version_id` throws a Zod validation error. Add these imports to the top of the file alongside the others:

```ts
import { createHandler } from "@/handlers/model";
import { randomUUID } from "@/util/uuid";
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/webhook-server/http2/server.spec.ts`
Expected: FAIL — `Export named 'TEST_H2_PORT' not found in module '@/test-config'`

- [ ] **Step 3: Add configuration**

In `src/config.ts`, after the `PUBLIC_WEBHOOK_SSL_PORT` block (around line 63), add:

```ts
// HTTP/2 Configuration
// AIDEV-NOTE: HTTP/2 needs its own TLS port because Bun cannot serve HTTP/1.1 and
// HTTP/2 on one port: allowHTTP1 is ignored and ALPN advertises only h2.
// See https://github.com/oven-sh/bun/issues/26721
// This is independent of WTT_WEBHOOK_SSL_ENABLED, but still requires a certificate.
export const WEBHOOK_H2_ENABLED = process.env.WTT_WEBHOOK_H2_ENABLED === "true";
export const WEBHOOK_H2_PORT = parseInt(process.env.WTT_WEBHOOK_H2_PORT || "3444", 10);
export const PUBLIC_WEBHOOK_H2_PORT = process.env.WTT_PUBLIC_WEBHOOK_H2_PORT
  ? parseInt(process.env.WTT_PUBLIC_WEBHOOK_H2_PORT, 10)
  : undefined;
```

- [ ] **Step 4: Implement metadata extraction**

Create `src/webhook-server/http2/metadata.ts`:

```ts
import "@/server-only";
import type { ServerHttp2Stream } from "node:http2";
import type { Http2Info, Http2Settings } from "@/request-events/http2-info";
import type { KVList } from "@/util/kv-list";
import { parseHeadersFrameFlags } from "./headers";

interface RawSettings {
  headerTableSize?: number;
  enablePush?: boolean;
  initialWindowSize?: number;
  maxConcurrentStreams?: number;
  maxFrameSize?: number;
  maxHeaderListSize?: number;
  enableConnectProtocol?: boolean;
}

interface AlpnSession {
  alpnProtocol?: string;
}

function toSettings(raw: RawSettings | undefined): Http2Settings {
  return {
    headerTableSize: raw?.headerTableSize ?? null,
    enablePush: raw?.enablePush ?? null,
    initialWindowSize: raw?.initialWindowSize ?? null,
    maxConcurrentStreams: raw?.maxConcurrentStreams ?? null,
    maxFrameSize: raw?.maxFrameSize ?? null,
    maxHeaderListSize: raw?.maxHeaderListSize ?? null,
    enableConnectProtocol: raw?.enableConnectProtocol ?? null,
  };
}

export function extractHttp2Info(
  stream: ServerHttp2Stream,
  pseudoHeaders: KVList<string>,
  flags: number,
): Http2Info {
  const session = stream.session;
  const alpn = (session as unknown as AlpnSession | undefined)?.alpnProtocol;

  return {
    alpn_protocol: alpn ?? "h2",
    stream_id: stream.id ?? 0,
    pseudo_headers: pseudoHeaders,
    weight: stream.state?.weight ?? null,
    headers_frame_flags: parseHeadersFrameFlags(flags),
    local_settings: toSettings(session?.localSettings),
    remote_settings: toSettings(session?.remoteSettings),
  };
}
```

- [ ] **Step 5: Implement the stream handler**

Create `src/webhook-server/http2/stream-handler.ts`:

```ts
import "@/server-only";
import http2, { type ServerHttp2Stream, type IncomingHttpHeaders } from "node:http2";
import { EXCLUDE_HEADER_MAP } from "@/config";
import { fromBufferLike } from "@/util/base64";
import type { HttpMethod } from "@/util/http";
import { extractTlsInfo } from "../tls-info";
import {
  processRequest,
  EMPTY_SENT,
  type NormalizedRequest,
  type Responder,
} from "../process-request";
import { extractHttp2Info } from "./metadata";
import { splitPseudoHeaders, stripForbiddenResponseHeaders } from "./headers";

function createHttp2Responder(stream: ServerHttp2Stream): Responder {
  return {
    send(outcome) {
      return new Promise((resolve) => {
        if (stream.destroyed) {
          resolve(EMPTY_SENT);
          return;
        }

        // The "abort" and "raw" outcomes are implemented in Task 5, test-first.
        // Until then they surface as an error rather than silently doing nothing;
        // handleHttp2Stream's .catch resets the stream.
        if (outcome.kind !== "http") {
          throw new Error(
            `Unsupported HTTP/2 response outcome: ${outcome.kind}`,
          );
        }

        const headers = stripForbiddenResponseHeaders(outcome.headers);
        const body =
          outcome.body === null
            ? Buffer.from(JSON.stringify({ status: outcome.status }))
            : outcome.body;

        const responseHeaders: Record<string, string> = {};
        for (const [key, value] of headers) {
          responseHeaders[key] = value.toString();
        }
        if (outcome.body === null && !hasContentType(headers)) {
          responseHeaders["content-type"] = "application/json";
        }

        stream.respond({ ":status": outcome.status, ...responseHeaders });
        stream.end(body, () => {
          resolve({
            status: outcome.status,
            // HTTP/2 carries no status reason phrase.
            statusMessage: null,
            // Record what was ACTUALLY sent (including any content-type we added),
            // mirroring the fidelity the Express adapter gets from its res.end hook.
            headers: Object.entries(responseHeaders),
            body,
          });
        });
      });
    },
  };
}

function hasContentType(headers: [string, string][]): boolean {
  return headers.some(([key]) => key.toLowerCase() === "content-type");
}

function normalizeHttp2Request(
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders,
  flags: number,
  body: Buffer,
): NormalizedRequest {
  const { pseudo, regular } = splitPseudoHeaders(headers);

  const filtered = regular.filter(([key]) => !EXCLUDE_HEADER_MAP[key]);

  const rawPath = pseudo.find(([key]) => key === ":path")?.[1] ?? "/";
  const authority = pseudo.find(([key]) => key === ":authority")?.[1] ?? "localhost";
  const method = (pseudo.find(([key]) => key === ":method")?.[1] ?? "GET") as HttpMethod;

  const url = new URL(rawPath, `https://${authority}`);

  return {
    method,
    url: url.pathname,
    headers: filtered,
    queryParams: [...url.searchParams.entries()],
    body: body.length > 0 ? fromBufferLike(body) : null,
    httpVersion: "2.0",
    tlsInfo: extractTlsInfo(stream.session?.socket),
    http2Info: extractHttp2Info(stream, pseudo, flags),
  };
}

export function handleHttp2Stream(
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders,
  flags: number,
): void {
  const chunks: Buffer[] = [];

  stream.on("error", (err) => {
    console.error("HTTP/2 stream error:", err);
  });

  stream.on("data", (chunk: Buffer) => {
    chunks.push(Buffer.from(chunk));
  });

  // AIDEV-NOTE: 'end' fires for GET/HEAD/empty-POST too (END_STREAM on HEADERS),
  // so it is always safe to wait for it before processing.
  stream.on("end", () => {
    const body = Buffer.concat(chunks);
    const normalized = normalizeHttp2Request(stream, headers, flags, body);

    processRequest(normalized, createHttp2Responder(stream)).catch((err) => {
      console.error("Error processing HTTP/2 request:", err);
      if (!stream.destroyed) {
        stream.close(http2.constants.NGHTTP2_INTERNAL_ERROR);
      }
    });
  });
}
```

- [ ] **Step 6: Implement the server bootstrap**

Create `src/webhook-server/http2/server.ts`:

```ts
import "@/server-only";
import http2, { type Http2SecureServer } from "node:http2";
import fs from "fs";
import { ACME_ENABLED } from "@/config";
import { acmeManager } from "@/acme-manager";
import { handleHttp2Stream } from "./stream-handler";

export interface Http2ServerOptions {
  port: number;
  certPath: string;
  keyPath: string;
}

export async function startHttp2WebhookServer({
  port,
  certPath,
  keyPath,
}: Http2ServerOptions): Promise<Http2SecureServer> {
  let credentials: { key: string | Buffer; cert: string | Buffer };

  if (ACME_ENABLED) {
    await acmeManager.initialize();
    const certInfo = await acmeManager.obtainCertificate();
    credentials = { key: certInfo.privateKey, cert: certInfo.certificate };
  } else {
    credentials = { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
  }

  // AIDEV-NOTE: `allowHTTP1` is pinned to false on purpose.
  //  1. Bun ignores `allowHTTP1: true` and advertises only `h2` via ALPN
  //     (https://github.com/oven-sh/bun/issues/26721), so HTTP/1.1 clients get a
  //     TLS "no application protocol" alert. That is why HTTP/2 lives on its own
  //     port instead of sharing the HTTPS port. If that bug is fixed, the ports
  //     could be merged.
  //  2. Pinning it false makes this listener behave identically on Bun and Node.
  //
  // AIDEV-NOTE: NEVER attach a 'request' listener to this server. Bun emits BOTH
  // 'stream' and 'request' for a single HTTP/2 request, so a second listener would
  // race the stream handler, respond first, and trigger ERR_HTTP2_INVALID_STREAM.
  const server = http2.createSecureServer({
    ...credentials,
    allowHTTP1: false,
  });

  server.on("stream", handleHttp2Stream);
  server.on("error", (err) => console.error("HTTP/2 server error:", err));

  return new Promise<Http2SecureServer>((resolve) => {
    server.listen(port, () => {
      console.log(`HTTP/2 webhook server listening on port ${port}`);
      resolve(server);
    });
  });
}
```

- [ ] **Step 7: Wire the h2 server into `startWebhookServer`**

In `src/webhook-server/index.ts`, extend the options and response types and start the server. Add the import:

```ts
import type { Http2SecureServer } from "node:http2";
import { startHttp2WebhookServer } from "./http2/server";
```

Change the interfaces:

```ts
export interface WebhookServerOptions {
  port: number;
  ssl: {
    enabled: boolean;
    keyPath: string;
    certPath: string;
    port: number;
  };
  http2?: {
    enabled: boolean;
    port: number;
  };
}

export interface WebhookServerResp {
  server: http.Server;
  httpsServer?: https.Server;
  http2Server?: Http2SecureServer;
}
```

Inside `startWebhookServer`, immediately after `const server: http.Server = app.listen(...)`, add:

```ts
    let http2Server: Http2SecureServer | undefined;
    if (http2?.enabled) {
      try {
        http2Server = await startHttp2WebhookServer({
          port: http2.port,
          certPath: ssl.certPath,
          keyPath: ssl.keyPath,
        });
      } catch (err) {
        console.error("Failed to start HTTP/2 server:", err);
      }
    }
```

Destructure `http2` in the signature (`{ port, ssl, http2 }`) and include `http2Server` in **every** `resolve({ ... })` call in that function (there are four).

- [ ] **Step 8: Start the h2 server from `src/server.ts`**

In `src/server.ts`, add `WEBHOOK_H2_ENABLED` and `WEBHOOK_H2_PORT` to the `@/config` import list.

Update the self-signed cert bootstrap condition (currently line ~45) so enabling h2 alone still produces a certificate:

```ts
if (
  ((WEBHOOK_SSL_ENABLED || WEBHOOK_H2_ENABLED) && !ACME_ENABLED) ||
  DASHBOARD_SSL_ENABLED
) {
  await assertGeneratedSelfSignedCert(SSL_CERT_PATH, SSL_KEY_PATH);
}
```

And pass the new option to `startWebhookServer`:

```ts
const webhookServer = await startWebhookServer({
  port: WEBHOOK_PORT,
  ssl: {
    enabled: WEBHOOK_SSL_ENABLED,
    certPath: SSL_CERT_PATH,
    keyPath: SSL_KEY_PATH,
    port: WEBHOOK_SSL_PORT,
  },
  http2: {
    enabled: WEBHOOK_H2_ENABLED,
    port: WEBHOOK_H2_PORT,
  },
});
```

- [ ] **Step 9: Wire the test harness**

In `src/test-config.ts`, request a third port:

```ts
export const [TEST_PORT, TEST_SSL_PORT, TEST_H2_PORT] = await findAvailablePorts(
  4000,
  5000,
  3,
);
```

In `src/test-setup.ts`, import `TEST_H2_PORT` and `Http2SecureServer`, declare `let http2Server: Http2SecureServer | undefined;`, pass the option, and close it:

```ts
  ({ server, httpsServer, http2Server } = await startWebhookServer({
    port: TEST_PORT,
    ssl: {
      enabled: true,
      port: TEST_SSL_PORT,
      certPath: TEST_CERT_PATH,
      keyPath: TEST_KEY_PATH,
    },
    http2: {
      enabled: true,
      port: TEST_H2_PORT,
    },
  }));
```

```ts
afterAll(async () => {
  server.close();
  httpsServer?.close();
  http2Server?.close();
  // Leave the existing commented-out certificate cleanup block exactly as it is.
});
```

- [ ] **Step 10: Run the HTTP/2 tests**

Run: `bun test src/webhook-server/http2/server.spec.ts`
Expected: PASS (9 tests). In particular `captures TLS info on the HTTP/2 path` passes, proving `tls_info` is populated for the first time.

- [ ] **Step 11: Run the whole suite and typecheck**

Run: `bun test`
Expected: PASS, no regressions in `index.spec.ts` / `https.spec.ts` / `handle-request.spec.ts`.

Run: `bun run compile`
Expected: no new errors vs. the `HEAD` baseline.

- [ ] **Step 12: Format and commit**

```bash
bun run format
git add src/webhook-server/http2/ src/config.ts src/webhook-server/index.ts \
        src/server.ts src/test-config.ts src/test-setup.ts
git commit -m "claude: serve http/2 webhook requests on a dedicated tls port"
```

---

### Task 5: HTTP/2 abort and raw-socket handling

Strict TDD: Task 4 deliberately left `abort` and `raw` unimplemented (its responder throws on any non-`http` outcome). Write the failing tests first, then implement the two branches.

**Files:**
- Modify: `src/webhook-server/http2/server.spec.ts` (append a `describe` block)
- Modify: `src/webhook-server/http2/stream-handler.ts` (`createHttp2Responder`)

**Interfaces:**
- Consumes: everything from Task 4; `createHandler` from `@/handlers/model`; `randomUUID` from `@/util/uuid` (both already imported by Task 4).
- Produces: nothing new.

`createHandler` requires **all** of `id`, `version_id`, `name`, `code`, `path`, `method`, `order` (see `src/handlers/schema.ts`). Omitting `version_id` throws a Zod validation error.

`AbortSocketError` is available inside handler code: `handle-request.ts` spreads `HandlerErrors` into the VM context.

- [ ] **Step 1: Write the failing tests**

Append to `src/webhook-server/http2/server.spec.ts`:

```ts
describe("HTTP/2 abort and raw-socket handling", () => {
  test("AbortSocketError resets the stream and records a null response", async () => {
    createHandler({
      id: randomUUID(),
      version_id: "1",
      name: "abort",
      method: "GET",
      path: "/h2-abort",
      code: `throw new AbortSocketError("nope");`,
      order: 0,
    });

    // The client sees the stream reset (RST_STREAM), so the request rejects.
    await expect(h2Request("/h2-abort")).rejects.toThrow();

    // Give the server a tick to persist the completed event.
    await new Promise((r) => setTimeout(r, 100));

    const event = getAllRequestEvents().find((e) => e.request_url === "/h2-abort");
    expect(event).toBeDefined();
    expect(event?.status).toBe("complete");
    expect(event?.response_status ?? null).toBeNull();
    expect(event?.response_body ?? null).toBeNull();
  });

  test("resp.socket raw writes are unsupported over HTTP/2 and reset the stream", async () => {
    createHandler({
      id: randomUUID(),
      version_id: "1",
      name: "raw socket",
      method: "GET",
      path: "/h2-raw",
      code: `resp.socket = "HTTP/1.1 200 OK\\r\\n\\r\\nraw";`,
      order: 0,
    });

    await expect(h2Request("/h2-raw")).rejects.toThrow();
    await new Promise((r) => setTimeout(r, 100));

    const event = getAllRequestEvents().find((e) => e.request_url === "/h2-raw");
    expect(event).toBeDefined();
    expect(event?.status).toBe("complete");
    expect(event?.response_status ?? null).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test src/webhook-server/http2/server.spec.ts -t "abort and raw-socket"`
Expected: FAIL (2 tests).

The stream does get reset (because Task 4's responder throws `Unsupported HTTP/2 response outcome` and `handleHttp2Stream`'s `.catch` calls `stream.close(NGHTTP2_INTERNAL_ERROR)`), so `rejects.toThrow()` may pass. The assertions on the persisted event are what fail: `processRequest` never reaches `updateRequestEvent`, so `event.status` is still `"running"`, not `"complete"`.

Confirm the failure message mentions `expected "complete", got "running"`. If instead you see `event` is `undefined`, the handler never ran — fix that before proceeding.

- [ ] **Step 3: Implement the two branches**

In `src/webhook-server/http2/stream-handler.ts`, replace the `if (outcome.kind !== "http")` throw inside `createHttp2Responder` with the real handling:

```ts
        // AIDEV-NOTE: HTTP/2 analog of destroying the socket: reset the stream.
        if (outcome.kind === "abort") {
          stream.close(http2.constants.NGHTTP2_CANCEL);
          resolve(EMPTY_SENT);
          return;
        }

        // AIDEV-NOTE: `resp.socket` writes raw bytes bypassing HTTP. That is
        // impossible on HTTP/2 without corrupting the connection's binary framing,
        // so we fail loudly rather than silently ignoring the handler's instruction.
        if (outcome.kind === "raw") {
          console.error(
            "resp.socket (raw socket writes) is not supported over HTTP/2; resetting stream",
          );
          stream.close(http2.constants.NGHTTP2_INTERNAL_ERROR);
          resolve(EMPTY_SENT);
          return;
        }
```

Both branches `resolve(EMPTY_SENT)` rather than rejecting, so `processRequest` still runs `updateRequestEvent` and records the event as `complete` with a null response — matching how the Express adapter handles the same two outcomes.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/webhook-server/http2/server.spec.ts`
Expected: PASS (11 tests in this file).

- [ ] **Step 5: Run the full suite and typecheck**

Run: `bun test`
Expected: PASS, no regressions.

Run: `bun run compile`
Expected: no new errors vs. the baseline.

- [ ] **Step 6: Format and commit**

```bash
bun run format
git add src/webhook-server/http2/server.spec.ts src/webhook-server/http2/stream-handler.ts
git commit -m "claude: handle abort and raw-socket outcomes over http/2"
```

---

### Task 6: Request event viewer — HTTP/2 and TLS sections

There are no component tests in this repo, so verification is a typecheck plus driving the real app.

**Files:**
- Create: `src/components/display/http2-info-section.tsx`
- Create: `src/components/display/tls-info-section.tsx`
- Modify: `src/components/request-event-display.tsx`
- Modify: `src/components/request-sidebar.tsx:263-276`

**Interfaces:**
- Consumes: `Http2Info` (Task 1), `RequestEvent`, existing `DataSection`, `HeadersTable`, `Badge`, `Table` components.
- Produces: `<Http2InfoSection info={...} />`, `<TlsInfoSection info={...} />`

- [ ] **Step 1: Create the HTTP/2 section component**

Create `src/components/display/http2-info-section.tsx`:

```tsx
import { DataSection } from "@/components/data-section";
import { HeadersTable } from "@/components/display/headers-table";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Http2Info, Http2Settings } from "@/request-events/http2-info";

const SETTING_KEYS: (keyof Http2Settings)[] = [
  "headerTableSize",
  "enablePush",
  "initialWindowSize",
  "maxConcurrentStreams",
  "maxFrameSize",
  "maxHeaderListSize",
  "enableConnectProtocol",
];

function formatSetting(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

interface Http2InfoSectionProps {
  info: Http2Info;
}

export function Http2InfoSection({ info }: Http2InfoSectionProps) {
  return (
    <DataSection title="HTTP/2">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">ALPN: {info.alpn_protocol}</Badge>
          <Badge variant="outline">Stream {info.stream_id}</Badge>
          {typeof info.weight === "number" && (
            <Badge variant="outline">Weight {info.weight}</Badge>
          )}
          {info.headers_frame_flags.end_stream && <Badge>END_STREAM</Badge>}
          {info.headers_frame_flags.end_headers && <Badge>END_HEADERS</Badge>}
        </div>

        <HeadersTable
          headers={info.pseudo_headers}
          title="Pseudo-headers"
          showAuthInspector={false}
        />

        <div>
          <h4 className="font-medium mb-2">Settings</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setting</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Remote</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SETTING_KEYS.map((key) => (
                <TableRow key={key}>
                  <TableCell className="font-mono text-xs">{key}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {formatSetting(info.local_settings[key])}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {formatSetting(info.remote_settings[key])}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DataSection>
  );
}
```

Note: `HeadersTable` returns `null` when `headers.length === 0`, and it title-cases names via `headerNameDisplay`. Pseudo-header names begin with `:` so they render as `:Method` etc. That is acceptable; do not modify `headerNameDisplay`.

- [ ] **Step 2: Create the TLS section component**

Create `src/components/display/tls-info-section.tsx`:

```tsx
import { DataSection } from "@/components/data-section";
import { Badge } from "@/components/ui/badge";
import type { TLSInfo } from "@/request-events/schema";

interface TlsInfoSectionProps {
  info: TLSInfo;
}

export function TlsInfoSection({ info }: TlsInfoSectionProps) {
  const cert = info.peerCertificate;

  return (
    <DataSection title="TLS">
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          {info.protocol && <Badge variant="secondary">{info.protocol}</Badge>}
          {info.cipher?.name && <Badge variant="outline">{info.cipher.name}</Badge>}
          {info.isSessionReused && <Badge variant="outline">Session reused</Badge>}
        </div>

        {cert && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium">Valid from:</span>
              <span className="ml-2 font-mono text-xs">{cert.valid_from ?? "—"}</span>
            </div>
            <div>
              <span className="font-medium">Valid to:</span>
              <span className="ml-2 font-mono text-xs">{cert.valid_to ?? "—"}</span>
            </div>
            <div className="col-span-2">
              <span className="font-medium">Fingerprint:</span>
              <span className="ml-2 font-mono text-xs break-all">
                {cert.fingerprint ?? "—"}
              </span>
            </div>
          </div>
        )}
      </div>
    </DataSection>
  );
}
```

- [ ] **Step 3: Render the sections and the protocol badge in the detail view**

In `src/components/request-event-display.tsx`, add imports:

```tsx
import { Http2InfoSection } from "@/components/display/http2-info-section";
import { TlsInfoSection } from "@/components/display/tls-info-section";
import { Badge } from "@/components/ui/badge";
```

Add the protocol badge to the `CardTitle`, right after `<StatusBadge status={request.status} />`:

```tsx
            {request.http_version && (
              <Badge variant="outline">HTTP/{request.http_version}</Badge>
            )}
```

Then, immediately after `{children}` and before the `<TwoPaneLayout ...>`, add:

```tsx
      {request.http2_info && <Http2InfoSection info={request.http2_info} />}
      {request.tls_info && <TlsInfoSection info={request.tls_info} />}
```

- [ ] **Step 4: Add the protocol badge to the sidebar rows**

In `src/components/request-sidebar.tsx`, add `import { Badge } from "@/components/ui/badge";` and, inside the first row `<div className="flex w-full items-center gap-2">` (after the `request_method` span), add:

```tsx
                          {request.http_version === "2.0" && (
                            <Badge variant="outline" className="px-1 py-0 text-[10px]">
                              H2
                            </Badge>
                          )}
```

Only h2 gets a badge — badging every HTTP/1.1 row would be noise.

- [ ] **Step 5: Typecheck**

Run: `bun run compile`
Expected: no new errors vs. the `HEAD` baseline. `request.http2_info` must be typed (this is why `Http2Info` was added to the `RequestEvent` interface in Task 1 Step 6).

- [ ] **Step 6: Verify in the real app**

```bash
WTT_WEBHOOK_H2_ENABLED=true bun run dev
```

In another terminal, send a real HTTP/2 request:

```bash
curl -sk --http2 -X POST -H 'content-type: application/json' \
     -d '{"hello":"h2"}' https://localhost:3444/h2-demo -w '\n[HTTP/%{http_version}]\n'
```

Expected: `[HTTP/2]`. Open the dashboard at `http://localhost:3001`, click the `/h2-demo` request, and confirm:
- an `H2` badge on the sidebar row and an `HTTP/2.0` badge on the detail header,
- an **HTTP/2** section showing ALPN `h2`, a stream ID, weight, `END_HEADERS`, pseudo-headers, and the settings table,
- a **TLS** section showing `TLSv1.3` and a cipher name,
- no `:method`/`:path` entries in the request Headers table.

- [ ] **Step 7: Format and commit**

```bash
bun run format
git add src/components/display/http2-info-section.tsx \
        src/components/display/tls-info-section.tsx \
        src/components/request-event-display.tsx src/components/request-sidebar.tsx
git commit -m "claude: display http/2 and tls details in the request event viewer"
```

---

### Task 7: Documentation

**Files:**
- Modify: `README.md` (env var table, after the `WTT_PUBLIC_WEBHOOK_SSL_PORT` row, ~line 149)
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Document the environment variables**

Add these three rows to the README env var table, immediately after the `WTT_PUBLIC_WEBHOOK_SSL_PORT` row:

```markdown
| `WTT_WEBHOOK_H2_ENABLED` | `"false"` | Set to `"true"` to enable the HTTP/2 (`h2` over TLS) webhook server. Requires a certificate, but does not require `WTT_WEBHOOK_SSL_ENABLED`. HTTP/2 listens on its own port because Bun cannot serve HTTP/1.1 and HTTP/2 on a single TLS port ([bun#26721](https://github.com/oven-sh/bun/issues/26721)). |
| `WTT_WEBHOOK_H2_PORT` | `"3444"` | Port used for the HTTP/2 webhook server. |
| `WTT_PUBLIC_WEBHOOK_H2_PORT` | `""` | Public-facing port for incoming HTTP/2 requests (used if WTT is deployed behind a reverse proxy that changes the port). Only affects documentation and generated URLs. |
```

- [ ] **Step 2: Add a changelog entry**

Follow the existing `CHANGELOG.md` format (read the top of the file first and match its heading style). Add an "Unreleased" entry:

```markdown
### Added

- HTTP/2 (`h2` over TLS) support for the webhook server, on a dedicated port
  (`WTT_WEBHOOK_H2_PORT`, default `3444`), enabled with `WTT_WEBHOOK_H2_ENABLED`.
- The request event viewer now shows an HTTP/2 section (ALPN, stream ID, weight,
  HEADERS frame flags, pseudo-headers, and local/remote SETTINGS).
- The request event viewer now shows a TLS section. TLS details are captured on the
  HTTP/2 path; they remain unavailable on the HTTP/1 path under Bun
  ([bun#16834](https://github.com/oven-sh/bun/issues/16834)).
- Request events now record `http_version`, shown as a badge in the request list.
```

- [ ] **Step 3: Final verification**

Run: `bun test`
Expected: PASS

Run: `bun run compile`
Expected: no new errors vs. the `HEAD` baseline.

- [ ] **Step 4: Format and commit**

```bash
bun run format
git add README.md CHANGELOG.md
git commit -m "claude: document http/2 webhook server configuration"
```

---

## Out of scope (do not build)

- `h2c` (cleartext HTTP/2), prior-knowledge or `Upgrade`-based.
- HTTP/2 for outbound requests (`send-request.ts`) or the TCP server.
- Server push.
- **The frame log.** Phase 2. Do not add a `frames` field, an `Http2Frame` type, or a
  frame parser. The only phase-1 obligation is that `http2InfoSchema` stays non-strict,
  which Task 1 covers with a dedicated test.

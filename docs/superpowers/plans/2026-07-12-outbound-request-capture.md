# Outbound Request Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture external ("outbound") test requests as `outbound` request events (from both the dashboard and the MCP tool), remove the inline response panel, and mark outbound events in the UI.

**Architecture:** A new server-only `captureOutboundRequest` mirrors the inbound `processRequest` lifecycle (create a `running` event → fetch → update to `complete` with the response, or `error` on failure), emitting the SSE events that refresh the sidebar. The dashboard send route and the MCP tool both route external sends through it; internal sends keep looping back through the local webhook server (captured as `inbound`). The dashboard drops `HttpResponseView` and relies on the request log. A small "Outbound" badge distinguishes the two event types.

**Tech Stack:** Bun, TypeScript, Zod v4 (`zod/v4`), React + react-hook-form, shadcn/ui, `bun:test`, `@modelcontextprotocol/sdk`.

## Global Constraints

- Package management: edit `package.json` + `bun install`; never `bun add`. No new dependencies are needed.
- Compile with `bun run compile` (never `bunx tsc`). Format with `bun run format`. Run tests with `bun test <path>`.
- `bun run compile` has a **known baseline** of 17 errors across 4 pre-existing files: `tests/contract/cli-admin.test.ts` (12), `tests/unit/cli-admin/io.test.ts` (3), `src/db/controller.ts` (1), `src/util/hmac.ts` (1). Only *new* errors in files you touch are failures.
- Never use `any` to fix a TypeScript error. (Existing `as any` mock-req objects in `controller.spec.ts` and the `zodResolver(requestSchema as any)` cast in the page are established patterns you may keep; introduce no new ones.)
- Use Zod for parsing external/user input.
- shadcn/ui: use existing components; never edit `src/components/ui/` or `src/util/ui.ts`. Tailwind classes for styling.
- Tests: no mocks/stubs of the code under test. DB is reset between tests automatically. Use `randomUUID` from `@/util/uuid` and `parseBase64` from `@/util/base64` for branded test values.
- Environment: port 3000 is occupied by a running dev server; there is no DOM/browser test environment, so React components are verified by `bun run compile` + review, not render tests.
- Commit messages are prefixed with `claude: `.

---

### Task 1: `captureOutboundRequest` — shared outbound capture

**Files:**
- Create: `src/webhook-server/capture-outbound-request.ts`
- Test: `src/webhook-server/capture-outbound-request.spec.ts`

**Interfaces:**
- Consumes: `sendWebhookRequest` and `requestSchema`/`HandlerRequest` from `src/webhook-server/`; `createRequestEvent`/`updateRequestEvent` from `@/request-events/model`; `appEvents` from `@/db/events`.
- Produces: `captureOutboundRequest(request: HandlerRequest): Promise<{ event: RequestEvent; response: Response | null; body: string | null }>`. On success `response` is the fetch `Response` and `body` is the base64 response body; on a fetch failure both are `null` and the event is persisted with `status: "error"`.

- [ ] **Step 1: Write the failing test**

Create `src/webhook-server/capture-outbound-request.spec.ts`:

```ts
import { describe, test, expect, afterAll } from "bun:test";
import { captureOutboundRequest } from "./capture-outbound-request";
import { getRequestEvent } from "@/request-events/model";
import type { HandlerRequest } from "./schema";

describe("captureOutboundRequest", () => {
  const server = Bun.serve({
    port: 0,
    fetch: () =>
      new Response("pong", { status: 201, headers: { "x-echo": "1" } }),
  });
  afterAll(() => server.stop(true));

  test("creates a complete outbound event with the response", async () => {
    const request: HandlerRequest = {
      method: "POST",
      url: `http://localhost:${server.port}/target`,
      external: true,
      headers: [["x-test", "abc"]],
      query: [["q", "1"]],
      body: Buffer.from("hello").toString("base64"),
    };
    const { event, response, body } = await captureOutboundRequest(request);

    expect(response).not.toBeNull();
    expect(response!.status).toBe(201);
    expect(Buffer.from(body!, "base64").toString()).toBe("pong");

    const stored = getRequestEvent(event.id);
    expect(stored.type).toBe("outbound");
    expect(stored.status).toBe("complete");
    expect(stored.request_method).toBe("POST");
    expect(stored.request_url).toBe(`http://localhost:${server.port}/target`);
    expect(stored.response_status).toBe(201);
    expect(stored.response_headers).toEqual(
      expect.arrayContaining([["x-echo", "1"]]),
    );
    expect(Buffer.from(stored.response_body!, "base64").toString()).toBe("pong");
  });

  test("records a failed request as an error event", async () => {
    const request: HandlerRequest = {
      method: "GET",
      url: "http://localhost:9/unreachable", // discard port: nothing listens
      external: true,
      headers: [],
      query: [],
      body: null,
    };
    const { event, response, body } = await captureOutboundRequest(request);

    expect(response).toBeNull();
    expect(body).toBeNull();

    const stored = getRequestEvent(event.id);
    expect(stored.type).toBe("outbound");
    expect(stored.status).toBe("error");
    expect(stored.response_status ?? null).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/webhook-server/capture-outbound-request.spec.ts`
Expected: FAIL — `captureOutboundRequest` does not exist yet.

- [ ] **Step 3: Implement `src/webhook-server/capture-outbound-request.ts`**

```ts
import "@/server-only";
import type { RequestEvent } from "@/request-events/schema";
import { createRequestEvent, updateRequestEvent } from "@/request-events/model";
import { appEvents } from "@/db/events";
import { requestSchema, type HandlerRequest } from "./schema";
import { sendWebhookRequest } from "./send-request";
import { randomUUID } from "@/util/uuid";
import { now } from "@/util/datetime";
import { parseBase64 } from "@/util/base64";

// Sends an external request and records it as an "outbound" RequestEvent,
// mirroring the create->update lifecycle that processRequest uses for inbound
// requests. Only external requests go through here; internal sends loop back
// through the local webhook server and are captured as "inbound".
export async function captureOutboundRequest(
  request: HandlerRequest,
): Promise<{
  event: RequestEvent;
  response: Response | null;
  body: string | null;
}> {
  // Validate before persisting so an invalid request (e.g. external:true with a
  // path from the MCP tool, whose flat inputSchema has no cross-field refine)
  // fails fast rather than creating a bogus "error" event.
  const req = requestSchema.parse(request) as HandlerRequest;

  const event: RequestEvent = {
    id: randomUUID(),
    type: "outbound",
    status: "running",
    request_method: req.method,
    request_url: req.url,
    request_query_params: req.query,
    request_headers: req.headers,
    request_body: req.body ? parseBase64(req.body) : null,
    request_timestamp: now(),
  };
  const created = createRequestEvent(event);
  appEvents.emit("request:created", created);

  try {
    const response = await sendWebhookRequest(req);
    const body = Buffer.from(await response.arrayBuffer()).toString("base64");
    const updated = updateRequestEvent({
      id: event.id,
      status: "complete",
      response_status: response.status,
      response_status_message: response.statusText || null,
      response_headers: [...response.headers.entries()],
      response_body: parseBase64(body),
      response_timestamp: now(),
    });
    appEvents.emit("request:updated", updated);
    return { event: updated, response, body };
  } catch {
    const updated = updateRequestEvent({
      id: event.id,
      status: "error",
      response_timestamp: now(),
    });
    appEvents.emit("request:updated", updated);
    return { event: updated, response: null, body: null };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/webhook-server/capture-outbound-request.spec.ts`
Expected: PASS (both tests).

- [ ] **Step 5: Compile and format**

Run: `bun run compile` — expected: no new errors in the two new files (17 baseline unchanged).
Run: `bun run format`

- [ ] **Step 6: Commit**

```bash
git add src/webhook-server/capture-outbound-request.ts src/webhook-server/capture-outbound-request.spec.ts
git commit -m "claude: add captureOutboundRequest to record external sends as outbound events"
```

---

### Task 2: Dashboard send flow — route captures outbound, drop the inline panel

**Files:**
- Modify: `src/request-events/controller.ts` (the `/api/requests/send` route, ~lines 46-61)
- Modify: `src/request-events/controller.spec.ts` (the `POST /api/requests/send` describe, ~lines 167-198)
- Modify: `src/dashboard/hooks.ts` (`useSendRequest`, ~lines 138-169)
- Modify: `src/dashboard/pages/create-request-page.tsx`
- Delete: `src/components/http-response-view.tsx`

**Interfaces:**
- Consumes: `captureOutboundRequest` (Task 1); `sendWebhookRequest`; `requestSchema`/`HandlerRequest`.
- Produces: `POST /api/requests/send` returns, for external sends, `{ status: "ok", external: true, event_id, response: { status, statusText } }` (or `{ status: "error", external: true, event_id, message }` with HTTP 502 on failure); for internal sends `{ status: "ok", external: false, response: { status, statusText } }`.

- [ ] **Step 1: Rewrite the route test (failing)**

In `src/request-events/controller.spec.ts`: extend the `./model` import to include `getRequestEvent`, and the `@/util/uuid` import to include `parseUUID`. Replace the entire `describe("POST /api/requests/send", ...)` block (~lines 167-198) with:

```ts
  describe("POST /api/requests/send", () => {
    const server = Bun.serve({
      port: 0,
      fetch: () =>
        new Response("ok", { status: 202, headers: { "x-echo": "1" } }),
    });
    afterAll(() => server.stop(true));

    test("captures an external send as an outbound event and returns its id", async () => {
      const mockReq = {
        json: async () => ({
          method: "GET",
          url: `http://localhost:${server.port}/ext`,
          external: true,
          headers: [],
          query: [],
          body: null,
        }),
      } as any;

      const response =
        await requestEventController["/api/requests/send"].POST(mockReq);
      const data = await response.json();

      expect(data.status).toBe("ok");
      expect(data.external).toBe(true);
      expect(data.response.status).toBe(202);
      expect(typeof data.event_id).toBe("string");

      const stored = getRequestEvent(parseUUID(data.event_id));
      expect(stored.type).toBe("outbound");
      expect(stored.status).toBe("complete");
      expect(stored.response_status).toBe(202);
    });

    test("captures a failed external send as an error event (502)", async () => {
      const mockReq = {
        json: async () => ({
          method: "GET",
          url: "http://localhost:9/unreachable",
          external: true,
          headers: [],
          query: [],
          body: null,
        }),
      } as any;

      const response =
        await requestEventController["/api/requests/send"].POST(mockReq);
      expect(response.status).toBe(502);
      const data = await response.json();
      expect(data.status).toBe("error");
      expect(typeof data.event_id).toBe("string");

      const stored = getRequestEvent(parseUUID(data.event_id));
      expect(stored.type).toBe("outbound");
      expect(stored.status).toBe("error");
    });
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/request-events/controller.spec.ts`
Expected: FAIL — the current route returns the old `{ status, external, response: { status, statusText, headers, body } }` shape with no `event_id`, and persists no event, so `data.event_id` is `undefined` and `getRequestEvent` throws / the 502 assertion fails.

- [ ] **Step 3: Update the route in `src/request-events/controller.ts`**

Add the import near the other imports (line 14 area):

```ts
import { captureOutboundRequest } from "@/webhook-server/capture-outbound-request";
```

Replace the `/api/requests/send` route body (~lines 46-61) with:

```ts
  "/api/requests/send": {
    POST: async (req) => {
      const request = requestSchema.parse(await req.json()) as HandlerRequest;
      if (request.external) {
        const { event, response } = await captureOutboundRequest(request);
        if (!response) {
          return Response.json(
            {
              status: "error",
              external: true,
              event_id: event.id,
              message: "External request failed",
            },
            { status: 502 },
          );
        }
        return Response.json({
          status: "ok",
          external: true,
          event_id: event.id,
          response: { status: response.status, statusText: response.statusText },
        });
      }
      const response = await sendWebhookRequest(request);
      return Response.json({
        status: "ok",
        external: false,
        response: { status: response.status, statusText: response.statusText },
      });
    },
  },
```

Keep the existing `sendWebhookRequest` and `requestSchema`/`HandlerRequest` imports.

- [ ] **Step 4: Run the route test to verify it passes**

Run: `bun test src/request-events/controller.spec.ts`
Expected: PASS (all tests, including the two new ones and the existing malformed-JSON test).

- [ ] **Step 5: Slim the `useSendRequest` hook in `src/dashboard/hooks.ts`**

Replace the `.then(...)` result type and the `toast.promise` block (~lines 138-169) with:

```ts
      }).then(async (resp) => {
        const data = await resp.json();
        if (!resp.ok || data.status !== "ok") {
          throw new Error(
            data?.message ??
              (data?.response
                ? `${data.response.status} ${data.response.statusText}`
                : `Request failed (${resp.status})`),
          );
        }
        return data as {
          status: string;
          external: boolean;
          event_id?: string;
          response?: { status: number; statusText: string };
        };
      });

      toast.promise(requestPromise, {
        loading: "Sending request...",
        success: (data) => ({
          message: `Request succeeded!`,
          description: data.response
            ? `${data.response.status} ${data.response.statusText}`
            : "Sent",
        }),
        error: (e) => ({
          message: `Request failed!`,
          description: `Error: ${e}`,
        }),
      });
```

Leave the body base64-encoding block above and the `onSuccess` `["requests"]` invalidation below unchanged.

- [ ] **Step 6: Remove the inline panel from `src/dashboard/pages/create-request-page.tsx`**

Make these edits:
1. Delete the import line `import { HttpResponseView } from "@/components/http-response-view";` (line 14).
2. Delete the `sendResult`/`externalResponse` block (lines 67-69):
   ```ts
   const sendResult = sendRequestMutation.data;
   const externalResponse =
     sendResult?.external === true ? sendResult.response : null;
   ```
3. Delete the panel render (lines 168-176):
   ```tsx
   {externalResponse && (
     <HttpResponseView
       className="mt-4"
       status={externalResponse.status}
       statusText={externalResponse.statusText}
       headers={externalResponse.headers}
       body={externalResponse.body}
     />
   )}
   ```
4. Update the external field's `FormDescription` text (lines 92-96) to reflect capture:
   ```tsx
   <FormDescription>
     When on, enter a fully-qualified URL. External requests are sent
     anywhere the server can reach and captured in the log as outbound
     requests.
   </FormDescription>
   ```

- [ ] **Step 7: Delete the now-unused component**

```bash
git rm src/components/http-response-view.tsx
```

Confirm nothing else imports it:
Run: `grep -rn "http-response-view\|HttpResponseView" src`
Expected: no matches.

- [ ] **Step 8: Compile and format**

Run: `bun run compile` — expected: no new errors in `controller.ts`, `hooks.ts`, or `create-request-page.tsx`; and no error about a missing `http-response-view` module.
Run: `bun run format`

- [ ] **Step 9: Commit**

```bash
git add src/request-events/controller.ts src/request-events/controller.spec.ts src/dashboard/hooks.ts src/dashboard/pages/create-request-page.tsx
git commit -m "claude: capture dashboard external sends as outbound events, drop inline response panel"
```

---

### Task 3: MCP `send-http-request` captures external sends as outbound

**Files:**
- Modify: `src/mcp/tools/http-requests.ts` (description + handler, ~lines 20-62)
- Modify: `src/mcp/server.spec.ts` (the "gets captured" test, ~lines 245-267)

**Interfaces:**
- Consumes: `captureOutboundRequest` (Task 1); `sendWebhookRequest`.
- Produces: the tool response shape is unchanged (status, statusText, headers, base64 body). External sends now persist an `outbound` event.

- [ ] **Step 1: Update the MCP capture test (failing)**

In `src/mcp/server.spec.ts`, in the test `"send-http-request sends a request that gets captured"` (~line 262), change the `captured` lookup to require the outbound event (targeting the local test server now yields both an outbound and an inbound event):

```ts
      const captured = getAllRequestEventsMeta().find(
        (event) =>
          event.type === "outbound" &&
          event.request_url.includes("/mcp-send-test"),
      );
      expect(captured).toBeDefined();
      expect(captured!.request_method).toBe("POST");
```

Leave the two other send tests ("surfaces connection errors as tool errors" and "rejects an absolute URL when external is omitted") unchanged.

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/mcp/server.spec.ts`
Expected: FAIL — the tool does not create an outbound event yet (the request is currently captured only as `inbound` via loopback), so no `type: "outbound"` event exists and `captured` is `undefined`.

- [ ] **Step 3: Update the tool in `src/mcp/tools/http-requests.ts`**

Add the import near the top:

```ts
import { captureOutboundRequest } from "@/webhook-server/capture-outbound-request";
```

Replace the `description` (~lines 21-22) with:

```ts
      description:
        "Sends a test HTTP request. By default (external:false) it targets a path on the webhook server and is captured as an inbound request event. Set external:true to send to an absolute http(s) URL on another host; external requests are captured as outbound request events. Either way, use get-http-request afterwards to inspect the capture. Returns the HTTP response.",
```

Replace the handler (~lines 53-62, from `async ({ method, url, external, headers, query, body }) => {` through its closing `},`) with:

```ts
    async ({ method, url, external, headers, query, body }) => {
      const request = {
        method,
        url,
        external,
        headers: parseKvList(headers ?? [], z.string()),
        query: parseKvList(query ?? [], z.string()),
        body,
      };
      if (external) {
        const { response, body: responseBody } =
          await captureOutboundRequest(request);
        if (!response) {
          return errorResult(`External request to ${url} failed`);
        }
        return jsonResult({
          status: response.status,
          statusText: response.statusText,
          headers: [...response.headers.entries()],
          body: responseBody ?? "",
        });
      }
      const response = await sendWebhookRequest(request);
      return jsonResult({
        status: response.status,
        statusText: response.statusText,
        headers: [...response.headers.entries()],
        body: Buffer.from(await response.arrayBuffer()).toString("base64"),
      });
    },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/mcp/server.spec.ts`
Expected: PASS (the updated capture test, plus the unchanged connection-error and validation tests).

- [ ] **Step 5: Compile and format**

Run: `bun run compile` — expected: no new errors in `http-requests.ts`.
Run: `bun run format`

- [ ] **Step 6: Commit**

```bash
git add src/mcp/tools/http-requests.ts src/mcp/server.spec.ts
git commit -m "claude: capture MCP external sends as outbound events"
```

---

### Task 4: Outbound badge in the UI

**Files:**
- Modify: `src/components/request-sidebar.tsx` (row header, ~lines 268-275)
- Modify: `src/components/request-event-display.tsx` (header, ~lines 38-41)

> No automated test: there is no DOM/browser test env. Verify via `bun run compile` and review.

- [ ] **Step 1: Add the badge to the sidebar row**

In `src/components/request-sidebar.tsx`, immediately after the `H2` badge block (the `{request.http_version === "2.0" && (...)}` block ending ~line 275) and before the `{isArchived && (...)}` block, insert:

```tsx
                          {request.type === "outbound" && (
                            <Badge
                              variant="outline"
                              className="px-1 py-0 text-[10px]"
                            >
                              Outbound
                            </Badge>
                          )}
```

(`Badge` is already imported at line 27; `request` is a `RequestEventMeta`, which carries `type`.)

- [ ] **Step 2: Add the badge to the detail header**

In `src/components/request-event-display.tsx`, immediately after the `http_version` badge block (the `{request.http_version && (...)}` block ending ~line 41) and before `{titleActions}`, insert:

```tsx
            {request.type === "outbound" && (
              <Badge variant="outline">Outbound</Badge>
            )}
```

(`Badge` is already imported at line 9.)

- [ ] **Step 3: Compile and format**

Run: `bun run compile` — expected: no new errors in either component.
Run: `bun run format`

- [ ] **Step 4: Commit**

```bash
git add src/components/request-sidebar.tsx src/components/request-event-display.tsx
git commit -m "claude: mark outbound request events with a badge"
```

---

### Task 5: Update documentation

**Files:**
- Modify: `src/docs/sending-requests.md`
- Modify: `src/docs/mcp.md`

- [ ] **Step 1: Rewrite the "Sending to other hosts" section in `src/docs/sending-requests.md`**

Read the file, then replace the whole `## Sending to other hosts` section (from that heading up to the next `## From an AI agent` heading) with:

```markdown
## Sending to other hosts

By default a request is **internal**: the path field takes an absolute path such as `/my-hook`, and `wtt` sends it to its own webhook server, where it is recorded and run through the matching [handlers](./handlers.md).

Turn on **Send to an external URL** to send the request somewhere else. The field then takes a fully-qualified URL such as `https://example.com/hook`, and the request goes to that host. The two modes are enforced — an internal request must be a path, an external request must be a full URL.

External requests are captured too, as **outbound** events. They appear in the request log with an **Outbound** badge, and you open one to see the request and the response `wtt` received, the same way you inspect an inbound request. A send that never connects is recorded as an errored outbound event. Because `wtt` will send a request anywhere its own network can reach, this is worth remembering before exposing the dashboard.
```

- [ ] **Step 2: Update the "From an AI agent" paragraph in `src/docs/sending-requests.md`**

Replace the first sentence of the `## From an AI agent` section with:

```markdown
The [MCP server](./mcp.md) exposes the same capability as `send-http-request`, taking a method, a path (or an absolute URL with `external: true`), optional headers and query parameters, and an optional base64-encoded body. Internal sends are captured as inbound events and external sends as outbound events, both inspectable with `get-http-request`. It returns the response status, headers, and base64 body.
```

- [ ] **Step 3: Update the tool table row in `src/docs/mcp.md`**

Replace the `send-http-request` table row (~line 29) with:

```markdown
| `send-http-request` | Send a test HTTP request to a path on the webhook server (captured as an inbound event) or to an absolute URL with `external: true` (captured as an outbound event). |
```

- [ ] **Step 4: Verify docs tests, format, and commit**

Run: `bun test src/docs` — expected: PASS (renderer tests unaffected by content).
Run: `bun run format`

```bash
git add src/docs/sending-requests.md src/docs/mcp.md
git commit -m "claude: document outbound capture of external requests"
```

---

## Final verification

- [ ] Run the affected suites: `bun test src/webhook-server src/request-events src/mcp src/docs`
- [ ] Run `bun run compile` and confirm no new errors beyond the 17-error baseline.
- [ ] Manually confirm the Test Request page: an external send shows a status toast, no inline panel, and the new outbound event appears in the sidebar with an "Outbound" badge; opening it shows the captured request + response. (No DOM test env — manual/code-review check.)

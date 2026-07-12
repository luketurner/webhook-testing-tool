# Capture external requests as outbound events

## Problem

External test requests are fire-and-forget: `sendWebhookRequest` does a bare
`fetch`, the route returns the response, and the dashboard shows it inline via
`HttpResponseView`. Nothing is persisted, so an external send leaves no trace in
the request log, and the response is visible only in the moment.

The `RequestEvent` schema already supports `type: "outbound"`, but nothing
produces outbound events today. Capture external sends as outbound request
events so they appear in the log like any inbound request, and drop the inline
response panel.

## Goals

- External sends (from the dashboard **and** the MCP tool) are captured as
  `outbound` request events.
- Failed external sends are captured as `error` events.
- The dashboard stays on the page after an external send (status toast); the new
  event appears in the sidebar. No inline response panel.
- Outbound events are visually distinguishable from inbound in the UI.

## Non-goals

- Changing internal sends. They still loop back through the local webhook server
  and are captured as `inbound` — unchanged.
- Navigating to the new event after a send (explicitly chosen: stay + toast).
- A request-type filter in the sidebar (only a badge, not filtering).

## Design

### 1. `captureOutboundRequest` — new shared capture (server-only)

New file `src/webhook-server/capture-outbound-request.ts`. It mirrors the
create→update lifecycle of `processRequest` (`src/webhook-server/process-request.ts:64-102`)
but for an outgoing request. It lives in `webhook-server/` because that
directory already depends on `request-events/model`; putting it in
`request-events/` would create an import cycle with `webhook-server/send-request`.

```ts
export async function captureOutboundRequest(
  request: HandlerRequest,
): Promise<{ event: RequestEvent; response: Response | null; body: string | null }> {
  // Validate before persisting, so an invalid request (e.g. external:true with a
  // path, from the MCP tool whose flat inputSchema has no cross-field refine)
  // fails fast rather than creating a bogus "error" event.
  const req = requestSchema.parse(request) as HandlerRequest;
  const event: RequestEvent = {
    id: randomUUID(),
    type: "outbound",
    status: "running",
    request_method: req.method,
    request_url: req.url,                    // the full external URL
    request_query_params: req.query,
    request_headers: req.headers,
    request_body: req.body ? parseBase64(req.body) : null,
    request_timestamp: now(),
  };
  const created = createRequestEvent(event);
  appEvents.emit("request:created", created);

  try {
    const response = await sendWebhookRequest(request);
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

Notes:
- `request.body` is a base64 string (or null); `parseBase64` brands it for the
  `request_body`/`response_body` schema fields.
- The response body is read exactly once (`arrayBuffer`) and returned as `body`,
  because the stream cannot be read again; `response.status`/`statusText`/
  `headers` remain accessible after that.
- `response_status_message` uses `response.statusText || null` (fetch may give an
  empty string; the schema requires `min(1)` when present).
- `request_url` stores the full external URL; `request_query_params` stores the
  query pairs separately, mirroring how inbound events split URL and query.
- Only external requests go through this. It never throws for fetch failures —
  it records them as `error` events and returns `response: null`.

### 2. Send route — `src/request-events/controller.ts`

`POST /api/requests/send` branches on `external`:

```ts
POST: async (req) => {
  const request = requestSchema.parse(await req.json()) as HandlerRequest;
  if (request.external) {
    const { event, response } = await captureOutboundRequest(request);
    if (!response) {
      return Response.json(
        { status: "error", external: true, event_id: event.id,
          message: "External request failed" },
        { status: 502 },
      );
    }
    return Response.json({
      status: "ok", external: true, event_id: event.id,
      response: { status: response.status, statusText: response.statusText },
    });
  }
  const response = await sendWebhookRequest(request);
  return Response.json({
    status: "ok", external: false,
    response: { status: response.status, statusText: response.statusText },
  });
},
```

The route no longer returns response headers or body.

### 3. Hook + page

**`src/dashboard/hooks.ts` — `useSendRequest`:** keep the request-body
base64-encoding, the `toast.promise` (success shows `${status} ${statusText}`,
error shows the message), and the `["requests"]` invalidation. Slim the returned
data type to `{ status: string; external: boolean; event_id?: string;
response?: { status: number; statusText: string } }`. The non-ok / `status !==
"ok"` branch still throws so the error toast fires (covers the 502 external
failure). No navigation.

**`src/dashboard/pages/create-request-page.tsx`:** remove the `HttpResponseView`
import, the `sendResult`/`externalResponse` computation, and the panel render.
Keep the Switch, the mode-aware URL/Path field, and the form. After a send, the
toast reports status and the event appears in the sidebar via SSE + refetch.

**Delete `src/components/http-response-view.tsx`** — its only consumer is the
create-request page.

### 4. MCP `send-http-request` — `src/mcp/tools/http-requests.ts`

The handler branches on `external`:

```ts
if (external) {
  const { response, body } = await captureOutboundRequest({ method, url, external, headers, query, body });
  if (!response) return errorResult(`External request to ${url} failed`);
  return jsonResult({
    status: response.status,
    statusText: response.statusText,
    headers: [...response.headers.entries()],
    body: body ?? "",
  });
}
const response = await sendWebhookRequest({ method, url, external, headers, query, body });
return jsonResult({
  status: response.status, statusText: response.statusText,
  headers: [...response.headers.entries()],
  body: Buffer.from(await response.arrayBuffer()).toString("base64"),
});
```

(The `headers`/`query`/`body` passed in are already parsed via `parseKvList`
/base64 as today.) External MCP sends are now logged as outbound and are
retrievable via `get-http-request`. Update the tool description to say external
requests are captured as outbound events (drop the "not captured" wording).

### 5. Outbound badge

Add a small "Outbound" badge, shown only when `type === "outbound"` (inbound
unchanged):

- `src/components/request-sidebar.tsx` row header (near the `H2` badge, ~line
  268) — the sidebar's `RequestEventMeta` already carries `type`.
- `src/components/request-event-display.tsx` header (near `StatusBadge`, ~line
  38).

### 6. Docs

- `src/docs/sending-requests.md`: rewrite the external section — external
  requests are captured as **outbound** events (viewable in the log, marked with
  an Outbound badge), not shown inline; failed sends are recorded as errored
  events.
- `src/docs/mcp.md` + the tool description: external sends are captured as
  outbound events.

## Testing

Functional tests, no mocks (per `CLAUDE.md`):

- **`captureOutboundRequest`** — against a throwaway `Bun.serve`: success creates
  an `outbound` event that transitions `running` → `complete` with the response
  fields populated and returns `{ response, body }`; a failure (unreachable port)
  produces a `status: "error"` event with `response: null` and no response
  fields.
- **Route** — external success returns `event_id` and persists a complete
  outbound event; external failure returns `status: "error"` (502) and persists
  an errored outbound event; internal send is unchanged.
- **MCP `send-http-request`** — external send creates an event with
  `type: "outbound"` and returns the full response; a connection error returns
  `isError` and persists an errored outbound event; internal send unchanged. The
  existing "gets captured" test is updated to assert the `outbound` event
  specifically (targeting the local test server now yields both an outbound and
  an inbound event — a test artifact of using localhost).
- **Badge** — no DOM test environment; verified by compile + review.

## Risks

- **Double capture in tests:** sending `external: true` to the local test server
  produces both an outbound event (our capture) and an inbound event (the server
  receiving it). This only happens when tests target localhost; real external
  sends hit other hosts and produce only the outbound event. Tests assert on the
  `outbound` event explicitly.
- **Behavior change (MCP):** external MCP sends now persist an event where they
  previously did not. This is the intended capability and is documented.

# Explicit internal/external HTTP requests

## Problem

The "send test request" feature already sends to external hosts implicitly:
`sendWebhookRequest` runs `new URL(url, LOCAL_WEBHOOK_URL)`, so a bare path hits
the local webhook server and a fully-qualified URL is sent to that host. The
choice is invisible in the UI and easy to make by accident — typing a full URL
silently sends the request off-box.

Make the choice explicit and enforced: a toggle in the dashboard, a matching
flag in the MCP tool, and validation that keeps each mode in its lane.

## Goals

- A toggle in the Test Request form switches internal vs external.
- Internal mode accepts an absolute path only (e.g. `/foo/bar`).
- External mode requires a fully-qualified `http(s)` URL.
- The MCP `send-http-request` tool gains a matching `external` flag.
- External responses are shown in the UI, since they are never captured in the
  request log.

## Non-goals

- Capturing/logging external requests (nothing routes them back through the
  webhook server).
- Changing headers, query, or base64 body handling.
- Any auth/allowlist policy for external hosts (out of scope; the existing SSRF
  caveat stands and is documented).

## Design

### 1. Schema — `src/webhook-server/schema.ts`

Add `external` to `requestSchema`, defaulting to `false`, and a refinement that
enforces the boundary. The refinement reports on the `url` path so the form
renders the message inline.

```ts
export const requestSchema = z
  .object({
    method: z.enum(HTTP_METHODS),
    url: z.string().min(1),
    external: z.boolean().default(false),
    headers: kvListSchema(z.string()),
    query: kvListSchema(z.string()),
    body: z.any(), // TODO
  })
  .refine((v) => v.external || isAbsolutePath(v.url), {
    path: ["url"],
    message: "Enter an absolute path starting with /",
  })
  .refine((v) => !v.external || isAbsoluteHttpUrl(v.url), {
    path: ["url"],
    message: "Enter a fully-qualified http(s) URL",
  });
```

Two chained `.refine()` calls give each mode its own message on the `url` field;
for a given mode only the relevant check can fail.

Rules, implemented as small helpers (exported from this file or `src/util/http.ts`):

- `isAbsolutePath(url)`: starts with `/` and **not** `//`. Rejecting `//` closes
  the protocol-relative escape (`//evil.com/x` resolves to another origin).
- `isAbsoluteHttpUrl(url)`: `new URL(url)` succeeds and `protocol` is `http:` or
  `https:`.

`HandlerRequest` gains `external: boolean`. `requestEventToHandlerRequest`
(resend) does not set `external`, so it defaults to `false`; captured requests
always carry a path, so internal validation passes.

### 2. Outgoing request — `src/webhook-server/send-request.ts`

Branch on `external`:

- internal → `new URL(path, LOCAL_WEBHOOK_URL)`, then assert
  `result.origin === new URL(LOCAL_WEBHOOK_URL).origin`; throw otherwise
  (defense in depth if a path slips validation).
- external → `new URL(url)` directly.

Query append, base64→binary body, and the `fetch` call are unchanged.

### 3. Browser route + hook

**`src/request-events/controller.ts`** — `/api/requests/send` returns the full
response, matching what the MCP tool already returns:

```ts
return Response.json({
  status: "ok",
  external: request.external ?? false,
  response: {
    status: response.status,
    statusText: response.statusText,
    headers: [...response.headers.entries()],
    body: Buffer.from(await response.arrayBuffer()).toString("base64"),
  },
});
```

**`src/dashboard/hooks.ts`** — `useSendRequest` returns the parsed JSON so the
page can render the response. The success toast still reports
`${status} ${statusText}`. Internal sends behave exactly as today (toast, and the
request appears in the sidebar via the `["requests"]` invalidation). The body is
base64-encoded before POST as it is now.

### 4. UI — `src/dashboard/pages/create-request-page.tsx`

- Default values gain `external: false`.
- A `Switch` field labeled "Send to an external URL".
- The URL/path field is mode-aware:
  - internal: label "Path", placeholder `/`.
  - external: label "URL", placeholder `https://example.com/hook`, with a short
    note that external requests are not captured and are sent anywhere the
    server can reach.
- After an external send, render a read-only **Response** panel — status line,
  headers, and body (decoded to text when printable, base64 otherwise) — from the
  mutation result. The panel shows only for external sends; internal sends are
  inspected in the request log as before.

Uses the shadcn `Switch` component already present at
`src/components/ui/switch.tsx` — no new dependency to install.

The response panel is a small reusable component in `src/components`
(e.g. `http-response-view.tsx`) so it stays focused and could be reused later.

### 5. MCP tool — `src/mcp/tools/http-requests.ts`

Add `external` and pass it through:

```ts
external: z
  .boolean()
  .optional()
  .default(false)
  .describe("Send to an external host. false = path on the webhook server; true = absolute http(s) URL"),
url: z
  .string()
  .min(1)
  .describe("Path on the webhook server (e.g. '/my-hook') when external is false, or an absolute http(s) URL when external is true"),
```

The handler passes `external` into `sendWebhookRequest`. The response shape is
unchanged (it already returns status, statusText, headers, base64 body). Update
the tool description to note that external requests are **not** captured, so
`get-http-request` will not find them. `openWorldHint: true` stays.

### 6. Docs — `src/docs/sending-requests.md` (+ `mcp.md`)

- Rewrite "Sending to other hosts": the toggle selects the mode; internal
  wants a path, external wants a full URL; the two are enforced, not guessed.
- Note the inline response panel for external sends and that they are not logged.
- Update the MCP section to mention the `external` flag.

## Testing

Functional tests, no mocks (per `CLAUDE.md`):

- **Schema** — internal accepts `/foo/bar`; internal rejects `http://x/y` and
  `//evil.com/x`; external accepts `https://x/y`; external rejects `/foo/bar` and
  a non-http scheme; `external` defaults to `false`.
- **`sendWebhookRequest`** — internal resolves to the local webhook server;
  external reaches a throwaway `Bun.serve` target on a random port; the internal
  origin assertion throws for a crafted off-origin path.
- **MCP `send-http-request`** — `external: false` (default) hits local;
  `external: true` reaches the throwaway target; validation errors surface.

## Risks

- **Behavior change:** internal mode now rejects a full URL that previously would
  have been sent externally. This is the intended safety improvement and is
  documented.

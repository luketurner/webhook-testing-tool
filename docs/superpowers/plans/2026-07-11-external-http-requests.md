# Explicit Internal/External HTTP Requests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the "send test request" feature target either the local webhook server (internal, path only) or an arbitrary host (external, full URL only), controlled by an explicit toggle in the dashboard and a matching flag in the MCP tool.

**Architecture:** A new `external` boolean flows through the shared `requestSchema` and `sendWebhookRequest`. A Zod `superRefine` enforces path-only for internal and http(s)-URL-only for external. The browser send route returns the full response so external sends (which are never captured in the request log) can be shown inline in the UI. The MCP `send-http-request` tool gains an optional `external` flag.

**Tech Stack:** Bun, TypeScript, Zod v4 (`zod/v4`), React + react-hook-form, shadcn/ui, `bun:test`.

## Global Constraints

- Package management: edit `package.json` + `bun install`; never `bun add` (hangs in this devcontainer). No new dependencies are needed for this plan.
- Compile with `bun run compile` (never `bunx tsc`). Format with `bun run format`.
- `bun run compile` has a **known baseline** of 17 errors across 4 pre-existing files. Those are not regressions — only treat *new* errors in files you touched as failures.
- Never use `any` to fix a TypeScript error. (Existing `as any` in test mock-req objects and the pre-existing `zodResolver(requestSchema as any)` cast are established patterns you may keep; do not introduce new ones.)
- Use Zod for parsing external/user input.
- Use shadcn/ui components; never edit files in `src/components/ui` or `src/util/ui.ts`.
- Use `Link`/`NavLink` for client-side navigation (not relevant here, no new routes).
- Tests: no mocks/stubs of the code under test. DB is reset between tests automatically. Use `randomUUID` from `@/util/uuid` and `parseBase64` from `@/util/base64` for branded test values.
- Environment limits: port 3000 is occupied by a running dev server; there is no DOM/browser test environment, so React components cannot be render-tested here — verify UI by `bun run compile` and code review.
- Commit messages are prefixed with `claude: `.

---

### Task 1: `external` field and URL-classification helpers on the schema

**Files:**
- Modify: `src/util/http.ts`
- Modify: `src/webhook-server/schema.ts:7-13`
- Test: `src/webhook-server/schema.spec.ts` (create)

**Interfaces:**
- Produces: `isAbsolutePath(url: string): boolean` and `isAbsoluteHttpUrl(url: string): boolean` in `@/util/http`.
- Produces: `requestSchema` gains `external: boolean` (default `false`) and a cross-field refinement reporting on the `url` path. `HandlerRequest` gains `external: boolean` via `z.infer`.

- [ ] **Step 1: Write the failing test**

Create `src/webhook-server/schema.spec.ts`:

```ts
import { describe, test, expect } from "bun:test";
import { requestSchema } from "./schema";
import { isAbsolutePath, isAbsoluteHttpUrl } from "@/util/http";

const base = { method: "GET" as const, headers: [], query: [], body: null };

describe("url classification helpers", () => {
  test("isAbsolutePath accepts a path and rejects urls and protocol-relative", () => {
    expect(isAbsolutePath("/foo/bar")).toBe(true);
    expect(isAbsolutePath("//evil.com/x")).toBe(false);
    expect(isAbsolutePath("http://x/y")).toBe(false);
    expect(isAbsolutePath("foo")).toBe(false);
  });

  test("isAbsoluteHttpUrl accepts http(s) urls only", () => {
    expect(isAbsoluteHttpUrl("https://x/y")).toBe(true);
    expect(isAbsoluteHttpUrl("http://x/y")).toBe(true);
    expect(isAbsoluteHttpUrl("ftp://x/y")).toBe(false);
    expect(isAbsoluteHttpUrl("/foo/bar")).toBe(false);
  });
});

describe("requestSchema external/internal validation", () => {
  test("external defaults to false", () => {
    expect(requestSchema.parse({ ...base, url: "/foo" }).external).toBe(false);
  });

  test("internal accepts an absolute path", () => {
    expect(requestSchema.safeParse({ ...base, url: "/foo" }).success).toBe(true);
  });

  test("internal rejects a full url and a protocol-relative url", () => {
    expect(requestSchema.safeParse({ ...base, url: "http://x/y" }).success).toBe(false);
    expect(requestSchema.safeParse({ ...base, url: "//evil.com/x" }).success).toBe(false);
  });

  test("external accepts a full http(s) url", () => {
    expect(
      requestSchema.safeParse({ ...base, external: true, url: "https://x/y" }).success,
    ).toBe(true);
  });

  test("external rejects a bare path and a non-http scheme", () => {
    expect(requestSchema.safeParse({ ...base, external: true, url: "/foo" }).success).toBe(false);
    expect(requestSchema.safeParse({ ...base, external: true, url: "ftp://x/y" }).success).toBe(false);
  });

  test("the validation error is reported on the url field", () => {
    const result = requestSchema.safeParse({ ...base, url: "http://x/y" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["url"]);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/webhook-server/schema.spec.ts`
Expected: FAIL — `isAbsolutePath`/`isAbsoluteHttpUrl` are not exported; `external` is unknown.

- [ ] **Step 3: Add the helpers to `src/util/http.ts`**

Append to `src/util/http.ts`:

```ts
export function isAbsolutePath(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//");
}

export function isAbsoluteHttpUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}
```

- [ ] **Step 4: Add `external` and the refinement to `src/webhook-server/schema.ts`**

Update the import of `@/util/http` and replace the `requestSchema` definition (lines 7-13):

```ts
import { HTTP_METHODS, isAbsoluteHttpUrl, isAbsolutePath } from "@/util/http";
```

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
  // internal (external === false) must be an absolute path
  .refine((value) => value.external || isAbsolutePath(value.url), {
    path: ["url"],
    message: "Enter an absolute path starting with /",
  })
  // external (external === true) must be a fully-qualified http(s) url
  .refine((value) => !value.external || isAbsoluteHttpUrl(value.url), {
    path: ["url"],
    message: "Enter a fully-qualified http(s) URL",
  });
```

Two chained `.refine()` calls (rather than `superRefine`) keep the typing simple and give each mode its own message on the `url` field: for a given mode only the relevant check can fail, because the other refine short-circuits to `true`.

`HandlerRequest` (which `extends z.infer<typeof requestSchema>`) picks up `external: boolean` automatically — no change to the interface body. `requestEventToHandlerRequest` keeps working: it omits `external`, so it defaults to `false`, and captured `request_url` values are paths, so internal validation passes.

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test src/webhook-server/schema.spec.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Compile and format**

Run: `bun run compile` — expected: no *new* errors in `src/util/http.ts` or `src/webhook-server/schema.ts` (baseline of 17 known errors may remain).
Run: `bun run format`

- [ ] **Step 7: Commit**

```bash
git add src/util/http.ts src/webhook-server/schema.ts src/webhook-server/schema.spec.ts
git commit -m "claude: add external flag and url validation to request schema"
```

---

### Task 2: Branch `sendWebhookRequest` on `external`

**Files:**
- Modify: `src/webhook-server/send-request.ts`
- Test: `src/webhook-server/send-request.spec.ts` (create)

**Interfaces:**
- Consumes: `requestSchema`, `HandlerRequest` (Task 1); `LOCAL_WEBHOOK_URL`.
- Produces: `resolveTargetUrl(url: string, external: boolean): URL` (exported). `sendWebhookRequest` now reads `external` from the parsed request.

- [ ] **Step 1: Write the failing test**

Create `src/webhook-server/send-request.spec.ts`:

```ts
import { describe, test, expect, afterAll } from "bun:test";
import {
  resolveTargetUrl,
  sendWebhookRequest,
  LOCAL_WEBHOOK_URL,
} from "./send-request";
import type { HandlerRequest } from "./schema";

describe("resolveTargetUrl", () => {
  test("internal path resolves against the local webhook origin", () => {
    const target = resolveTargetUrl("/foo/bar", false);
    expect(target.origin).toBe(new URL(LOCAL_WEBHOOK_URL).origin);
    expect(target.pathname).toBe("/foo/bar");
  });

  test("internal protocol-relative url is rejected", () => {
    expect(() => resolveTargetUrl("//evil.com/x", false)).toThrow();
  });

  test("external absolute url is used as-is", () => {
    const target = resolveTargetUrl("https://example.com/hook", true);
    expect(target.href).toBe("https://example.com/hook");
  });
});

describe("sendWebhookRequest external", () => {
  let received: {
    method: string;
    pathname: string;
    query: string | null;
    header: string | null;
    body: string;
  } | null = null;

  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url);
      received = {
        method: req.method,
        pathname: url.pathname,
        query: url.searchParams.get("q"),
        header: req.headers.get("x-test"),
        body: await req.text(),
      };
      return new Response("pong", {
        status: 201,
        headers: { "x-echo": "1" },
      });
    },
  });
  afterAll(() => server.stop(true));

  test("sends method, headers, query, and body to the external url", async () => {
    const request: HandlerRequest = {
      method: "POST",
      url: `http://localhost:${server.port}/target`,
      external: true,
      headers: [["x-test", "abc"]],
      query: [["q", "1"]],
      body: Buffer.from("hello").toString("base64"),
    };
    const response = await sendWebhookRequest(request);
    expect(response.status).toBe(201);
    expect(received).not.toBeNull();
    expect(received!.method).toBe("POST");
    expect(received!.pathname).toBe("/target");
    expect(received!.query).toBe("1");
    expect(received!.header).toBe("abc");
    expect(received!.body).toBe("hello");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/webhook-server/send-request.spec.ts`
Expected: FAIL — `resolveTargetUrl` is not exported.

- [ ] **Step 3: Implement in `src/webhook-server/send-request.ts`**

Replace the file body below the imports with:

```ts
export const LOCAL_WEBHOOK_URL = `http://localhost:${WEBHOOK_PORT}`;

export function resolveTargetUrl(url: string, external: boolean): URL {
  if (external) {
    return new URL(url);
  }
  const target = new URL(url, LOCAL_WEBHOOK_URL);
  if (target.origin !== new URL(LOCAL_WEBHOOK_URL).origin) {
    throw new Error(`Internal request escaped the local webhook origin: ${url}`);
  }
  return target;
}

export async function sendWebhookRequest(opts: HandlerRequest) {
  const { url, method, body, headers, query, external } = requestSchema.parse(
    opts,
  ) as HandlerRequest;
  const absoluteUrl = resolveTargetUrl(url, external);

  // Add query parameters to URL
  if (query && query.length > 0) {
    for (const [key, value] of query) {
      absoluteUrl.searchParams.append(key, value);
    }
  }

  // Convert base64 body to binary data if present
  let requestBody: BodyInit | null = null;
  if (body !== null && body !== undefined) {
    if (typeof body === "string") {
      // Assume base64-encoded body, decode to binary
      requestBody = Uint8Array.fromBase64(body);
    } else {
      // Fallback for other types (shouldn't happen with new design)
      requestBody = body;
    }
  }

  return await fetch(absoluteUrl, {
    method,
    body: requestBody,
    headers,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/webhook-server/send-request.spec.ts`
Expected: PASS.

- [ ] **Step 5: Compile and format**

Run: `bun run compile` (no new errors in `send-request.ts`), then `bun run format`.

- [ ] **Step 6: Commit**

```bash
git add src/webhook-server/send-request.ts src/webhook-server/send-request.spec.ts
git commit -m "claude: branch sendWebhookRequest on external flag"
```

---

### Task 3: Browser send route returns the full response; hook returns parsed data

**Files:**
- Modify: `src/request-events/controller.ts:14,45-53`
- Modify: `src/dashboard/hooks.ts:107-161`
- Test: `src/request-events/controller.spec.ts` (add a `describe`)

**Interfaces:**
- Consumes: `requestSchema`, `HandlerRequest` (Task 1); `sendWebhookRequest` (Task 2).
- Produces: `POST /api/requests/send` returns `{ status: "ok", external: boolean, response: { status, statusText, headers: [string,string][], body: string } }`. `useSendRequest` mutation `data` is that object.

- [ ] **Step 1: Write the failing test**

Add to `src/request-events/controller.spec.ts` — extend the `bun:test` import with `afterAll`, and add this `describe` inside the top-level `describe("request-events/controller", ...)`:

```ts
  describe("POST /api/requests/send", () => {
    const server = Bun.serve({
      port: 0,
      fetch: () =>
        new Response("ok", { status: 202, headers: { "x-echo": "1" } }),
    });
    afterAll(() => server.stop(true));

    test("returns the full external response", async () => {
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
      expect(data.response.headers).toEqual(
        expect.arrayContaining([["x-echo", "1"]]),
      );
    });
  });
```

(The `as any` on `mockReq` matches the existing mock-request pattern in this file.)

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/request-events/controller.spec.ts`
Expected: FAIL — the route returns only `{ status, response: { status, statusText } }`, so `data.external` is `undefined` and `data.response.headers` is missing.

- [ ] **Step 3: Update the route in `src/request-events/controller.ts`**

Change the import on line 14 to also bring in the schema:

```ts
import { sendWebhookRequest } from "@/webhook-server/send-request";
import { requestSchema, type HandlerRequest } from "@/webhook-server/schema";
```

Replace the `/api/requests/send` route (lines 45-53):

```ts
  "/api/requests/send": {
    POST: async (req) => {
      const request = requestSchema.parse(await req.json()) as HandlerRequest;
      const response = await sendWebhookRequest(request);
      const body = Buffer.from(await response.arrayBuffer()).toString("base64");
      return Response.json({
        status: "ok",
        external: request.external,
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: [...response.headers.entries()],
          body,
        },
      });
    },
  },
```

- [ ] **Step 4: Update `useSendRequest` in `src/dashboard/hooks.ts`**

Replace the `mutationFn` from the `fetch(...)` call through the end of the function (lines 135-155) so it parses and returns the response, keeping the toast:

```ts
      const requestPromise = fetch("/api/requests/send", {
        method: "POST",
        body: JSON.stringify(processedRequest),
      }).then(async (resp) => {
        const data = await resp.json();
        if (!resp.ok || data.status !== "ok") {
          throw new Error(
            data?.response
              ? `${data.response.status} ${data.response.statusText}`
              : `Request failed (${resp.status})`,
          );
        }
        return data as {
          status: "ok";
          external: boolean;
          response: {
            status: number;
            statusText: string;
            headers: [string, string][];
            body: string;
          };
        };
      });

      toast.promise(requestPromise, {
        loading: "Sending request...",
        success: (data) => ({
          message: `Request succeeded!`,
          description: `${data.response.status} ${data.response.statusText}`,
        }),
        error: (e) => ({
          message: `Request failed!`,
          description: `Error: ${e}`,
        }),
      });

      return requestPromise;
```

Leave the body-base64 encoding block (lines 112-133) and the `onSuccess` invalidation unchanged.

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test src/request-events/controller.spec.ts`
Expected: PASS (including the existing tests).

- [ ] **Step 6: Compile and format**

Run: `bun run compile` (no new errors in `controller.ts` / `hooks.ts`), then `bun run format`.

- [ ] **Step 7: Commit**

```bash
git add src/request-events/controller.ts src/request-events/controller.spec.ts src/dashboard/hooks.ts
git commit -m "claude: return full response from send route and hook"
```

---

### Task 4: Dashboard UI — external toggle, mode-aware field, and response panel

**Files:**
- Create: `src/components/http-response-view.tsx`
- Modify: `src/dashboard/pages/create-request-page.tsx`

**Interfaces:**
- Consumes: `useSendRequest` mutation `data` (Task 3); the `Switch` component at `src/components/ui/switch.tsx`; `headerNameDisplay` from `@/util/http`.
- Produces: `HttpResponseView` component. No new routes (nothing to register in `src/dashboard/server.ts`).

> No automated test: there is no DOM/browser test env here. Verify via `bun run compile` and code review.

- [ ] **Step 1: Create the response view component**

Create `src/components/http-response-view.tsx`:

```tsx
import { cn } from "@/util/ui";
import { headerNameDisplay } from "@/util/http";

interface HttpResponseViewProps {
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string; // base64-encoded
  className?: string;
}

function decodeBody(body: string): string {
  if (!body) return "";
  try {
    const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return body;
  }
}

export function HttpResponseView({
  status,
  statusText,
  headers,
  body,
  className,
}: HttpResponseViewProps) {
  const decoded = decodeBody(body);
  return (
    <div className={cn("rounded-lg border p-4 space-y-3", className)}>
      <div className="text-sm font-medium">
        Response: {status} {statusText}
      </div>
      {headers.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">
            Headers
          </div>
          <ul className="text-xs font-mono">
            {headers.map(([name, value], i) => (
              <li key={`${name}-${i}`}>
                {headerNameDisplay(name)}: {value}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground">Body</div>
        <pre className="text-xs font-mono whitespace-pre-wrap break-all rounded bg-muted p-2 overflow-x-auto">
          {decoded || "(empty)"}
        </pre>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `src/dashboard/pages/create-request-page.tsx`**

Replace the whole file with:

```tsx
import { useSendRequest } from "@/dashboard/hooks";
import { requestSchema, type HandlerRequest } from "@/webhook-server/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router";
import { CodeEditor } from "@/components/code-editor";
import { KeyValuePairEditor } from "@/components/key-value-pair-editor";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FormCard } from "@/components/form/form-card";
import { HttpMethodSelect } from "@/components/form/http-method-select";
import { TextFormField } from "@/components/form/form-fields";
import { HttpResponseView } from "@/components/http-response-view";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CardFooter } from "@/components/ui/card";

export const CreateRequestPage = () => {
  const [searchParams] = useSearchParams();

  const form = useForm<HandlerRequest>({
    resolver: zodResolver(requestSchema as any), // TODO
    defaultValues: {
      method: (searchParams.get("method") as any) || "GET",
      url: searchParams.get("path") || "/",
      external: false,
      body: null,
      headers: [],
      query: [],
    },
  });
  const sendRequestMutation = useSendRequest();

  const selectedMethod = form.watch("method");
  const external = form.watch("external");
  const methodsWithoutBody = ["GET", "HEAD", "OPTIONS"];
  const bodyDisabled = methodsWithoutBody.includes(selectedMethod);

  useEffect(() => {
    if (bodyDisabled) {
      form.setValue("body", null);
    }
  }, [bodyDisabled, form]);

  const handleSubmit = useCallback(
    (values: HandlerRequest) => {
      sendRequestMutation.mutate({
        method: values.method ?? "GET",
        body: values.body,
        headers: values.headers,
        query: values.query,
        url: values.url ?? "/",
        external: values.external ?? false,
      });
    },
    [sendRequestMutation],
  );

  const sendResult = sendRequestMutation.data;
  const externalResponse =
    sendResult?.external === true ? sendResult.response : null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <FormCard
          className="mt-4"
          title="Test Request"
          description={<>Sends a test request from your browser.</>}
        >
          <div className="space-y-4">
            <HttpMethodSelect
              control={form.control}
              name="method"
              label="Method"
            />
            <FormField
              control={form.control}
              name="external"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Send to an external URL</FormLabel>
                    <FormDescription>
                      When on, enter a fully-qualified URL. External requests are
                      sent anywhere the server can reach and are not captured in
                      the request log.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <TextFormField
              control={form.control}
              name="url"
              label={external ? "URL" : "Path"}
              placeholder={external ? "https://example.com/hook" : "/"}
              type={external ? "url" : "text"}
            />
            <FormField
              control={form.control}
              name="headers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Headers</FormLabel>
                  <FormControl>
                    <KeyValuePairEditor {...field} addButtonText="Add header" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="query"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Query Parameters</FormLabel>
                  <FormControl>
                    <KeyValuePairEditor
                      {...field}
                      addButtonText="Add query parameter"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request body</FormLabel>
                  <FormControl>
                    {bodyDisabled ? (
                      <div className="text-sm text-muted-foreground p-3">
                        The {selectedMethod} method does not support including a
                        request body.
                      </div>
                    ) : (
                      <CodeEditor {...field} defaultLanguage="json" />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <CardFooter className="mt-6">
            <Button type="submit">Send</Button>
          </CardFooter>
        </FormCard>
        {externalResponse && (
          <HttpResponseView
            className="mt-4"
            status={externalResponse.status}
            statusText={externalResponse.statusText}
            headers={externalResponse.headers}
            body={externalResponse.body}
          />
        )}
      </form>
    </Form>
  );
};
```

Notes: the response panel only appears for external sends (internal sends are inspected in the request log, as before). Toggling `external` does not clear the `url` field — if the value no longer matches the mode, the inline validation message ("Enter a fully-qualified http(s) URL" / "Enter an absolute path starting with /") guides the user on submit.

- [ ] **Step 3: Compile and format**

Run: `bun run compile` — expected: no new errors in `create-request-page.tsx` or `http-response-view.tsx`.
Run: `bun run format`

- [ ] **Step 4: Commit**

```bash
git add src/components/http-response-view.tsx src/dashboard/pages/create-request-page.tsx
git commit -m "claude: add external toggle and response panel to test request page"
```

---

### Task 5: MCP `send-http-request` gains an `external` flag

**Files:**
- Modify: `src/mcp/tools/http-requests.ts:17-62`
- Test: `src/mcp/server.spec.ts:245-278` (update existing tests, add one)

**Interfaces:**
- Consumes: `sendWebhookRequest` (Task 2).
- Produces: `send-http-request` tool accepts `external?: boolean` (default `false`) and passes it to `sendWebhookRequest`.

- [ ] **Step 1: Update the two existing send tests and add a validation test**

In `src/mcp/server.spec.ts`, in the `test("send-http-request sends a request that gets captured", ...)` call (around line 248), add `external: true,` to the tool arguments (the `url` is an absolute URL):

```ts
      const { isError, text } = await callTool(client, "send-http-request", {
        method: "POST",
        external: true,
        // Absolute URL targeting the webhook server started by test-setup
        url: `http://localhost:${TEST_PORT}/mcp-send-test`,
        headers: [["Content-Type", "application/json"]],
        query: [["source", "mcp"]],
        body: parseBase64(
          Buffer.from(JSON.stringify({ hello: "mcp" })).toString("base64"),
        ),
      });
```

In `test("send-http-request surfaces connection errors as tool errors", ...)` (around line 272), add `external: true,`:

```ts
      const { isError } = await callTool(client, "send-http-request", {
        method: "GET",
        external: true,
        // Discard port: nothing listens here
        url: "http://localhost:9/unreachable",
      });
      expect(isError).toBe(true);
```

Add a new test immediately after the connection-error test (inside the same `describe`):

```ts
    test("send-http-request rejects an absolute URL when external is omitted", async () => {
      const client = await connectClient();

      const { isError } = await callTool(client, "send-http-request", {
        method: "GET",
        // external defaults to false (internal), which requires a path
        url: "https://example.com/whatever",
      });
      expect(isError).toBe(true);
    });
```

- [ ] **Step 2: Run tests to verify the new test fails**

Run: `bun test src/mcp/server.spec.ts`
Expected: the new "rejects an absolute URL when external is omitted" test FAILS — today an absolute URL is accepted and sent externally, so `isError` is `false`.

- [ ] **Step 3: Add `external` to the tool in `src/mcp/tools/http-requests.ts`**

Update the tool description, input schema, and handler (lines 20-61):

```ts
      title: "Send HTTP request",
      description:
        "Sends a test HTTP request. By default the request targets a path on the webhook server and is captured as a request event (use get-http-request afterwards to inspect the capture). Set external:true to send to an absolute URL on another host; external requests are not captured. Returns the HTTP response.",
      inputSchema: {
        method: z.enum(HTTP_METHODS).describe("HTTP method"),
        external: z
          .boolean()
          .default(false)
          .describe(
            "Send to an external host. false (default) = a path on the webhook server; true = an absolute http(s) URL",
          ),
        url: z
          .string()
          .min(1)
          .describe(
            "Path on the webhook server (e.g. '/my-hook') when external is false, or an absolute http(s) URL when external is true",
          ),
        headers: kvListSchema(z.string())
          .optional()
          .describe("Request headers as [name, value] pairs"),
        query: kvListSchema(z.string())
          .optional()
          .describe("Query parameters as [name, value] pairs"),
        body: z.base64().optional().describe("Base64-encoded request body"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        // Can target absolute URLs and triggers handler code
        openWorldHint: true,
      },
    },
    async ({ method, url, external, headers, query, body }) => {
      const response = await sendWebhookRequest({
        method,
        url,
        external,
        headers: parseKvList(headers ?? [], z.string()),
        query: parseKvList(query ?? [], z.string()),
        body,
      });
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
Expected: PASS (updated capture test, connection-error test, and the new validation test).

- [ ] **Step 5: Compile and format**

Run: `bun run compile` (no new errors in `http-requests.ts`), then `bun run format`.

- [ ] **Step 6: Commit**

```bash
git add src/mcp/tools/http-requests.ts src/mcp/server.spec.ts
git commit -m "claude: add external flag to send-http-request MCP tool"
```

---

### Task 6: Update in-app documentation

**Files:**
- Modify: `src/docs/sending-requests.md`
- Modify: `src/docs/mcp.md:29`

- [ ] **Step 1: Rewrite the "Sending to other hosts" section in `src/docs/sending-requests.md`**

Replace the section that currently begins `## Sending to other hosts` (through the end of that section, before `## From an AI agent`) with:

```markdown
## Sending to other hosts

By default a request is **internal**: the path field takes an absolute path such as `/my-hook`, and `wtt` sends it to its own webhook server, where it is recorded and run through the matching [handlers](./handlers.md).

Turn on **Send to an external URL** to send the request somewhere else. The field then takes a fully-qualified URL such as `https://example.com/hook`, and the request goes to that host. The two modes are enforced — an internal request must be a path, an external request must be a full URL — so you cannot send a request off-box by accident.

Requests to other hosts are **not** captured. Nothing routes them back through the webhook server, so `wtt` shows the response — status, headers, and body — on the page instead of in the request log. This also means `wtt` will send a request anywhere its own network can reach, which is worth remembering before exposing the dashboard.
```

- [ ] **Step 2: Update the "From an AI agent" paragraph in `src/docs/sending-requests.md`**

Replace the first sentence of the `## From an AI agent` section:

```markdown
The [MCP server](./mcp.md) exposes the same capability as `send-http-request`, taking a method, a path (or an absolute URL with `external: true`), optional headers and query parameters, and an optional base64-encoded body. It returns the response status, headers, and base64 body.
```

- [ ] **Step 3: Update the tool table row in `src/docs/mcp.md` (line 29)**

```markdown
| `send-http-request` | Send a test HTTP request to a path on the webhook server, or to an absolute URL with `external: true`. |
```

- [ ] **Step 4: Format and commit**

Run: `bun run format`

```bash
git add src/docs/sending-requests.md src/docs/mcp.md
git commit -m "claude: document internal/external send requests"
```

---

## Final verification

- [ ] Run the full affected suite: `bun test src/webhook-server src/request-events src/mcp`
- [ ] Run `bun run compile` and confirm no new errors beyond the known 17-error baseline.
- [ ] Manually confirm the Test Request page: internal path send behaves as before; toggling **Send to an external URL** relabels the field to "URL" and, after sending, shows the response panel. (No DOM test env — this is a manual/code-review check.)

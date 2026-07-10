import { getAllRequestEvents } from "@/request-events/model";
import { TEST_H2_PORT } from "@/test-config";
import { describe, expect, test } from "bun:test";
import http2 from "node:http2";
import { createHandler } from "@/handlers/model";
import { randomUUID } from "@/util/uuid";

// AIDEV-NOTE: We use a raw node:http2 client rather than fetch() because Bun's
// fetch does not let us assert on HTTP/2-specific behavior (stream ids, pseudo-headers).
interface H2Result {
  status: number;
  body: string;
  headers: http2.IncomingHttpHeaders;
}

async function h2Request(
  path: string,
  options: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  } = {},
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

    const event = getAllRequestEvents().find(
      (e) => e.request_url === "/h2-get",
    );
    expect(event).toBeDefined();
    expect(event?.request_method).toBe("GET");
    expect(event?.request_query_params).toEqual([
      ["a", "1"],
      ["b", "two"],
    ]);
  });

  test("POST request body is captured", async () => {
    const result = await h2Request("/h2-post", {
      method: "POST",
      body: "hello-body",
    });
    expect(result.status).toBe(200);

    const event = getAllRequestEvents().find(
      (e) => e.request_url === "/h2-post",
    );
    expect(event).toBeDefined();
    expect(Buffer.from(event!.request_body!, "base64").toString()).toBe(
      "hello-body",
    );
  });

  test("records http_version 2.0", async () => {
    await h2Request("/h2-version");
    const event = getAllRequestEvents().find(
      (e) => e.request_url === "/h2-version",
    );
    expect(event?.http_version).toBe("2.0");
  });

  test("captures http2_info with stream id, alpn, settings and frame flags", async () => {
    await h2Request("/h2-info");
    const event = getAllRequestEvents().find(
      (e) => e.request_url === "/h2-info",
    );

    const info = event?.http2_info;
    expect(info).toBeDefined();
    expect(info?.alpn_protocol).toBe("h2");
    expect(info?.stream_id).toBeGreaterThan(0);
    expect(typeof info?.weight).toBe("number");
    // A GET with no body sets END_STREAM on the HEADERS frame.
    expect(info?.headers_frame_flags).toEqual({
      end_stream: true,
      end_headers: true,
    });
    expect(info?.local_settings.maxConcurrentStreams).toBeGreaterThan(0);
    expect(info?.remote_settings.initialWindowSize).toBeGreaterThan(0);
  });

  test("captures pseudo-headers and strips them from request_headers", async () => {
    await h2Request("/h2-pseudo", { method: "POST", body: "x" });
    const event = getAllRequestEvents().find(
      (e) => e.request_url === "/h2-pseudo",
    );

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
    const event = getAllRequestEvents().find(
      (e) => e.request_url === "/h2-tls",
    );

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

    const event = getAllRequestEvents().find(
      (e) => e.request_url === "/h2-handler",
    );
    expect(event?.response_status).toBe(201);
  });

  test("response_status_message is null because HTTP/2 has no reason phrase", async () => {
    await h2Request("/h2-no-reason");
    const event = getAllRequestEvents().find(
      (e) => e.request_url === "/h2-no-reason",
    );
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

    const event = getAllRequestEvents().find(
      (e) => e.request_url === "/h2-forbidden",
    );
    const names = (event?.response_headers ?? []).map(([k]) => k.toLowerCase());
    expect(names).not.toContain("connection");
    expect(names).toContain("x-kept");
  });

  test("response header names set by a handler arrive lowercased on the wire", async () => {
    // AIDEV-NOTE: HTTP/2 field names are lowercase on the wire (RFC 9113 8.1.2).
    // Verified on Bun 1.3.14 and Node v24: nghttp2 lowercases them for us, so the
    // adapter deliberately does NOT call toLowerCase() before stream.respond().
    createHandler({
      id: randomUUID(),
      version_id: "1",
      name: "mixed case header",
      method: "GET",
      path: "/h2-header-case",
      code: `resp.headers.push(["X-Mixed-Case", "yes"]); resp.body = "ok";`,
      order: 0,
    });

    const result = await h2Request("/h2-header-case");
    expect(result.status).toBe(200);
    expect(result.headers["x-mixed-case"]).toBe("yes");
  });
});

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

    // AIDEV-NOTE: A stream reset sent BEFORE any HEADERS frame does not reject on
    // the client. Verified on both Bun 1.3.14 and Node v24: the request stream just
    // emits 'end' with no `:status` and an empty body. The runtimes differ only in
    // `rstCode` (Node reports 8 = NGHTTP2_CANCEL; Bun leaves it 0), so the reset
    // *reason* is not portably assertable. Assert the portable observable instead:
    // no response status was ever received.
    const result = await h2Request("/h2-abort");
    expect(result.status).toBe(0);
    expect(result.body).toBe("");

    // Give the server a tick to persist the completed event.
    await new Promise((r) => setTimeout(r, 100));

    const event = getAllRequestEvents().find(
      (e) => e.request_url === "/h2-abort",
    );
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

    // Same as above: the reset arrives before any HEADERS frame, so the client
    // observes a clean 'end' with no `:status` rather than an error.
    const result = await h2Request("/h2-raw");
    expect(result.status).toBe(0);
    expect(result.body).toBe("");

    await new Promise((r) => setTimeout(r, 100));

    const event = getAllRequestEvents().find(
      (e) => e.request_url === "/h2-raw",
    );
    expect(event).toBeDefined();
    expect(event?.status).toBe("complete");
    expect(event?.response_status ?? null).toBeNull();
  });
});

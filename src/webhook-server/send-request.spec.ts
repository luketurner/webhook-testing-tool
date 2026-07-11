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

  test("internal path resolves against an injected base url", () => {
    const target = resolveTargetUrl("/p", false, "http://localhost:12345");
    expect(target.origin).toBe("http://localhost:12345");
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

describe("sendWebhookRequest internal", () => {
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

  test("sends method, headers, query, and body to the local webhook server via an injected base url", async () => {
    const request: HandlerRequest = {
      method: "POST",
      url: "/hook/path",
      external: false,
      headers: [["x-test", "abc"]],
      query: [["q", "1"]],
      body: Buffer.from("hi").toString("base64"),
    };
    const response = await sendWebhookRequest(
      request,
      `http://localhost:${server.port}`,
    );
    expect(response.status).toBe(201);
    expect(received).not.toBeNull();
    expect(received!.method).toBe("POST");
    expect(received!.pathname).toBe("/hook/path");
    expect(received!.query).toBe("1");
    expect(received!.header).toBe("abc");
    expect(received!.body).toBe("hi");
  });
});

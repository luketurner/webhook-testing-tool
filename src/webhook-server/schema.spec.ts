import { describe, test, expect } from "bun:test";
import { requestSchema, requestEventToHandlerRequest } from "./schema";
import { isAbsolutePath, isAbsoluteHttpUrl } from "@/util/http";
import type { RequestEvent } from "@/request-events/schema";
import { randomUUID } from "@/util/uuid";
import { now } from "@/util/datetime";

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
    expect(requestSchema.safeParse({ ...base, url: "/foo" }).success).toBe(
      true,
    );
  });

  test("internal rejects a full url and a protocol-relative url", () => {
    expect(
      requestSchema.safeParse({ ...base, url: "http://x/y" }).success,
    ).toBe(false);
    expect(
      requestSchema.safeParse({ ...base, url: "//evil.com/x" }).success,
    ).toBe(false);
  });

  test("internal rejects a backslash path", () => {
    expect(
      requestSchema.safeParse({ ...base, url: "/\\evil.com/x" }).success,
    ).toBe(false);
  });

  test("external accepts a full http(s) url", () => {
    expect(
      requestSchema.safeParse({ ...base, external: true, url: "https://x/y" })
        .success,
    ).toBe(true);
  });

  test("external rejects a bare path and a non-http scheme", () => {
    expect(
      requestSchema.safeParse({ ...base, external: true, url: "/foo" }).success,
    ).toBe(false);
    expect(
      requestSchema.safeParse({ ...base, external: true, url: "ftp://x/y" })
        .success,
    ).toBe(false);
  });

  test("the validation error is reported on the url field", () => {
    const result = requestSchema.safeParse({ ...base, url: "http://x/y" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["url"]);
    }
  });
});

describe("requestEventToHandlerRequest", () => {
  const baseEvent: RequestEvent = {
    id: randomUUID(),
    type: "inbound",
    status: "complete",
    request_method: "GET",
    request_url: "/foo",
    request_headers: [],
    request_query_params: [],
    request_body: null,
    request_timestamp: now(),
    response_status: 200,
    response_status_message: "OK",
    response_headers: [],
    response_body: null,
    response_timestamp: now(),
  };

  test("an outbound event with a full url resends as external without throwing", () => {
    const outboundEvent: RequestEvent = {
      ...baseEvent,
      id: randomUUID(),
      type: "outbound",
      request_url: "https://example.com/hook",
    };

    let handlerRequest;
    expect(() => {
      handlerRequest = requestEventToHandlerRequest(outboundEvent);
    }).not.toThrow();

    expect(handlerRequest!.external).toBe(true);
    expect(handlerRequest!.url).toBe("https://example.com/hook");
  });

  test("an inbound event with a path resends as internal without throwing", () => {
    const inboundEvent: RequestEvent = {
      ...baseEvent,
      id: randomUUID(),
      type: "inbound",
      request_url: "/foo",
    };

    let handlerRequest;
    expect(() => {
      handlerRequest = requestEventToHandlerRequest(inboundEvent);
    }).not.toThrow();

    expect(handlerRequest!.external).toBe(false);
    expect(handlerRequest!.url).toBe("/foo");
  });
});

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
    const parsed = http2InfoSchema.parse({
      ...VALID_HTTP2_INFO,
      frames: [{ type: "DATA" }],
    });
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
    expect(loaded.http2_info?.pseudo_headers).toContainEqual([
      ":method",
      "POST",
    ]);
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

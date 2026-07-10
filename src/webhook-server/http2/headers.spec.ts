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
    expect(parseHeadersFrameFlags(5)).toEqual({
      end_stream: true,
      end_headers: true,
    });
  });

  test("flags=4 means END_HEADERS only (a POST with a body to follow)", () => {
    expect(parseHeadersFrameFlags(4)).toEqual({
      end_stream: false,
      end_headers: true,
    });
  });

  test("flags=0 means neither", () => {
    expect(parseHeadersFrameFlags(0)).toEqual({
      end_stream: false,
      end_headers: false,
    });
  });
});

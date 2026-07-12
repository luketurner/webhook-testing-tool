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

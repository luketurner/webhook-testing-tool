import { afterEach, describe, expect, test } from "bun:test";
import { randomUUID, uuidSchema } from "./uuid";

const realCrypto = globalThis.crypto;

/**
 * `crypto.randomUUID` is only exposed in a secure context, so it is missing
 * when the dashboard is served over plain HTTP on a LAN or tailnet hostname.
 * `crypto.getRandomValues` is not gated that way and remains available.
 */
function withoutRandomUUID() {
  Object.defineProperty(globalThis, "crypto", {
    value: {
      getRandomValues: (array: Uint8Array) => realCrypto.getRandomValues(array),
    },
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  Object.defineProperty(globalThis, "crypto", {
    value: realCrypto,
    configurable: true,
    writable: true,
  });
});

describe("randomUUID", () => {
  test("returns a valid UUID in a secure context", () => {
    expect(() => uuidSchema.parse(randomUUID())).not.toThrow();
  });

  test("returns a valid UUID when crypto.randomUUID is unavailable", () => {
    withoutRandomUUID();
    expect(() => uuidSchema.parse(randomUUID())).not.toThrow();
  });

  test("fallback sets the version 4 and RFC 4122 variant bits", () => {
    withoutRandomUUID();
    const uuid = randomUUID();

    expect(uuid[14]).toBe("4");
    expect(["8", "9", "a", "b"]).toContain(uuid[19]);
  });

  test("fallback produces unique values", () => {
    withoutRandomUUID();
    const uuids = new Set(Array.from({ length: 1000 }, () => randomUUID()));

    expect(uuids.size).toBe(1000);
  });
});

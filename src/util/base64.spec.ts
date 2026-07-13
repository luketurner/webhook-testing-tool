import { describe, it, expect } from "bun:test";
import { base64ByteLength, fromBufferLike } from "./base64";

describe("base64ByteLength", () => {
  it("returns 0 for an empty string", () => {
    expect(base64ByteLength("")).toBe(0);
  });

  it("returns the decoded byte length, not the base64 string length", () => {
    // "abc" -> "YWJj" (4 chars, 3 bytes)
    expect(base64ByteLength("YWJj")).toBe(3);
    // "hello" -> "aGVsbG8=" (8 chars incl. padding, 5 bytes)
    expect(base64ByteLength("aGVsbG8=")).toBe(5);
    // "hi" -> "aGk=" (4 chars incl. padding, 2 bytes)
    expect(base64ByteLength("aGk=")).toBe(2);
  });

  it("agrees with the real byte length of encoded buffers", () => {
    for (const len of [0, 1, 2, 3, 10, 255, 1024]) {
      const buf = Buffer.alloc(len, 7);
      const encoded = fromBufferLike(buf);
      expect(base64ByteLength(encoded ?? "")).toBe(len);
    }
  });
});

import { expect, test, describe } from "bun:test";
import { encodeRequestCursor, decodeRequestCursor } from "./cursor";
import { randomUUID } from "@/util/uuid";
import { timestampSchema, type Timestamp } from "@/util/datetime";

describe("request-events/cursor", () => {
  test("round-trips a cursor", () => {
    const id = randomUUID();
    const ts = timestampSchema.parse(1_700_000_000_123);
    const encoded = encodeRequestCursor({ request_timestamp: ts, id });
    const decoded = decodeRequestCursor(encoded);
    expect(decoded.request_timestamp).toBe(ts);
    expect(decoded.id).toBe(id);
  });

  test("decodes an id that contains no underscores", () => {
    const id = randomUUID();
    const encoded = `1700000000123_${id}`;
    const decoded = decodeRequestCursor(encoded);
    expect(decoded.id).toBe(id);
    expect(decoded.request_timestamp).toBe(1_700_000_000_123 as Timestamp);
  });

  test("throws on malformed cursor", () => {
    expect(() => decodeRequestCursor("not-a-cursor")).toThrow();
    expect(() => decodeRequestCursor("123_")).toThrow();
  });
});

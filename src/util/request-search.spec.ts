import { expect, test, describe } from "bun:test";
import { matchesRequestSearch } from "./request-search";
import type { RequestEventMeta } from "@/request-events/schema";
import { randomUUID } from "@/util/uuid";
import { now } from "@/util/datetime";

function meta(overrides: Partial<RequestEventMeta> = {}): RequestEventMeta {
  return {
    id: randomUUID(),
    type: "inbound",
    status: "complete",
    request_method: "GET",
    request_url: "/webhooks/stripe",
    request_timestamp: now(),
    response_status: 200,
    ...overrides,
  } as RequestEventMeta;
}

describe("matchesRequestSearch", () => {
  test("empty query matches everything", () => {
    expect(matchesRequestSearch(meta(), "")).toBe(true);
    expect(matchesRequestSearch(meta(), "   ")).toBe(true);
  });

  test("matches on url substring, case-insensitively", () => {
    expect(matchesRequestSearch(meta(), "STRIPE")).toBe(true);
  });

  test("matches on method and status code", () => {
    expect(matchesRequestSearch(meta({ request_method: "POST" }), "post")).toBe(
      true,
    );
    expect(matchesRequestSearch(meta({ response_status: 404 }), "404")).toBe(
      true,
    );
  });

  test("returns false when nothing matches", () => {
    expect(matchesRequestSearch(meta(), "nonexistent")).toBe(false);
  });
});

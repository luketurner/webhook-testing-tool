import { expect, test, describe } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { prependRequestToCache, updateRequestInCache } from "./request-cache";
import type { RequestEventPageResponse } from "./use-infinite-requests";
import type { RequestEventMeta } from "./schema";
import { randomUUID } from "@/util/uuid";
import { now } from "@/util/datetime";

function meta(overrides: Partial<RequestEventMeta> = {}): RequestEventMeta {
  return {
    id: randomUUID(),
    type: "inbound",
    status: "complete",
    request_method: "GET",
    request_url: "/hook",
    request_timestamp: now(),
    response_status: 200,
    ...overrides,
  } as RequestEventMeta;
}

function seedCache(
  qc: QueryClient,
  key: unknown[],
  events: RequestEventMeta[],
) {
  qc.setQueryData(key, {
    pages: [
      { events, nextCursor: null, total: events.length },
    ] as RequestEventPageResponse[],
    pageParams: [null],
  });
}

describe("request-cache", () => {
  test("prepends a created event to page 0 and bumps total", () => {
    const qc = new QueryClient();
    const key = ["requests", { includeArchived: false, search: "" }];
    const existing = meta();
    seedCache(qc, key, [existing]);

    const created = meta({ request_url: "/new" });
    prependRequestToCache(qc, created);

    const data = qc.getQueryData(key) as any;
    expect(data.pages[0].events[0].id).toBe(created.id);
    expect(data.pages[0].events).toHaveLength(2);
    expect(data.pages[0].total).toBe(2);
  });

  test("does not prepend a non-matching search result", () => {
    const qc = new QueryClient();
    const key = ["requests", { includeArchived: false, search: "stripe" }];
    seedCache(qc, key, [meta({ request_url: "/stripe/hook" })]);

    prependRequestToCache(qc, meta({ request_url: "/paypal/hook" }));

    const data = qc.getQueryData(key) as any;
    expect(data.pages[0].events).toHaveLength(1);
  });

  test("does not prepend an archived event to an active-only view", () => {
    const qc = new QueryClient();
    const key = ["requests", { includeArchived: false, search: "" }];
    seedCache(qc, key, [meta()]);

    prependRequestToCache(qc, meta({ archived_timestamp: now() }));

    const data = qc.getQueryData(key) as any;
    expect(data.pages[0].events).toHaveLength(1);
  });

  test("does not double-prepend the same id", () => {
    const qc = new QueryClient();
    const key = ["requests", { includeArchived: false, search: "" }];
    const dupe = meta();
    seedCache(qc, key, [dupe]);

    prependRequestToCache(qc, dupe);

    const data = qc.getQueryData(key) as any;
    expect(data.pages[0].events).toHaveLength(1);
  });

  test("updates an existing event in place", () => {
    const qc = new QueryClient();
    const key = ["requests", { includeArchived: false, search: "" }];
    const original = meta({ status: "running", response_status: undefined });
    seedCache(qc, key, [original]);

    updateRequestInCache(qc, {
      ...original,
      status: "complete",
      response_status: 201,
    });

    const data = qc.getQueryData(key) as any;
    expect(data.pages[0].events[0].status).toBe("complete");
    expect(data.pages[0].events[0].response_status).toBe(201);
  });

  test("ignores single-resource cache entries without pages", () => {
    const qc = new QueryClient();
    const singleKey = ["requests", randomUUID()];
    qc.setQueryData(singleKey, { id: "x" });
    // Should not throw when iterating request queries.
    updateRequestInCache(qc, meta());
    const untouched = qc.getQueryData(singleKey);
    expect(untouched).toEqual({ id: "x" });
  });
});

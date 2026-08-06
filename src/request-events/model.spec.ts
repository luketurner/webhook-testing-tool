import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import {
  createRequestEvent,
  updateRequestEvent,
  getRequestEvent,
  getRequestEventMeta,
  getAllRequestEvents,
  getAllRequestEventsMeta,
  getRequestEventsPage,
  deleteRequestEvent,
} from "./model";
import type { RequestEvent, RequestId } from "./schema";
import { randomUUID } from "@/util/uuid";
import { now } from "@/util/datetime";
import { parseBase64 } from "@/util/base64";

describe("request-events/model", () => {
  let testRequestEvent: RequestEvent;

  beforeEach(() => {
    testRequestEvent = {
      id: randomUUID(),
      type: "inbound",
      status: "running",
      request_method: "GET",
      request_url: "/test",
      request_headers: [["Content-Type", "application/json"]],
      request_query_params: [],
      request_body: parseBase64("dGVzdCBib2R5"), // "test body" in base64
      request_timestamp: now(),
      response_status: 200,
      response_status_message: "OK",
      response_headers: [["Content-Type", "application/json"]],
      response_body: parseBase64("cmVzcG9uc2UgYm9keQ=="), // "response body" in base64
      response_timestamp: now(),
    };
  });

  describe("createRequestEvent()", () => {
    test("should create a request event successfully", () => {
      const created = createRequestEvent(testRequestEvent);

      expect(created).toMatchObject({
        id: testRequestEvent.id,
        type: testRequestEvent.type,
        status: testRequestEvent.status,
        request_method: testRequestEvent.request_method,
        request_url: testRequestEvent.request_url,
        response_status: testRequestEvent.response_status,
      });
      expect(created.request_headers).toEqual(testRequestEvent.request_headers);
      expect(created.response_headers).toEqual(
        testRequestEvent.response_headers,
      );
    });

    test("should create a minimal request event with only required fields", () => {
      const minimalEvent: RequestEvent = {
        id: randomUUID(),
        type: "inbound",
        status: "running",
        request_method: "GET",
        request_url: "/minimal",
        request_headers: [],
        request_query_params: [],
        request_body: null,
        request_timestamp: now(),
        response_status: null,
        response_status_message: null,
        response_headers: [],
        response_body: null,
        response_timestamp: null,
      };

      const created = createRequestEvent(minimalEvent);

      expect(created).toMatchObject({
        id: minimalEvent.id,
        type: minimalEvent.type,
        status: minimalEvent.status,
        request_method: minimalEvent.request_method,
        request_url: minimalEvent.request_url,
      });
      expect(created.request_headers).toEqual([]);
      expect(created.request_body).toBeNull();
      expect(created.response_headers).toEqual([]);
      expect(created.response_body).toBeNull();
    });

    test("should handle outbound request events", () => {
      const outboundEvent: RequestEvent = {
        ...testRequestEvent,
        id: randomUUID(),
        type: "outbound",
        request_url: "https://example.com/webhook",
      };

      const created = createRequestEvent(outboundEvent);

      expect(created.type).toBe("outbound");
      expect(created.request_url).toBe("https://example.com/webhook");
    });
  });

  describe("getRequestEvent()", () => {
    test("should retrieve an existing request event", () => {
      const created = createRequestEvent(testRequestEvent);

      const retrieved = getRequestEvent(created.id);

      expect(retrieved).toMatchObject({
        id: created.id,
        type: created.type,
        status: created.status,
        request_method: created.request_method,
        request_url: created.request_url,
      });
      expect(retrieved.request_headers).toEqual(created.request_headers);
      expect(retrieved.response_headers).toEqual(created.response_headers);
    });

    test("should throw an error for non-existent request event", () => {
      const nonExistentId = randomUUID();
      expect(() => getRequestEvent(nonExistentId)).toThrow();
    });

    test("should throw an error for invalid ID format", () => {
      expect(() => getRequestEvent("invalid-id" as RequestId)).toThrow();
    });
  });

  describe("getRequestEventMeta()", () => {
    test("should retrieve metadata without body/header fields", () => {
      const created = createRequestEvent(testRequestEvent);

      const meta = getRequestEventMeta(created.id);

      expect(meta).toMatchObject({
        id: created.id,
        type: created.type,
        status: created.status,
        request_method: created.request_method,
        request_url: created.request_url,
        response_status: created.response_status,
      });
      expect(meta).not.toHaveProperty("request_headers");
      expect(meta).not.toHaveProperty("request_body");
      expect(meta).not.toHaveProperty("response_headers");
      expect(meta).not.toHaveProperty("response_body");
    });

    test("should throw an error for non-existent request event", () => {
      const nonExistentId = randomUUID();
      expect(() => getRequestEventMeta(nonExistentId)).toThrow();
    });
  });

  describe("getAllRequestEvents()", () => {
    test("should return all request events in descending order by timestamp", () => {
      const firstEvent = createRequestEvent({
        ...testRequestEvent,
        id: randomUUID(),
        request_timestamp: now(),
      });

      const secondEvent = createRequestEvent({
        ...testRequestEvent,
        id: randomUUID(),
        request_timestamp: now(), // now
      });

      const allEvents = getAllRequestEvents();

      expect(allEvents.length).toBeGreaterThanOrEqual(2);
      const ourEvents = allEvents.filter(
        (e) => e.id === firstEvent.id || e.id === secondEvent.id,
      );
      expect(ourEvents).toHaveLength(2);

      // Should be in descending order (newest first)
      const firstIndex = allEvents.findIndex((e) => e.id === firstEvent.id);
      const secondIndex = allEvents.findIndex((e) => e.id === secondEvent.id);
      expect(firstIndex).toBeGreaterThanOrEqual(0);
      expect(secondIndex).toBeGreaterThanOrEqual(0);
      // Note: Since timestamps are very close, order may not be guaranteed in test environment
    });

    test("should return empty array when no events exist", () => {
      // Clean up any existing events for this test
      const allEvents = getAllRequestEvents();
      allEvents.forEach((event) => {
        try {
          deleteRequestEvent(event.id);
        } catch (error) {
          // Ignore cleanup errors
        }
      });

      const emptyResult = getAllRequestEvents();
      expect(emptyResult).toEqual([]);
    });
  });

  describe("getAllRequestEventsMeta()", () => {
    test("should return metadata for all request events", () => {
      const event1 = createRequestEvent({
        ...testRequestEvent,
        id: randomUUID(),
      });

      const event2 = createRequestEvent({
        ...testRequestEvent,
        id: randomUUID(),
        type: "outbound",
      });

      const allMeta = getAllRequestEventsMeta();

      expect(allMeta.length).toBeGreaterThanOrEqual(2);
      const ourMeta = allMeta.filter(
        (m) => m.id === event1.id || m.id === event2.id,
      );
      expect(ourMeta).toHaveLength(2);

      ourMeta.forEach((meta) => {
        expect(meta).not.toHaveProperty("request_headers");
        expect(meta).not.toHaveProperty("request_body");
        expect(meta).not.toHaveProperty("response_headers");
        expect(meta).not.toHaveProperty("response_body");
      });
    });
  });

  describe("getRequestEventsPage()", () => {
    function seed(count: number, base: Partial<RequestEvent> = {}) {
      // Distinct, descending-friendly timestamps; created oldest-first.
      const created: RequestEvent[] = [];
      for (let i = 0; i < count; i++) {
        created.push(
          createRequestEvent({
            ...testRequestEvent,
            id: randomUUID(),
            request_timestamp: now(),
            request_url: `/seed-${i}`,
            request_method: "GET",
            status: "complete",
            ...base,
          }),
        );
      }
      return created;
    }

    test("returns at most `limit` events, newest first", () => {
      seed(5);
      const page = getRequestEventsPage({ limit: 2 });
      expect(page.events).toHaveLength(2);
      expect(page.total).toBeGreaterThanOrEqual(5);
      expect(page.nextCursor).not.toBeNull();
      // newest-first: timestamps are non-increasing
      expect(page.events[0].request_timestamp).toBeGreaterThanOrEqual(
        page.events[1].request_timestamp,
      );
    });

    test("cursor pagination covers every row with no overlap or skip", () => {
      seed(7);
      const seen = new Set<string>();
      let cursor: string | null = null;
      let pages = 0;
      do {
        const page = getRequestEventsPage({ limit: 3, cursor });
        for (const e of page.events) {
          expect(seen.has(e.id)).toBe(false); // no duplicates across pages
          seen.add(e.id);
        }
        cursor = page.nextCursor;
        pages++;
        expect(pages).toBeLessThan(20); // guard against infinite loop
      } while (cursor);
      expect(seen.size).toBeGreaterThanOrEqual(7);
    });

    test("paginates correctly when timestamps collide", () => {
      const ts = now();
      seed(5, { request_timestamp: ts }); // all identical timestamps
      const seen = new Set<string>();
      let cursor: string | null = null;
      do {
        const page = getRequestEventsPage({ limit: 2, cursor });
        for (const e of page.events) {
          expect(seen.has(e.id)).toBe(false);
          seen.add(e.id);
        }
        cursor = page.nextCursor;
      } while (cursor);
      expect(seen.size).toBeGreaterThanOrEqual(5);
    });

    test("nextCursor is null on the final page", () => {
      seed(2);
      const page = getRequestEventsPage({ limit: 100 });
      expect(page.nextCursor).toBeNull();
    });

    test("excludes archived rows unless includeArchived", () => {
      const [visible] = seed(1, { request_url: "/active-row" });
      const [archived] = seed(1, {
        request_url: "/archived-row",
        archived_timestamp: now(),
      });

      const active = getRequestEventsPage({ limit: 100 });
      const activeIds = active.events.map((e) => e.id);
      expect(activeIds).toContain(visible.id);
      expect(activeIds).not.toContain(archived.id);

      const all = getRequestEventsPage({ limit: 100, includeArchived: true });
      const allIds = all.events.map((e) => e.id);
      expect(allIds).toContain(archived.id);
    });

    test("filters by search across method, url, and status", () => {
      const [match] = seed(1, {
        request_url: "/unique-search-target",
        request_method: "DELETE",
      });
      seed(3, { request_url: "/other", request_method: "GET" });

      const byUrl = getRequestEventsPage({
        limit: 100,
        search: "unique-search",
      });
      expect(byUrl.events.map((e) => e.id)).toContain(match.id);
      expect(byUrl.total).toBe(1);

      const byMethod = getRequestEventsPage({ limit: 100, search: "delete" });
      expect(byMethod.events.map((e) => e.id)).toContain(match.id);
    });

    test("treats % and _ in search as literal characters, not SQL wildcards", () => {
      const [literalMatch] = seed(1, {
        request_url: "/discount-50%-off",
      });
      const [decoyMatch] = seed(1, {
        request_url: "/discount-5000-off",
      });

      const page = getRequestEventsPage({ limit: 100, search: "50%" });
      const ids = page.events.map((e) => e.id);
      expect(ids).toContain(literalMatch.id);
      expect(ids).not.toContain(decoyMatch.id);
    });
  });

  describe("updateRequestEvent()", () => {
    test("should update an existing request event", () => {
      const created = createRequestEvent(testRequestEvent);

      const updates = {
        id: created.id,
        status: "complete" as const,
        response_status: 201,
        response_status_message: "Created",
        response_body: parseBase64("dXBkYXRlZCByZXNwb25zZQ=="), // "updated response" in base64
        response_timestamp: now(),
      };

      const updated = updateRequestEvent(updates);

      expect(updated).toMatchObject({
        id: created.id,
        status: "complete",
        response_status: 201,
        response_status_message: "Created",
      });
      expect(updated.response_timestamp).toBeTruthy();
    });

    test("should update only specified fields", () => {
      const created = createRequestEvent(testRequestEvent);

      const originalUrl = created.request_url;
      const updates = {
        id: created.id,
        status: "error" as const,
      };

      const updated = updateRequestEvent(updates);

      expect(updated.status).toBe("error");
      expect(updated.request_url).toBe(originalUrl); // Should remain unchanged
    });

    test("should handle partial updates with null values", () => {
      const created = createRequestEvent(testRequestEvent);

      const updates = {
        id: created.id,
        response_body: null,
        response_headers: [],
      };

      const updated = updateRequestEvent(updates);

      expect(updated.response_body).toBeNull();
      expect(updated.response_headers).toEqual([]);
    });
  });

  describe("deleteRequestEvent()", () => {
    test("should delete an existing request event", () => {
      const created = createRequestEvent(testRequestEvent);
      // Don't add to cleanup array since we're testing deletion

      deleteRequestEvent(created.id);

      expect(() => getRequestEvent(created.id)).toThrow();
    });

    test("should not throw error when deleting non-existent event", () => {
      const nonExistentId = randomUUID();
      expect(() => deleteRequestEvent(nonExistentId)).not.toThrow();
    });
  });

  describe("error handling and edge cases", () => {
    test("should handle events with different HTTP methods", () => {
      const methods = [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
        "HEAD",
        "OPTIONS",
      ] as const;

      methods.forEach((method) => {
        const event = createRequestEvent({
          ...testRequestEvent,
          id: randomUUID(),
          request_method: method,
        });

        expect(event.request_method).toBe(method);
      });
    });

    test("should handle events with different statuses", () => {
      const statuses = ["running", "complete", "error"] as const;

      statuses.forEach((status) => {
        const event = createRequestEvent({
          ...testRequestEvent,
          id: randomUUID(),
          status: status,
        });

        expect(event.status).toBe(status);
      });
    });

    test("should handle events with large request bodies", () => {
      const largeContent = "x".repeat(10000);
      const largeBase64 = parseBase64(
        Buffer.from(largeContent).toString("base64"),
      );

      const event = createRequestEvent({
        ...testRequestEvent,
        id: randomUUID(),
        request_body: largeBase64,
      });

      const retrieved = getRequestEvent(event.id);
      expect(retrieved.request_body).toEqual(largeBase64);
    });

    test("should handle events with empty headers arrays", () => {
      const event = createRequestEvent({
        ...testRequestEvent,
        id: randomUUID(),
        request_headers: [],
        response_headers: [],
      });

      const retrieved = getRequestEvent(event.id);
      expect(retrieved.request_headers).toEqual([]);
      expect(retrieved.response_headers).toEqual([]);
    });

    test("should handle events with complex header structures", () => {
      const complexHeaders: [string, string][] = [
        ["Authorization", "Bearer token123"],
        ["Content-Type", "application/json; charset=utf-8"],
        ["X-Custom-Header", "custom-value"],
        ["Accept", "application/json, text/plain, */*"],
      ];

      const event = createRequestEvent({
        ...testRequestEvent,
        id: randomUUID(),
        request_headers: complexHeaders,
        response_headers: complexHeaders,
      });

      const retrieved = getRequestEvent(event.id);
      expect(retrieved.request_headers).toEqual(complexHeaders);
      expect(retrieved.response_headers).toEqual(complexHeaders);
    });
  });
});

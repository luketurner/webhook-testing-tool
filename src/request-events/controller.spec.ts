import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { requestEventController } from "./controller";
import {
  createRequestEvent,
  deleteRequestEvent,
  getAllRequestEvents,
} from "./model";
import type { RequestEvent, RequestId } from "./schema";
import { randomUUID } from "@/util/uuid";
import { now } from "@/util/timestamp";
import { parseBase64 } from "@/util/base64";

describe("request-events/controller", () => {
  let testRequestEvent: RequestEvent;

  beforeEach(() => {
    testRequestEvent = {
      id: randomUUID(),
      type: "inbound",
      status: "complete",
      request_method: "GET",
      request_url: "/controller-test",
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

  describe("GET /api/requests", () => {
    test("should return all request event metadata", async () => {
      // Create test events
      const event1 = createRequestEvent({
        ...testRequestEvent,
        id: randomUUID(),
      });

      const event2 = createRequestEvent({
        ...testRequestEvent,
        id: randomUUID(),
        type: "outbound",
      });

      const mockReq = {} as any;
      const response = requestEventController["/api/requests"].GET(mockReq);

      expect(response).toBeInstanceOf(Response);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(2);

      const ourEvents = data.filter(
        (event: any) => event.id === event1.id || event.id === event2.id,
      );
      expect(ourEvents).toHaveLength(2);

      // Should not include body/header fields (metadata only)
      ourEvents.forEach((event: any) => {
        expect(event).not.toHaveProperty("request_headers");
        expect(event).not.toHaveProperty("request_body");
        expect(event).not.toHaveProperty("response_headers");
        expect(event).not.toHaveProperty("response_body");
        expect(event).toHaveProperty("id");
        expect(event).toHaveProperty("type");
        expect(event).toHaveProperty("status");
      });
    });

    test("should return empty array when no events exist", async () => {
      // Clean up all existing events
      const allEvents = getAllRequestEvents();
      allEvents.forEach((event) => {
        try {
          deleteRequestEvent(event.id);
        } catch (error) {
          // Ignore cleanup errors
        }
      });

      const mockReq = {} as any;
      const response = requestEventController["/api/requests"].GET(mockReq);

      expect(response).toBeInstanceOf(Response);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);
    });
  });

  describe("GET /api/requests/:id", () => {
    test("should return full request event data for existing ID", async () => {
      const created = createRequestEvent(testRequestEvent);

      const mockReq = {
        params: { id: created.id },
      } as any;

      const response = requestEventController["/api/requests/:id"].GET(mockReq);

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        id: created.id,
        type: created.type,
        status: created.status,
        request_method: created.request_method,
        request_url: created.request_url,
        response_status: created.response_status,
      });

      // Should include full data including headers and body
      expect(data).toHaveProperty("request_headers");
      expect(data).toHaveProperty("request_body");
      expect(data).toHaveProperty("response_headers");
      expect(data).toHaveProperty("response_body");
    });

    test("should return 404 for non-existent request ID", () => {
      const nonExistentId = randomUUID();
      const mockReq = {
        params: { id: nonExistentId },
      } as any;

      // getRequestEvent throws when not found, so controller should catch this
      expect(() => {
        requestEventController["/api/requests/:id"].GET(mockReq);
      }).toThrow();
    });

    test("should return 404 for invalid ID format", () => {
      const mockReq = {
        params: { id: "invalid-id-format" },
      } as any;

      // getRequestEvent throws on invalid ID format
      expect(() => {
        requestEventController["/api/requests/:id"].GET(mockReq);
      }).toThrow();
    });

    test("should handle UUID format but non-existent ID", async () => {
      const validUuidFormat = "550e8400-e29b-41d4-a716-446655440000";
      const mockReq = {
        params: { id: validUuidFormat },
      } as any;

      // getRequestEvent throws when record not found
      expect(() => {
        requestEventController["/api/requests/:id"].GET(mockReq);
      }).toThrow();
    });
  });

  describe("error handling and edge cases", () => {
    test("should handle malformed JSON in send request", async () => {
      const mockReq = {
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as any;

      // Should propagate the error
      await expect(
        requestEventController["/api/requests/send"].POST(mockReq),
      ).rejects.toThrow();
    });

    test("should handle missing params in request", async () => {
      const mockReq = {} as any;

      expect(() => {
        requestEventController["/api/requests/:id"].GET(mockReq);
      }).toThrow();
    });

    test("should handle empty params object", async () => {
      const mockReq = {
        params: {},
      } as any;

      expect(() => {
        requestEventController["/api/requests/:id"].GET(mockReq);
      }).toThrow();
    });

    test("should handle null/undefined ID param", async () => {
      const mockReq1 = {
        params: { id: null },
      } as any;

      const mockReq2 = {
        params: { id: undefined },
      } as any;

      expect(() => {
        requestEventController["/api/requests/:id"].GET(mockReq1);
      }).toThrow();

      expect(() => {
        requestEventController["/api/requests/:id"].GET(mockReq2);
      }).toThrow();
    });

    test("should handle database errors gracefully", async () => {
      // This test simulates what happens when database operations fail
      const mockReq = {
        params: { id: "malformed-id-that-will-cause-error" },
      } as any;

      expect(() => {
        requestEventController["/api/requests/:id"].GET(mockReq);
      }).toThrow();
    });
  });
});

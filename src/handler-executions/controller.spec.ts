import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { handlerExecutionController } from "./controller";
import { createHandlerExecution, deleteHandlerExecution } from "./model";
import { createRequestEvent, deleteRequestEvent } from "@/request-events/model";
import type { HandlerExecution, HandlerExecutionId } from "./schema";
import { randomUUID, type UUID } from "@/util/uuid";
import { now } from "@/util/timestamp";

describe("handler-executions controller", () => {
  let createdHandlerExecutionIds: HandlerExecutionId[] = [];
  let createdRequestEventIds: string[] = [];

  const createTestRequestEvent = () => {
    const requestEvent = {
      id: randomUUID(),
      type: "inbound" as const,
      status: "complete" as const,
      request_method: "GET" as const,
      request_url: "https://example.com/test",
      request_headers: [],
      request_body: null,
      request_timestamp: now(),
      response_status: 200,
      response_status_message: "OK",
      response_headers: [],
      response_body: null,
      response_timestamp: now(),
    };
    const created = createRequestEvent(requestEvent as any);
    createdRequestEventIds.push(created.id);
    return created;
  };

  const createTestHandlerExecution = (
    overrides: Partial<HandlerExecution> = {},
  ): HandlerExecution => {
    const requestEvent = createTestRequestEvent();
    const execution = {
      id: randomUUID(),
      handler_id: "test-handler",
      request_event_id: requestEvent.id,
      order: 0,
      timestamp: now(),
      status: "success" as const,
      error_message: null,
      response_data: null,
      locals_data: null,
      ...overrides,
    };
    const created = createHandlerExecution(execution as HandlerExecution);
    createdHandlerExecutionIds.push(created.id);
    return created;
  };

  afterEach(() => {
    createdHandlerExecutionIds.forEach((id) => {
      try {
        deleteHandlerExecution(id);
      } catch (error) {
        // Ignore errors during cleanup
      }
    });
    createdHandlerExecutionIds = [];

    createdRequestEventIds.forEach((id) => {
      try {
        deleteRequestEvent(id as UUID);
      } catch (error) {
        // Ignore errors during cleanup
      }
    });
    createdRequestEventIds = [];
  });

  describe("GET /api/requests/:requestId/handler-executions", () => {
    const getHandler =
      handlerExecutionController["/api/requests/:requestId/handler-executions"]
        .GET;

    test("returns handler executions for valid request ID", () => {
      const requestEvent = createTestRequestEvent();
      const execution1 = createTestHandlerExecution({
        request_event_id: requestEvent.id,
        order: 0,
        handler_id: "handler-1",
      });
      const execution2 = createTestHandlerExecution({
        request_event_id: requestEvent.id,
        order: 1,
        handler_id: "handler-2",
      });

      const mockReq = {
        params: { requestId: requestEvent.id },
      } as any;

      const response = getHandler(mockReq);
      expect(response).toBeInstanceOf(Response);

      // AIDEV-NOTE: Parse response JSON to verify content
      const jsonPromise = response.json();
      return jsonPromise.then((data) => {
        expect(Array.isArray(data)).toBe(true);
        expect(data).toHaveLength(2);
        expect(data[0].id).toBe(execution1.id);
        expect(data[1].id).toBe(execution2.id);
        expect(data[0].order).toBe(0);
        expect(data[1].order).toBe(1);
      });
    });

    test("returns empty array for request with no handler executions", () => {
      const requestEvent = createTestRequestEvent();
      const mockReq = {
        params: { requestId: requestEvent.id },
      } as any;

      const response = getHandler(mockReq);
      expect(response).toBeInstanceOf(Response);

      const jsonPromise = response.json();
      return jsonPromise.then((data) => {
        expect(Array.isArray(data)).toBe(true);
        expect(data).toHaveLength(0);
      });
    });

    test("returns empty array for non-existent request ID", () => {
      const nonExistentId = randomUUID();
      const mockReq = {
        params: { requestId: nonExistentId },
      } as any;

      const response = getHandler(mockReq);
      expect(response).toBeInstanceOf(Response);

      const jsonPromise = response.json();
      return jsonPromise.then((data) => {
        expect(Array.isArray(data)).toBe(true);
        expect(data).toHaveLength(0);
      });
    });

    test("returns handler executions ordered by order field", () => {
      const requestEvent = createTestRequestEvent();
      const execution3 = createTestHandlerExecution({
        request_event_id: requestEvent.id,
        order: 3,
        handler_id: "handler-3",
      });
      const execution1 = createTestHandlerExecution({
        request_event_id: requestEvent.id,
        order: 1,
        handler_id: "handler-1",
      });
      const execution2 = createTestHandlerExecution({
        request_event_id: requestEvent.id,
        order: 2,
        handler_id: "handler-2",
      });

      const mockReq = {
        params: { requestId: requestEvent.id },
      } as any;

      const response = getHandler(mockReq);
      const jsonPromise = response.json();
      return jsonPromise.then((data) => {
        expect(data).toHaveLength(3);
        expect(data[0].order).toBe(1);
        expect(data[1].order).toBe(2);
        expect(data[2].order).toBe(3);
        expect(data[0].handler_id).toBe("handler-1");
        expect(data[1].handler_id).toBe("handler-2");
        expect(data[2].handler_id).toBe("handler-3");
      });
    });

    test("returns handler executions with all data fields", () => {
      const requestEvent = createTestRequestEvent();
      const execution = createTestHandlerExecution({
        request_event_id: requestEvent.id,
        status: "error",
        error_message: "Test error message",
        response_data: JSON.stringify({ result: "failure" }),
        locals_data: JSON.stringify({ debug: "test data" }),
      });

      const mockReq = {
        params: { requestId: requestEvent.id },
      } as any;

      const response = getHandler(mockReq);
      const jsonPromise = response.json();
      return jsonPromise.then((data) => {
        expect(data).toHaveLength(1);
        const result = data[0];
        expect(result.id).toBe(execution.id);
        expect(result.status).toBe("error");
        expect(result.error_message).toBe("Test error message");
        expect(result.response_data).toBe(
          JSON.stringify({ result: "failure" }),
        );
        expect(result.locals_data).toBe(JSON.stringify({ debug: "test data" }));
      });
    });

    test("handles missing request ID parameter gracefully", () => {
      const mockReq = {
        params: {},
      } as any;

      const response = getHandler(mockReq);
      expect(response).toBeInstanceOf(Response);

      const jsonPromise = response.json();
      return jsonPromise.then((data) => {
        expect(Array.isArray(data)).toBe(true);
        expect(data).toHaveLength(0);
      });
    });

    test("handles undefined request ID parameter", () => {
      const mockReq = {
        params: { requestId: undefined },
      } as any;

      const response = getHandler(mockReq);
      expect(response).toBeInstanceOf(Response);

      const jsonPromise = response.json();
      return jsonPromise.then((data) => {
        expect(Array.isArray(data)).toBe(true);
        expect(data).toHaveLength(0);
      });
    });

    test("handles null request ID parameter", () => {
      const mockReq = {
        params: { requestId: null },
      } as any;

      const response = getHandler(mockReq);
      expect(response).toBeInstanceOf(Response);

      const jsonPromise = response.json();
      return jsonPromise.then((data) => {
        expect(Array.isArray(data)).toBe(true);
        expect(data).toHaveLength(0);
      });
    });

    test("handles invalid UUID format in request ID", () => {
      const mockReq = {
        params: { requestId: "invalid-uuid-format" },
      } as any;

      const response = getHandler(mockReq);
      expect(response).toBeInstanceOf(Response);

      const jsonPromise = response.json();
      return jsonPromise.then((data) => {
        expect(Array.isArray(data)).toBe(true);
        expect(data).toHaveLength(0);
      });
    });

    test("handles empty string request ID", () => {
      const mockReq = {
        params: { requestId: "" },
      } as any;

      const response = getHandler(mockReq);
      expect(response).toBeInstanceOf(Response);

      const jsonPromise = response.json();
      return jsonPromise.then((data) => {
        expect(Array.isArray(data)).toBe(true);
        expect(data).toHaveLength(0);
      });
    });

    test("returns Response with correct content type", () => {
      const requestEvent = createTestRequestEvent();
      const mockReq = {
        params: { requestId: requestEvent.id },
      } as any;

      const response = getHandler(mockReq);
      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
    });

    test("filters out handler executions from other requests", () => {
      const requestEvent1 = createTestRequestEvent();
      const requestEvent2 = createTestRequestEvent();

      const execution1 = createTestHandlerExecution({
        request_event_id: requestEvent1.id,
        handler_id: "handler-1",
      });
      const execution2 = createTestHandlerExecution({
        request_event_id: requestEvent2.id,
        handler_id: "handler-2",
      });

      const mockReq = {
        params: { requestId: requestEvent1.id },
      } as any;

      const response = getHandler(mockReq);
      const jsonPromise = response.json();
      return jsonPromise.then((data) => {
        expect(data).toHaveLength(1);
        expect(data[0].id).toBe(execution1.id);
        expect(data[0].handler_id).toBe("handler-1");
      });
    });
  });
});

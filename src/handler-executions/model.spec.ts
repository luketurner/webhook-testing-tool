import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  getHandlerExecution,
  getHandlerExecutionsByRequestId,
  getHandlerExecutionsByHandlerId,
  getAllHandlerExecutions,
  getAllHandlerExecutionsMeta,
  createHandlerExecution,
  updateHandlerExecution,
  deleteHandlerExecution,
  deleteHandlerExecutionsByRequestId,
} from "./model";
import type { HandlerExecution, HandlerExecutionId } from "./schema";
import { randomUUID, type UUID } from "@/util/uuid";
import { now, timestampSchema } from "@/util/timestamp";
import { createRequestEvent, deleteRequestEvent } from "@/request-events/model";

describe("handler-executions model", () => {
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

  describe("createHandlerExecution", () => {
    test("creates handler execution with valid data", () => {
      const requestEvent = createTestRequestEvent();
      const execution: HandlerExecution = {
        id: randomUUID(),
        handler_id: "test-handler",
        request_event_id: requestEvent.id,
        order: 0,
        timestamp: now(),
        status: "success",
        error_message: null,
        response_data: null,
        locals_data: null,
      };

      const result = createHandlerExecution(execution);
      createdHandlerExecutionIds.push(result.id);

      expect(result).toMatchObject(execution);
      expect(result.id).toBe(execution.id);
    });

    test("creates handler execution with error data", () => {
      const requestEvent = createTestRequestEvent();
      const execution: HandlerExecution = {
        id: randomUUID(),
        handler_id: "error-handler",
        request_event_id: requestEvent.id,
        order: 1,
        timestamp: now(),
        status: "error",
        error_message: "Handler execution failed",
        response_data: null,
        locals_data: JSON.stringify({ debug: "info" }),
      };

      const result = createHandlerExecution(execution);
      createdHandlerExecutionIds.push(result.id);

      expect(result.status).toBe("error");
      expect(result.error_message).toBe("Handler execution failed");
      expect(result.locals_data).toBe(JSON.stringify({ debug: "info" }));
    });

    test("throws when creating handler execution with invalid request_event_id", () => {
      const execution: HandlerExecution = {
        id: randomUUID(),
        handler_id: "test-handler",
        request_event_id: randomUUID(), // Non-existent request event
        order: 0,
        timestamp: now(),
        status: "success",
        error_message: null,
        response_data: null,
        locals_data: null,
      };

      expect(() => createHandlerExecution(execution)).toThrow();
    });
  });

  describe("getHandlerExecution", () => {
    test("retrieves existing handler execution", () => {
      const created = createTestHandlerExecution();
      const retrieved = getHandlerExecution(created.id);

      expect(retrieved).toMatchObject(created);
      expect(retrieved.id).toBe(created.id);
    });

    test("throws when handler execution does not exist", () => {
      const nonExistentId = randomUUID();
      expect(() => getHandlerExecution(nonExistentId)).toThrow();
    });
  });

  describe("getHandlerExecutionsByRequestId", () => {
    test("retrieves handler executions for specific request event", () => {
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

      const results = getHandlerExecutionsByRequestId(requestEvent.id);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe(execution1.id);
      expect(results[1].id).toBe(execution2.id);
      expect(results[0].order).toBe(0);
      expect(results[1].order).toBe(1);
    });

    test("returns empty array for request with no handler executions", () => {
      const requestEvent = createTestRequestEvent();
      const results = getHandlerExecutionsByRequestId(requestEvent.id);

      expect(results).toEqual([]);
    });

    test("returns empty array for non-existent request event", () => {
      const nonExistentId = randomUUID();
      const results = getHandlerExecutionsByRequestId(nonExistentId);

      expect(results).toEqual([]);
    });

    test("orders results by order field ascending", () => {
      const requestEvent = createTestRequestEvent();
      const execution3 = createTestHandlerExecution({
        request_event_id: requestEvent.id,
        order: 3,
      });
      const execution1 = createTestHandlerExecution({
        request_event_id: requestEvent.id,
        order: 1,
      });
      const execution2 = createTestHandlerExecution({
        request_event_id: requestEvent.id,
        order: 2,
      });

      const results = getHandlerExecutionsByRequestId(requestEvent.id);

      expect(results).toHaveLength(3);
      expect(results[0].order).toBe(1);
      expect(results[1].order).toBe(2);
      expect(results[2].order).toBe(3);
    });
  });

  describe("getHandlerExecutionsByHandlerId", () => {
    test("retrieves handler executions for specific handler", () => {
      const handlerId = "specific-handler";
      const execution1 = createTestHandlerExecution({ handler_id: handlerId });
      const execution2 = createTestHandlerExecution({ handler_id: handlerId });
      createTestHandlerExecution({ handler_id: "other-handler" });

      const results = getHandlerExecutionsByHandlerId(handlerId);

      expect(results).toHaveLength(2);
      expect(results.every((e) => e.handler_id === handlerId)).toBe(true);
    });

    test("returns empty array for handler with no executions", () => {
      const results = getHandlerExecutionsByHandlerId("non-existent-handler");
      expect(results).toEqual([]);
    });

    test("orders results by timestamp descending", () => {
      const handlerId = "time-test-handler";
      const timestamp1 = timestampSchema.parse(Date.now() - 1000);
      const timestamp2 = now();

      const execution1 = createTestHandlerExecution({
        handler_id: handlerId,
        timestamp: timestamp1,
      });
      const execution2 = createTestHandlerExecution({
        handler_id: handlerId,
        timestamp: timestamp2,
      });

      const results = getHandlerExecutionsByHandlerId(handlerId);

      expect(results).toHaveLength(2);
      expect(results[0].timestamp).toBeGreaterThanOrEqual(results[1].timestamp);
    });
  });

  describe("getAllHandlerExecutions", () => {
    test("retrieves all handler executions", () => {
      const initialCount = getAllHandlerExecutions().length;

      createTestHandlerExecution();
      createTestHandlerExecution();

      const results = getAllHandlerExecutions();
      expect(results.length).toBe(initialCount + 2);
    });

    test("orders results by timestamp descending", () => {
      const timestamp1 = timestampSchema.parse(Date.now() - 1000);
      const timestamp2 = now();

      createTestHandlerExecution({ timestamp: timestamp1 });
      createTestHandlerExecution({ timestamp: timestamp2 });

      const results = getAllHandlerExecutions();
      const recentResults = results.slice(0, 2);

      expect(recentResults[0].timestamp).toBeGreaterThanOrEqual(
        recentResults[1].timestamp,
      );
    });
  });

  describe("getAllHandlerExecutionsMeta", () => {
    test("retrieves all handler executions without data fields", () => {
      createTestHandlerExecution({
        error_message: "Test error",
        response_data: JSON.stringify({ test: "data" }),
        locals_data: JSON.stringify({ local: "data" }),
      });

      const results = getAllHandlerExecutionsMeta();
      expect(results.length).toBeGreaterThan(0);

      const firstResult = results[0];
      expect(firstResult).not.toHaveProperty("error_message");
      expect(firstResult).not.toHaveProperty("response_data");
      expect(firstResult).not.toHaveProperty("locals_data");
      expect(firstResult).toHaveProperty("id");
      expect(firstResult).toHaveProperty("handler_id");
    });
  });

  describe("updateHandlerExecution", () => {
    test("updates handler execution status", () => {
      const created = createTestHandlerExecution({ status: "running" });

      const updated = updateHandlerExecution({
        id: created.id,
        status: "success",
      });

      expect(updated.status).toBe("success");
      expect(updated.id).toBe(created.id);
    });

    test("updates handler execution with error", () => {
      const created = createTestHandlerExecution({ status: "running" });

      const updated = updateHandlerExecution({
        id: created.id,
        status: "error",
        error_message: "Execution failed",
      });

      expect(updated.status).toBe("error");
      expect(updated.error_message).toBe("Execution failed");
    });

    test("updates handler execution response data", () => {
      const created = createTestHandlerExecution();
      const responseData = JSON.stringify({ result: "success" });

      const updated = updateHandlerExecution({
        id: created.id,
        response_data: responseData,
      });

      expect(updated.response_data).toBe(responseData);
    });

    test("throws when updating non-existent handler execution", () => {
      const nonExistentId = randomUUID();

      expect(() =>
        updateHandlerExecution({
          id: nonExistentId,
          status: "success",
        }),
      ).toThrow();
    });
  });

  describe("deleteHandlerExecution", () => {
    test("deletes existing handler execution", () => {
      const created = createTestHandlerExecution();

      deleteHandlerExecution(created.id);

      expect(() => getHandlerExecution(created.id)).toThrow();
      createdHandlerExecutionIds = createdHandlerExecutionIds.filter(
        (id) => id !== created.id,
      );
    });

    test("does not throw when deleting non-existent handler execution", () => {
      const nonExistentId = randomUUID();
      expect(() => deleteHandlerExecution(nonExistentId)).not.toThrow();
    });
  });

  describe("deleteHandlerExecutionsByRequestId", () => {
    test("deletes all handler executions for request event", () => {
      const requestEvent = createTestRequestEvent();
      const execution1 = createTestHandlerExecution({
        request_event_id: requestEvent.id,
      });
      const execution2 = createTestHandlerExecution({
        request_event_id: requestEvent.id,
      });

      deleteHandlerExecutionsByRequestId(requestEvent.id);

      expect(() => getHandlerExecution(execution1.id)).toThrow();
      expect(() => getHandlerExecution(execution2.id)).toThrow();
      createdHandlerExecutionIds = createdHandlerExecutionIds.filter(
        (id) => id !== execution1.id && id !== execution2.id,
      );
    });

    test("does not affect handler executions for other request events", () => {
      const requestEvent1 = createTestRequestEvent();
      const requestEvent2 = createTestRequestEvent();
      const execution1 = createTestHandlerExecution({
        request_event_id: requestEvent1.id,
      });
      const execution2 = createTestHandlerExecution({
        request_event_id: requestEvent2.id,
      });

      deleteHandlerExecutionsByRequestId(requestEvent1.id);

      expect(() => getHandlerExecution(execution1.id)).toThrow();
      expect(() => getHandlerExecution(execution2.id)).not.toThrow();
      createdHandlerExecutionIds = createdHandlerExecutionIds.filter(
        (id) => id !== execution1.id,
      );
    });

    test("does not throw when deleting from non-existent request event", () => {
      const nonExistentId = randomUUID();
      expect(() =>
        deleteHandlerExecutionsByRequestId(nonExistentId),
      ).not.toThrow();
    });
  });
});

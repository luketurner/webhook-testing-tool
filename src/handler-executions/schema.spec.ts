import { describe, test, expect } from "bun:test";
import {
  handlerExecutionSchema,
  handlerExecutionMetaSchema,
  HANDLER_EXECUTION_STATUSES,
  type HandlerExecution,
  type HandlerExecutionMeta,
} from "./schema";
import { randomUUID } from "@/util/uuid";
import { now } from "@/util/timestamp";

describe("handler-executions schema", () => {
  const validHandlerExecution = {
    id: randomUUID(),
    handler_id: "test-handler",
    request_event_id: randomUUID(),
    order: 0,
    timestamp: now(),
    status: "success" as const,
    error_message: null,
    response_data: null,
    locals_data: null,
  };

  describe("handlerExecutionSchema", () => {
    test("validates valid handler execution", () => {
      const result = handlerExecutionSchema.parse(validHandlerExecution);
      expect(result).toMatchObject(validHandlerExecution);
    });

    test("validates handler execution with all optional fields", () => {
      const withData = {
        ...validHandlerExecution,
        error_message: "Test error",
        response_data: JSON.stringify({ test: "data" }),
        locals_data: JSON.stringify({ local: "data" }),
      };
      const result = handlerExecutionSchema.parse(withData);
      expect(result).toMatchObject(withData);
    });

    test("validates all handler execution statuses", () => {
      HANDLER_EXECUTION_STATUSES.forEach((status) => {
        const execution = { ...validHandlerExecution, status };
        const result = handlerExecutionSchema.parse(execution);
        expect(result.status).toBe(status);
      });
    });

    test("requires id field", () => {
      const { id, ...withoutId } = validHandlerExecution;
      expect(() => handlerExecutionSchema.parse(withoutId)).toThrow();
    });

    test("requires handler_id field", () => {
      const { handler_id, ...withoutHandlerId } = validHandlerExecution;
      expect(() => handlerExecutionSchema.parse(withoutHandlerId)).toThrow();
    });

    test("requires request_event_id field", () => {
      const { request_event_id, ...withoutRequestEventId } =
        validHandlerExecution;
      expect(() =>
        handlerExecutionSchema.parse(withoutRequestEventId),
      ).toThrow();
    });

    test("requires order field", () => {
      const { order, ...withoutOrder } = validHandlerExecution;
      expect(() => handlerExecutionSchema.parse(withoutOrder)).toThrow();
    });

    test("requires timestamp field", () => {
      const { timestamp, ...withoutTimestamp } = validHandlerExecution;
      expect(() => handlerExecutionSchema.parse(withoutTimestamp)).toThrow();
    });

    test("requires status field", () => {
      const { status, ...withoutStatus } = validHandlerExecution;
      expect(() => handlerExecutionSchema.parse(withoutStatus)).toThrow();
    });

    test("rejects invalid UUID for id", () => {
      const invalidId = { ...validHandlerExecution, id: "invalid-uuid" };
      expect(() => handlerExecutionSchema.parse(invalidId)).toThrow();
    });

    test("rejects invalid UUID for request_event_id", () => {
      const invalidRequestEventId = {
        ...validHandlerExecution,
        request_event_id: "invalid-uuid",
      };
      expect(() =>
        handlerExecutionSchema.parse(invalidRequestEventId),
      ).toThrow();
    });

    test("rejects invalid status", () => {
      const invalidStatus = {
        ...validHandlerExecution,
        status: "invalid-status",
      };
      expect(() => handlerExecutionSchema.parse(invalidStatus)).toThrow();
    });

    test("rejects negative order", () => {
      const negativeOrder = { ...validHandlerExecution, order: -1 };
      expect(() => handlerExecutionSchema.parse(negativeOrder)).toThrow();
    });

    test("rejects non-integer order", () => {
      const floatOrder = { ...validHandlerExecution, order: 1.5 };
      expect(() => handlerExecutionSchema.parse(floatOrder)).toThrow();
    });

    test("accepts empty string for handler_id", () => {
      const emptyHandlerId = { ...validHandlerExecution, handler_id: "" };
      const result = handlerExecutionSchema.parse(emptyHandlerId);
      expect(result.handler_id).toBe("");
    });

    test("accepts undefined for optional fields", () => {
      const withUndefined = {
        ...validHandlerExecution,
        error_message: undefined,
        response_data: undefined,
        locals_data: undefined,
      };
      const result = handlerExecutionSchema.parse(withUndefined);
      expect(result.error_message).toBeUndefined();
      expect(result.response_data).toBeUndefined();
      expect(result.locals_data).toBeUndefined();
    });
  });

  describe("handlerExecutionMetaSchema", () => {
    test("validates handler execution meta", () => {
      const meta = {
        id: randomUUID(),
        handler_id: "test-handler",
        request_event_id: randomUUID(),
        order: 0,
        timestamp: now(),
        status: "success" as const,
      };
      const result = handlerExecutionMetaSchema.parse(meta);
      expect(result).toMatchObject(meta);
    });

    test("omits data fields from full handler execution", () => {
      const fullExecution = {
        ...validHandlerExecution,
        error_message: "Test error",
        response_data: JSON.stringify({ test: "data" }),
        locals_data: JSON.stringify({ local: "data" }),
      };
      const result = handlerExecutionMetaSchema.parse(fullExecution);
      expect(result).not.toHaveProperty("error_message");
      expect(result).not.toHaveProperty("response_data");
      expect(result).not.toHaveProperty("locals_data");
    });

    test("includes all non-omitted fields", () => {
      const meta = {
        id: randomUUID(),
        handler_id: "test-handler",
        request_event_id: randomUUID(),
        order: 1,
        timestamp: now(),
        status: "running" as const,
      };
      const result = handlerExecutionMetaSchema.parse(meta);
      expect(result.id).toBe(meta.id);
      expect(result.handler_id).toBe(meta.handler_id);
      expect(result.request_event_id).toBe(meta.request_event_id);
      expect(result.order).toBe(meta.order);
      expect(result.timestamp).toBe(meta.timestamp);
      expect(result.status).toBe(meta.status);
    });
  });

  describe("HANDLER_EXECUTION_STATUSES", () => {
    test("contains expected statuses", () => {
      expect(HANDLER_EXECUTION_STATUSES).toEqual([
        "running",
        "success",
        "error",
      ]);
    });

    test("is readonly array", () => {
      expect(HANDLER_EXECUTION_STATUSES).toBeInstanceOf(Array);
      expect(HANDLER_EXECUTION_STATUSES.length).toBe(3);
    });
  });
});

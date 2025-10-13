import { now } from "@/util/datetime";
import { randomUUID } from "@/util/uuid";
import { describe, expect, test } from "bun:test";
import {
  TCP_HANDLER_EXECUTION_STATUSES,
  tcpHandlerExecutionMetaSchema,
  tcpHandlerExecutionSchema,
} from "./schema";

describe("tcp-handler-executions schema", () => {
  const validTcpHandlerExecution = {
    id: randomUUID(),
    handler_id: "test-tcp-handler",
    tcp_connection_id: randomUUID(),
    order: 0,
    timestamp: now(),
    status: "success" as const,
    error_message: null,
    console_output: null,
  };

  describe("tcpHandlerExecutionSchema", () => {
    test("validates valid tcp handler execution", () => {
      const result = tcpHandlerExecutionSchema.parse(validTcpHandlerExecution);
      expect(result).toMatchObject(validTcpHandlerExecution);
    });

    test("validates tcp handler execution with all optional fields", () => {
      const withData = {
        ...validTcpHandlerExecution,
        error_message: "Test error",
        console_output: "Test console output",
      };
      const result = tcpHandlerExecutionSchema.parse(withData);
      expect(result).toMatchObject(withData);
    });

    test("validates all tcp handler execution statuses", () => {
      TCP_HANDLER_EXECUTION_STATUSES.forEach((status) => {
        const execution = { ...validTcpHandlerExecution, status };
        const result = tcpHandlerExecutionSchema.parse(execution);
        expect(result.status).toBe(status);
      });
    });

    test("requires id field", () => {
      const { id, ...withoutId } = validTcpHandlerExecution;
      expect(() => tcpHandlerExecutionSchema.parse(withoutId)).toThrow();
    });

    test("requires handler_id field", () => {
      const { handler_id, ...withoutHandlerId } = validTcpHandlerExecution;
      expect(() => tcpHandlerExecutionSchema.parse(withoutHandlerId)).toThrow();
    });

    test("requires tcp_connection_id field", () => {
      const { tcp_connection_id, ...withoutTcpConnectionId } =
        validTcpHandlerExecution;
      expect(() =>
        tcpHandlerExecutionSchema.parse(withoutTcpConnectionId),
      ).toThrow();
    });

    test("requires order field", () => {
      const { order, ...withoutOrder } = validTcpHandlerExecution;
      expect(() => tcpHandlerExecutionSchema.parse(withoutOrder)).toThrow();
    });

    test("requires timestamp field", () => {
      const { timestamp, ...withoutTimestamp } = validTcpHandlerExecution;
      expect(() => tcpHandlerExecutionSchema.parse(withoutTimestamp)).toThrow();
    });

    test("requires status field", () => {
      const { status, ...withoutStatus } = validTcpHandlerExecution;
      expect(() => tcpHandlerExecutionSchema.parse(withoutStatus)).toThrow();
    });

    test("rejects invalid UUID for id", () => {
      const invalidId = { ...validTcpHandlerExecution, id: "invalid-uuid" };
      expect(() => tcpHandlerExecutionSchema.parse(invalidId)).toThrow();
    });

    test("rejects invalid UUID for tcp_connection_id", () => {
      const invalidTcpConnectionId = {
        ...validTcpHandlerExecution,
        tcp_connection_id: "invalid-uuid",
      };
      expect(() =>
        tcpHandlerExecutionSchema.parse(invalidTcpConnectionId),
      ).toThrow();
    });

    test("rejects invalid status", () => {
      const invalidStatus = {
        ...validTcpHandlerExecution,
        status: "invalid-status",
      };
      expect(() => tcpHandlerExecutionSchema.parse(invalidStatus)).toThrow();
    });

    test("rejects negative order", () => {
      const negativeOrder = { ...validTcpHandlerExecution, order: -1 };
      expect(() => tcpHandlerExecutionSchema.parse(negativeOrder)).toThrow();
    });

    test("rejects non-integer order", () => {
      const floatOrder = { ...validTcpHandlerExecution, order: 1.5 };
      expect(() => tcpHandlerExecutionSchema.parse(floatOrder)).toThrow();
    });

    test("accepts empty string for handler_id", () => {
      const emptyHandlerId = {
        ...validTcpHandlerExecution,
        handler_id: "",
      };
      const result = tcpHandlerExecutionSchema.parse(emptyHandlerId);
      expect(result.handler_id).toBe("");
    });

    test("accepts undefined for optional fields", () => {
      const withUndefined = {
        ...validTcpHandlerExecution,
        error_message: undefined,
        console_output: undefined,
      };
      const result = tcpHandlerExecutionSchema.parse(withUndefined);
      expect(result.error_message).toBeUndefined();
      expect(result.console_output).toBeUndefined();
    });
  });

  describe("tcpHandlerExecutionMetaSchema", () => {
    test("validates tcp handler execution meta", () => {
      const meta = {
        id: randomUUID(),
        handler_id: "test-tcp-handler",
        tcp_connection_id: randomUUID(),
        order: 0,
        timestamp: now(),
        status: "success" as const,
      };
      const result = tcpHandlerExecutionMetaSchema.parse(meta);
      expect(result).toMatchObject(meta);
    });

    test("omits data fields from full tcp handler execution", () => {
      const fullExecution = {
        ...validTcpHandlerExecution,
        error_message: "Test error",
        console_output: "Test console output",
      };
      const result = tcpHandlerExecutionMetaSchema.parse(fullExecution);
      expect(result).not.toHaveProperty("error_message");
      expect(result).not.toHaveProperty("console_output");
    });

    test("includes all non-omitted fields", () => {
      const meta = {
        id: randomUUID(),
        handler_id: "test-tcp-handler",
        tcp_connection_id: randomUUID(),
        order: 1,
        timestamp: now(),
        status: "running" as const,
      };
      const result = tcpHandlerExecutionMetaSchema.parse(meta);
      expect(result.id).toBe(meta.id);
      expect(result.handler_id).toBe(meta.handler_id);
      expect(result.tcp_connection_id).toBe(meta.tcp_connection_id);
      expect(result.order).toBe(meta.order);
      expect(result.timestamp).toBe(meta.timestamp);
      expect(result.status).toBe(meta.status);
    });
  });

  describe("TCP_HANDLER_EXECUTION_STATUSES", () => {
    test("contains expected statuses", () => {
      expect(TCP_HANDLER_EXECUTION_STATUSES).toEqual([
        "running",
        "success",
        "error",
      ]);
    });

    test("is readonly array", () => {
      expect(TCP_HANDLER_EXECUTION_STATUSES).toBeInstanceOf(Array);
      expect(TCP_HANDLER_EXECUTION_STATUSES.length).toBe(3);
    });
  });
});

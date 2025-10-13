import "@/server-only";
import { now } from "@/util/datetime";
import { randomUUID } from "@/util/uuid";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { resetDb } from "../db";
import {
  clearTcpHandlerExecutions,
  createTcpHandlerExecution,
  deleteTcpHandlerExecution,
  deleteTcpHandlerExecutionsByConnectionId,
  getAllTcpHandlerExecutions,
  getAllTcpHandlerExecutionsMeta,
  getTcpHandlerExecution,
  getTcpHandlerExecutionsByConnectionId,
  getTcpHandlerExecutionsByHandlerId,
  updateTcpHandlerExecution,
} from "./model";
import type { TcpHandlerExecution } from "./schema";
import { createTcpConnection } from "@/tcp-connections/model";
import type { TcpConnection } from "@/tcp-connections/schema";

describe("tcp-handler-executions model", () => {
  let testConnection: TcpConnection;

  beforeEach(() => {
    resetDb();
    // Create a test TCP connection
    testConnection = {
      id: randomUUID(),
      client_ip: "127.0.0.1",
      client_port: 12345,
      server_ip: "0.0.0.0",
      server_port: 9000,
      received_data: null,
      sent_data: null,
      status: "active",
      open_timestamp: now(),
      closed_timestamp: null,
    };
    createTcpConnection(testConnection);
  });

  afterEach(() => {
    resetDb();
  });

  const createTestExecution = (
    overrides?: Partial<TcpHandlerExecution>,
  ): TcpHandlerExecution => ({
    id: randomUUID(),
    handler_id: "test-handler",
    tcp_connection_id: testConnection.id,
    order: 0,
    timestamp: now(),
    status: "success",
    error_message: null,
    console_output: null,
    ...overrides,
  });

  describe("createTcpHandlerExecution", () => {
    test("creates a tcp handler execution", () => {
      const execution = createTestExecution();
      const created = createTcpHandlerExecution(execution);

      expect(created).toMatchObject(execution);
    });

    test("creates tcp handler execution with optional fields", () => {
      const execution = createTestExecution({
        error_message: "Test error",
        console_output: "Test console output",
      });
      const created = createTcpHandlerExecution(execution);

      expect(created.error_message).toBe("Test error");
      expect(created.console_output).toBe("Test console output");
    });
  });

  describe("getTcpHandlerExecution", () => {
    test("gets a tcp handler execution by id", () => {
      const execution = createTestExecution();
      createTcpHandlerExecution(execution);

      const retrieved = getTcpHandlerExecution(execution.id);
      expect(retrieved).toMatchObject(execution);
    });

    test("throws when tcp handler execution not found", () => {
      expect(() => getTcpHandlerExecution(randomUUID())).toThrow();
    });
  });

  describe("getTcpHandlerExecutionsByConnectionId", () => {
    test("gets all tcp handler executions for a connection", () => {
      const execution1 = createTestExecution({ order: 0 });
      const execution2 = createTestExecution({ order: 1 });

      createTcpHandlerExecution(execution1);
      createTcpHandlerExecution(execution2);

      const executions = getTcpHandlerExecutionsByConnectionId(
        testConnection.id,
      );

      expect(executions).toHaveLength(2);
      expect(executions[0].order).toBe(0);
      expect(executions[1].order).toBe(1);
    });

    test("returns empty array when no executions exist", () => {
      const executions = getTcpHandlerExecutionsByConnectionId(randomUUID());
      expect(executions).toEqual([]);
    });

    test("orders executions by order field", () => {
      const execution1 = createTestExecution({ order: 2 });
      const execution2 = createTestExecution({ order: 0 });
      const execution3 = createTestExecution({ order: 1 });

      createTcpHandlerExecution(execution1);
      createTcpHandlerExecution(execution2);
      createTcpHandlerExecution(execution3);

      const executions = getTcpHandlerExecutionsByConnectionId(
        testConnection.id,
      );

      expect(executions[0].order).toBe(0);
      expect(executions[1].order).toBe(1);
      expect(executions[2].order).toBe(2);
    });
  });

  describe("getTcpHandlerExecutionsByHandlerId", () => {
    test("gets all tcp handler executions for a handler", () => {
      const execution1 = createTestExecution({ handler_id: "handler-1" });
      const execution2 = createTestExecution({ handler_id: "handler-1" });
      const execution3 = createTestExecution({ handler_id: "handler-2" });

      createTcpHandlerExecution(execution1);
      createTcpHandlerExecution(execution2);
      createTcpHandlerExecution(execution3);

      const executions = getTcpHandlerExecutionsByHandlerId("handler-1");
      expect(executions).toHaveLength(2);
    });

    test("orders executions by timestamp descending", () => {
      const execution1 = createTestExecution({
        handler_id: "handler-1",
        timestamp: (now() - 2000) as any,
      });
      const execution2 = createTestExecution({
        handler_id: "handler-1",
        timestamp: (now() - 1000) as any,
      });

      createTcpHandlerExecution(execution1);
      createTcpHandlerExecution(execution2);

      const executions = getTcpHandlerExecutionsByHandlerId("handler-1");
      expect(executions[0].timestamp).toBeGreaterThan(executions[1].timestamp);
    });
  });

  describe("getAllTcpHandlerExecutions", () => {
    test("gets all tcp handler executions", () => {
      const execution1 = createTestExecution();
      const execution2 = createTestExecution();

      createTcpHandlerExecution(execution1);
      createTcpHandlerExecution(execution2);

      const executions = getAllTcpHandlerExecutions();
      expect(executions).toHaveLength(2);
    });

    test("returns empty array when no executions exist", () => {
      const executions = getAllTcpHandlerExecutions();
      expect(executions).toEqual([]);
    });
  });

  describe("getAllTcpHandlerExecutionsMeta", () => {
    test("gets all tcp handler execution metadata", () => {
      const execution = createTestExecution({
        error_message: "Test error",
        console_output: "Test output",
      });

      createTcpHandlerExecution(execution);

      const metas = getAllTcpHandlerExecutionsMeta();
      expect(metas).toHaveLength(1);
      expect(metas[0]).not.toHaveProperty("error_message");
      expect(metas[0]).not.toHaveProperty("console_output");
    });
  });

  describe("updateTcpHandlerExecution", () => {
    test("updates a tcp handler execution", () => {
      const execution = createTestExecution();
      createTcpHandlerExecution(execution);

      const updated = updateTcpHandlerExecution({
        id: execution.id,
        status: "error",
        error_message: "Updated error",
      });

      expect(updated.status).toBe("error");
      expect(updated.error_message).toBe("Updated error");
    });

    test("preserves unmodified fields", () => {
      const execution = createTestExecution({ order: 5 });
      createTcpHandlerExecution(execution);

      const updated = updateTcpHandlerExecution({
        id: execution.id,
        status: "error",
      });

      expect(updated.order).toBe(5);
      expect(updated.handler_id).toBe(execution.handler_id);
    });
  });

  describe("deleteTcpHandlerExecution", () => {
    test("deletes a tcp handler execution", () => {
      const execution = createTestExecution();
      createTcpHandlerExecution(execution);

      deleteTcpHandlerExecution(execution.id);

      expect(() => getTcpHandlerExecution(execution.id)).toThrow();
    });
  });

  describe("deleteTcpHandlerExecutionsByConnectionId", () => {
    test("deletes all tcp handler executions for a connection", () => {
      const execution1 = createTestExecution();
      const execution2 = createTestExecution();

      createTcpHandlerExecution(execution1);
      createTcpHandlerExecution(execution2);

      deleteTcpHandlerExecutionsByConnectionId(testConnection.id);

      const executions = getTcpHandlerExecutionsByConnectionId(
        testConnection.id,
      );
      expect(executions).toEqual([]);
    });
  });

  describe("clearTcpHandlerExecutions", () => {
    test("deletes all tcp handler executions", () => {
      const execution1 = createTestExecution();
      const execution2 = createTestExecution();

      createTcpHandlerExecution(execution1);
      createTcpHandlerExecution(execution2);

      clearTcpHandlerExecutions();

      const executions = getAllTcpHandlerExecutions();
      expect(executions).toEqual([]);
    });
  });
});

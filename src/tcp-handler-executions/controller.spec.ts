import "@/server-only";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { resetDb } from "../db";
import { tcpHandlerExecutionController } from "./controller";
import { createTcpHandlerExecution } from "./model";
import type { TcpHandlerExecution } from "./schema";
import { randomUUID } from "@/util/uuid";
import { now } from "@/util/datetime";
import { createTcpConnection } from "@/tcp-connections/model";
import type { TcpConnection } from "@/tcp-connections/schema";

describe("tcp-handler-executions controller", () => {
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

  describe("GET /api/tcp-connections/:connectionId/handler-executions", () => {
    test("returns tcp handler executions for a connection", async () => {
      const execution1 = createTestExecution({ order: 0 });
      const execution2 = createTestExecution({ order: 1 });

      createTcpHandlerExecution(execution1);
      createTcpHandlerExecution(execution2);

      const req = {
        params: { connectionId: testConnection.id },
      } as any;

      const response =
        tcpHandlerExecutionController[
          "/api/tcp-connections/:connectionId/handler-executions"
        ].GET(req);
      const data = await response.json();

      expect(data).toHaveLength(2);
      expect(data[0].order).toBe(0);
      expect(data[1].order).toBe(1);
    });

    test("returns empty array when no executions exist", async () => {
      const req = {
        params: { connectionId: testConnection.id },
      } as any;

      const response =
        tcpHandlerExecutionController[
          "/api/tcp-connections/:connectionId/handler-executions"
        ].GET(req);
      const data = await response.json();

      expect(data).toEqual([]);
    });

    test("returns executions in order", async () => {
      const execution1 = createTestExecution({ order: 2 });
      const execution2 = createTestExecution({ order: 0 });
      const execution3 = createTestExecution({ order: 1 });

      createTcpHandlerExecution(execution1);
      createTcpHandlerExecution(execution2);
      createTcpHandlerExecution(execution3);

      const req = {
        params: { connectionId: testConnection.id },
      } as any;

      const response =
        tcpHandlerExecutionController[
          "/api/tcp-connections/:connectionId/handler-executions"
        ].GET(req);
      const data = await response.json();

      expect(data[0].order).toBe(0);
      expect(data[1].order).toBe(1);
      expect(data[2].order).toBe(2);
    });
  });
});

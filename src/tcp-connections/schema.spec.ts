import { test, expect } from "bun:test";
import { tcpConnectionSchema, tcpConnectionMetaSchema } from "./schema";
import { randomUUID } from "@/util/uuid";
import { parseBase64 } from "@/util/base64";

test("tcpConnectionSchema validates correct data", () => {
  const validConnection = {
    id: randomUUID(),
    client_ip: "192.168.1.100",
    client_port: 54321,
    server_ip: "0.0.0.0",
    server_port: 3002,
    received_data: parseBase64("SGVsbG8gV29ybGQ="), // Base64 encoded "Hello World"
    sent_data: parseBase64("YWNrCg=="), // Base64 encoded "ack\n"
    status: "active",
    open_timestamp: new Date("2024-01-01T12:00:00Z").getTime(),
    closed_timestamp: null,
  };

  const result = tcpConnectionSchema.safeParse(validConnection);
  if (!result.success) {
    console.error(
      "Validation errors:",
      JSON.stringify(result.error.format(), null, 2),
    );
  }
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.id).toBe(validConnection.id);
    expect(result.data.client_ip).toBe(validConnection.client_ip);
    expect(result.data.client_port).toBe(validConnection.client_port);
    expect(result.data.status).toBe("active");
  }
});

test("tcpConnectionSchema rejects invalid port numbers", () => {
  const invalidConnection = {
    id: randomUUID(),
    client_ip: "192.168.1.100",
    client_port: 99999, // Invalid port number
    server_ip: "0.0.0.0",
    server_port: 3002,
    status: "active",
    open_timestamp: Date.now(),
  };

  const result = tcpConnectionSchema.safeParse(invalidConnection);
  expect(result.success).toBe(false);
});

test("tcpConnectionSchema rejects invalid status", () => {
  const invalidConnection = {
    id: randomUUID(),
    client_ip: "192.168.1.100",
    client_port: 54321,
    server_ip: "0.0.0.0",
    server_port: 3002,
    status: "invalid_status",
    open_timestamp: Date.now(),
  };

  const result = tcpConnectionSchema.safeParse(invalidConnection);
  expect(result.success).toBe(false);
});

test("tcpConnectionMetaSchema omits data fields", () => {
  const connection = {
    id: randomUUID(),
    client_ip: "192.168.1.100",
    client_port: 54321,
    server_ip: "0.0.0.0",
    server_port: 3002,
    received_data: "SGVsbG8gV29ybGQ=",
    sent_data: "YWNrCg==",
    status: "closed",
    open_timestamp: Date.now(),
    closed_timestamp: Date.now(),
  };

  const result = tcpConnectionMetaSchema.safeParse(connection);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).not.toHaveProperty("received_data");
    expect(result.data).not.toHaveProperty("sent_data");
    expect(result.data.id).toBe(connection.id);
    expect(result.data.status).toBe("closed");
  }
});

test("tcpConnectionSchema handles buffer data conversion", () => {
  const connectionWithBuffer = {
    id: randomUUID(),
    client_ip: "192.168.1.100",
    client_port: 54321,
    server_ip: "0.0.0.0",
    server_port: 3002,
    received_data: Buffer.from("Hello World"),
    sent_data: Buffer.from("ack\n"),
    status: "active",
    open_timestamp: Date.now(),
  };

  const result = tcpConnectionSchema.safeParse(connectionWithBuffer);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(typeof result.data.received_data).toBe("string");
    expect(typeof result.data.sent_data).toBe("string");
    // Base64 encoded values
    expect(result.data.received_data).toBe(parseBase64("SGVsbG8gV29ybGQ="));
    expect(result.data.sent_data).toBe(parseBase64("YWNrCg=="));
  }
});

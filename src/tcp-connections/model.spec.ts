import { test, expect } from "bun:test";
import {
  getTcpConnection,
  getTcpConnectionMeta,
  getAllTcpConnections,
  createTcpConnection,
  updateTcpConnection,
  deleteTcpConnection,
  clearTcpConnections,
  tcpConnectionToSql,
} from "./model";
import type { TcpConnection } from "./schema";
import { now, type Timestamp } from "@/util/datetime";
import { randomUUID } from "@/util/uuid";
import { parseBase64 } from "@/util/base64";

test("tcpConnectionToSql converts base64 fields", () => {
  const connection: Partial<TcpConnection> = {
    id: randomUUID(),
    received_data: parseBase64("SGVsbG8gV29ybGQ="),
    sent_data: parseBase64("YWNrCg=="),
  };

  const sql = tcpConnectionToSql(connection);

  expect(sql.id).toBe(connection.id);
  expect(sql.received_data).toBeInstanceOf(Uint8Array);
  expect(sql.sent_data).toBeInstanceOf(Uint8Array);
  expect(Buffer.from(sql.received_data).toString()).toBe("Hello World");
  expect(Buffer.from(sql.sent_data).toString()).toBe("ack\n");
});

test("createTcpConnection creates a new connection", () => {
  const connection: TcpConnection = {
    id: randomUUID(),
    client_ip: "192.168.1.100",
    client_port: 54321,
    server_ip: "0.0.0.0",
    server_port: 3002,
    received_data: null,
    sent_data: null,
    status: "active",
    open_timestamp: now(),
    closed_timestamp: null,
  };

  const created = createTcpConnection(connection);

  expect(created.id).toBe(connection.id);
  expect(created.client_ip).toBe(connection.client_ip);
  expect(created.client_port).toBe(connection.client_port);
  expect(created.status).toBe("active");
});

test("getTcpConnection retrieves connection by id", () => {
  const connection: TcpConnection = {
    id: randomUUID(),
    client_ip: "10.0.0.1",
    client_port: 12345,
    server_ip: "0.0.0.0",
    server_port: 3002,
    received_data: parseBase64("SGVsbG8="),
    sent_data: parseBase64("YWNrCg=="),
    status: "closed",
    open_timestamp: now(),
  };

  createTcpConnection(connection);
  const retrieved = getTcpConnection(connection.id);

  expect(retrieved.id).toBe(connection.id);
  expect(retrieved.client_ip).toBe(connection.client_ip);
  expect(retrieved.received_data).toBe(connection.received_data);
  expect(retrieved.status).toBe("closed");
});

test("getTcpConnectionMeta excludes data fields", () => {
  const connection: TcpConnection = {
    id: randomUUID(),
    client_ip: "172.16.0.1",
    client_port: 8080,
    server_ip: "0.0.0.0",
    server_port: 3002,
    received_data: parseBase64("TG9yZW0gaXBzdW0="),
    sent_data: parseBase64("YWNrCg=="),
    status: "active",
    open_timestamp: now(),
    closed_timestamp: null,
  };

  createTcpConnection(connection);
  const meta = getTcpConnectionMeta(connection.id);

  expect(meta.id).toBe(connection.id);
  expect(meta.client_ip).toBe(connection.client_ip);
  expect(meta).not.toHaveProperty("received_data");
  expect(meta).not.toHaveProperty("sent_data");
});

test("updateTcpConnection updates connection fields", () => {
  const connection: TcpConnection = {
    id: randomUUID(),
    client_ip: "192.168.1.1",
    client_port: 9999,
    server_ip: "0.0.0.0",
    server_port: 3002,
    received_data: null,
    sent_data: null,
    status: "active",
    open_timestamp: now(),
    closed_timestamp: null,
  };

  createTcpConnection(connection);

  const updated = updateTcpConnection({
    id: connection.id,
    status: "closed",
    closed_timestamp: now(),
    received_data: parseBase64("RGF0YSByZWNlaXZlZA=="),
  });

  expect(updated.id).toBe(connection.id);
  expect(updated.status).toBe("closed");
  expect(updated.closed_timestamp).not.toBeNull();
  expect(updated.received_data).toBe(parseBase64("RGF0YSByZWNlaXZlZA=="));
});

test("getAllTcpConnections returns all connections", () => {
  const connections: TcpConnection[] = [
    {
      id: randomUUID(),
      client_ip: "192.168.1.1",
      client_port: 1111,
      server_ip: "0.0.0.0",
      server_port: 3002,
      received_data: null,
      sent_data: null,
      status: "active",
      open_timestamp: now(),
      closed_timestamp: null,
    },
    {
      id: randomUUID(),
      client_ip: "192.168.1.2",
      client_port: 2222,
      server_ip: "0.0.0.0",
      server_port: 3002,
      received_data: parseBase64("U29tZSBkYXRh"),
      sent_data: parseBase64("YWNrCg=="),
      status: "closed",
      open_timestamp: (now() - 10000) as Timestamp,
      closed_timestamp: now(),
    },
  ];

  connections.forEach(createTcpConnection);
  const all = getAllTcpConnections();

  expect(all.length).toBe(2);
  // Should be ordered by open_timestamp desc
  expect(all[0].id).toBe(connections[0].id);
  expect(all[1].id).toBe(connections[1].id);
});

test("deleteTcpConnection removes connection", () => {
  const connection: TcpConnection = {
    id: randomUUID(),
    client_ip: "192.168.1.1",
    client_port: 5555,
    server_ip: "0.0.0.0",
    server_port: 3002,
    received_data: null,
    sent_data: null,
    status: "active",
    open_timestamp: now(),
    closed_timestamp: null,
  };

  createTcpConnection(connection);
  deleteTcpConnection(connection.id);

  expect(getTcpConnection(connection.id)).toBeNull();
});

test("clearTcpConnections removes all connections", () => {
  const connections: TcpConnection[] = [
    {
      id: randomUUID(),
      client_ip: "192.168.1.1",
      client_port: 7777,
      server_ip: "0.0.0.0",
      server_port: 3002,
      received_data: null,
      sent_data: null,
      status: "active",
      open_timestamp: now(),
      closed_timestamp: null,
    },
    {
      id: randomUUID(),
      client_ip: "192.168.1.2",
      client_port: 8888,
      server_ip: "0.0.0.0",
      server_port: 3002,
      received_data: null,
      sent_data: null,
      status: "active",
      open_timestamp: now(),
      closed_timestamp: null,
    },
  ];

  connections.forEach(createTcpConnection);
  clearTcpConnections();

  const all = getAllTcpConnections();
  expect(all.length).toBe(0);
});

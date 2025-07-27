import { test, expect } from "bun:test";
import { tcpConnectionController } from "./controller";
import { createTcpConnection } from "./model";
import type { TcpConnection } from "./schema";
import { randomUUID } from "@/util/uuid";
import { parseBase64 } from "@/util/base64";
import { now } from "@/util/datetime";

test("GET /api/tcp-connections returns all connections", async () => {
  const connections: TcpConnection[] = [
    {
      id: randomUUID(),
      client_ip: "192.168.1.1",
      client_port: 1234,
      server_ip: "0.0.0.0",
      server_port: 3002,
      received_data: parseBase64("U29tZSBkYXRh"),
      sent_data: parseBase64("YWNrCg=="),
      status: "active",
      open_timestamp: now(),
      closed_timestamp: null,
    },
    {
      id: randomUUID(),
      client_ip: "192.168.1.2",
      client_port: 5678,
      server_ip: "0.0.0.0",
      server_port: 3002,
      received_data: null,
      sent_data: null,
      status: "closed",
      open_timestamp: (now() - 10000) as any,
      closed_timestamp: now(),
    },
  ];

  connections.forEach(createTcpConnection);

  const request = new Request("http://localhost/api/tcp-connections");
  const response =
    await tcpConnectionController["/api/tcp-connections"].GET(request);
  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data.length).toBe(2);
  expect(data[0].id).toBe(connections[0].id);
  expect(data[1].id).toBe(connections[1].id);
  // Should not include data fields in list
  expect(data[0]).not.toHaveProperty("received_data");
  expect(data[0]).not.toHaveProperty("sent_data");
});

test("GET /api/tcp-connections/:id returns connection details", async () => {
  const connection: TcpConnection = {
    id: randomUUID(),
    client_ip: "10.0.0.1",
    client_port: 9999,
    server_ip: "0.0.0.0",
    server_port: 3002,
    received_data: parseBase64("SGVsbG8gV29ybGQ="),
    sent_data: parseBase64("YWNrCg=="),
    status: "active",
    open_timestamp: now(),
    closed_timestamp: null,
  };

  createTcpConnection(connection);

  const request = {
    params: { id: connection.id },
  } as any;
  const response =
    await tcpConnectionController["/api/tcp-connections/:id"].GET(request);
  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data.id).toBe(connection.id);
  expect(data.client_ip).toBe("10.0.0.1");
  expect(data.received_data).toBe(parseBase64("SGVsbG8gV29ybGQ="));
  expect(data.sent_data).toBe(parseBase64("YWNrCg=="));
});

test("GET /api/tcp-connections/:id returns 404 for non-existent connection", async () => {
  const request = {
    params: { id: "non-existent" },
  } as any;
  const response =
    await tcpConnectionController["/api/tcp-connections/:id"].GET(request);

  expect(response.status).toBe(404);
});

test("DELETE /api/tcp-connections/:id deletes a connection", async () => {
  const connection: TcpConnection = {
    id: randomUUID(),
    client_ip: "172.16.0.1",
    client_port: 3333,
    server_ip: "0.0.0.0",
    server_port: 3002,
    received_data: null,
    sent_data: null,
    status: "active",
    open_timestamp: now(),
    closed_timestamp: null,
  };

  createTcpConnection(connection);

  const request = {
    params: { id: connection.id },
  } as any;
  const response =
    await tcpConnectionController["/api/tcp-connections/:id"].DELETE(request);
  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data.status).toBe("ok");

  // Verify connection is deleted
  const getRequest = {
    params: { id: connection.id },
  } as any;
  const getResponse =
    await tcpConnectionController["/api/tcp-connections/:id"].GET(getRequest);
  expect(getResponse.status).toBe(404);
});

test("DELETE /api/tcp-connections clears all connections", async () => {
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
      received_data: null,
      sent_data: null,
      status: "active",
      open_timestamp: now(),
      closed_timestamp: null,
    },
  ];

  connections.forEach(createTcpConnection);

  const request = new Request("http://localhost/api/tcp-connections", {
    method: "DELETE",
  });
  const response =
    await tcpConnectionController["/api/tcp-connections"].DELETE(request);
  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data.status).toBe("ok");

  // Verify all connections are deleted
  const listRequest = new Request("http://localhost/api/tcp-connections");
  const listResponse =
    await tcpConnectionController["/api/tcp-connections"].GET(listRequest);
  const listData = await listResponse.json();
  expect(listData.length).toBe(0);
});

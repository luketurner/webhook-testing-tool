import { test, expect, afterEach, beforeEach } from "bun:test";
import { startTcpServer } from "./index";
import { getAllTcpConnections } from "@/tcp-connections/model";
import { sleep } from "bun";
import { parseBase64 } from "@/util/base64";

let server: ReturnType<typeof startTcpServer>;
const TEST_PORT = 13337;

beforeEach(() => {
  server = startTcpServer(TEST_PORT);
});

afterEach(() => {
  if (server) {
    server.stop(true);
  }
});

test("TCP server accepts connections and stores them in database", async () => {
  // Create a TCP client connection
  const socket = await Bun.connect({
    hostname: "localhost",
    port: TEST_PORT,
    socket: {
      open() {},
      data() {},
      close() {},
      error() {},
    },
  });

  const connections = getAllTcpConnections();
  expect(connections.length).toBe(1);
  expect(connections[0].client_port).toBeGreaterThan(0);
  expect(connections[0].server_port).toBe(TEST_PORT);
  expect(connections[0].status).toBe("active");

  socket.end();
});

test("TCP server records received data and sends ack", async () => {
  let receivedData = "";

  const socket = await Bun.connect({
    hostname: "localhost",
    port: TEST_PORT,
    socket: {
      open() {},
      data(_socket, data) {
        receivedData += data.toString();
      },
      close() {},
      error() {},
    },
  });

  // Send test data
  socket.write("Hello TCP Server");

  // Wait for response and data processing
  await sleep(10);

  expect(receivedData).toBe("ack\n");

  const connections = getAllTcpConnections();
  expect(connections.length).toBe(1);
  expect(connections[0].received_data).toBe(
    parseBase64(Buffer.from("Hello TCP Server").toString("base64")),
  );
  expect(connections[0].sent_data).toBe(
    parseBase64(Buffer.from("ack\n").toString("base64")),
  );

  socket.end();
});

test("TCP server updates connection status on close", async () => {
  const socket = await Bun.connect({
    hostname: "localhost",
    port: TEST_PORT,
    socket: {
      open() {},
      data() {},
      close() {},
      error() {},
    },
  });

  // Verify connection is created
  await sleep(10);
  let connections = getAllTcpConnections();
  expect(connections.length).toBe(1);
  expect(connections[0].status).toBe("active");
  expect(connections[0].closed_timestamp).toBeNull();

  // Close connection
  socket.end();

  // Wait for close to be processed
  await sleep(10);

  connections = getAllTcpConnections();
  expect(connections.length).toBe(1);
  expect(connections[0].status).toBe("closed");
  expect(connections[0].closed_timestamp).not.toBeNull();
});

test("TCP server handles multiple connections", async () => {
  // Create multiple connections
  const socket1 = await Bun.connect({
    hostname: "localhost",
    port: TEST_PORT,
    socket: {
      open() {},
      data() {},
      close() {},
      error() {},
    },
  });

  const socket2 = await Bun.connect({
    hostname: "localhost",
    port: TEST_PORT,
    socket: {
      open() {},
      data() {},
      close() {},
      error() {},
    },
  });

  // Give connections time to be recorded
  await sleep(10);

  const connections = getAllTcpConnections();
  expect(connections.length).toBe(2);
  expect(connections[0].status).toBe("active");
  expect(connections[1].status).toBe("active");

  socket1.end();
  socket2.end();
});

test("TCP server accumulates data from multiple sends", async () => {
  let receivedData = "";

  const socket = await Bun.connect({
    hostname: "localhost",
    port: TEST_PORT,
    socket: {
      open() {},
      data(_socket, data) {
        receivedData += data.toString();
      },
      close() {},
      error() {},
    },
  });

  // Give connection time to be established
  await sleep(10);

  // Send multiple pieces of data
  socket.write("First ");
  await sleep(50);
  socket.write("Second ");
  await sleep(50);
  socket.write("Third");

  // Wait for all data to be processed
  await sleep(10);

  // Should receive 3 ack messages
  expect(receivedData).toBe("ack\nack\nack\n");

  const connections = getAllTcpConnections();
  expect(connections.length).toBe(1);

  const expectedData = parseBase64(
    Buffer.from("First Second Third").toString("base64"),
  );
  const expectedSent = parseBase64(
    Buffer.from("ack\nack\nack\n").toString("base64"),
  );

  expect(connections[0].received_data).toBe(expectedData);
  expect(connections[0].sent_data).toBe(expectedSent);

  socket.end();
});

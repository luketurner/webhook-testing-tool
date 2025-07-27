import "@/server-only";
import {
  createTcpConnection,
  updateTcpConnection,
} from "@/tcp-connections/model";
import type { TcpConnection } from "@/tcp-connections/schema";
import { randomUUID, type UUID } from "@/util/uuid";
import { broadcastEvent } from "@/db/events";
import { now } from "@/util/datetime";
import type { Socket } from "bun";

// AIDEV-NOTE: TCP server implementation using Bun's TCP API to handle raw socket connections
// Tracks connection metadata and data in the database, automatically sends "ack" responses

interface TcpConnectionState {
  connectionId: UUID;
  receivedData: Uint8Array[];
  sentData: Uint8Array[];
}

const connectionStates = new WeakMap<Socket, TcpConnectionState>();

function concatenateUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export function startTcpServer(port: number) {
  const server = Bun.listen({
    hostname: "0.0.0.0",
    port,
    socket: {
      open(socket) {
        const connectionId = randomUUID();
        const state: TcpConnectionState = {
          connectionId,
          receivedData: [],
          sentData: [],
        };
        connectionStates.set(socket, state);

        // Create initial connection record
        const connection: TcpConnection = {
          id: connectionId,
          client_ip: socket.remoteAddress,
          client_port: socket.remotePort || 0,
          server_ip: "0.0.0.0",
          server_port: port,
          received_data: null,
          sent_data: null,
          status: "active",
          open_timestamp: now(),
          closed_timestamp: null,
        };

        createTcpConnection(connection);
        broadcastEvent("tcp_connection", {
          action: "created",
          id: connectionId,
        });
      },

      data(socket, data) {
        const state = connectionStates.get(socket);
        if (!state) return;

        // Store received data
        state.receivedData.push(new Uint8Array(data));

        // Send ack response
        const ackMessage = new Uint8Array(Buffer.from("ack\n"));
        socket.write(ackMessage);
        state.sentData.push(ackMessage);

        // Update connection record with accumulated data
        const receivedData = Buffer.from(
          concatenateUint8Arrays(state.receivedData),
        ).toString("base64");
        const sentData = Buffer.from(
          concatenateUint8Arrays(state.sentData),
        ).toString("base64");

        updateTcpConnection({
          id: state.connectionId,
          received_data: receivedData as any,
          sent_data: sentData as any,
        });

        broadcastEvent("tcp_connection", {
          action: "updated",
          id: state.connectionId,
        });
      },

      close(socket) {
        const state = connectionStates.get(socket);
        if (!state) return;

        // Update connection status to closed
        updateTcpConnection({
          id: state.connectionId,
          status: "closed",
          closed_timestamp: now(),
        });

        broadcastEvent("tcp_connection", {
          action: "closed",
          id: state.connectionId,
        });
        connectionStates.delete(socket);
      },

      error(socket, error) {
        const state = connectionStates.get(socket);
        if (!state) return;

        console.error(`TCP connection error for ${state.connectionId}:`, error);

        // Update connection status to failed
        updateTcpConnection({
          id: state.connectionId,
          status: "failed",
          closed_timestamp: now(),
        });

        broadcastEvent("tcp_connection", {
          action: "failed",
          id: state.connectionId,
        });
        connectionStates.delete(socket);
      },
    },
  });

  console.log(`TCP server listening on port ${port}`);
  return server;
}

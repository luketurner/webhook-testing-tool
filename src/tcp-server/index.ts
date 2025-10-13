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
import { getActiveTcpHandler } from "@/tcp-handlers/model";
import { runInNewContext } from "vm";
import { Transpiler } from "bun";
import { deepFreeze } from "@/util/object";
import { getSharedState, updateSharedState } from "@/shared-state/model";
import {
  createTcpHandlerExecution,
  updateTcpHandlerExecution,
} from "@/tcp-handler-executions/model";
import type { TcpHandlerExecution } from "@/tcp-handler-executions/schema";

// AIDEV-NOTE: TCP server implementation using Bun's TCP API to handle raw socket connections
// Tracks connection metadata and data in the database, automatically sends "ack" responses

interface TcpConnectionState {
  connectionId: UUID;
  receivedData: Uint8Array[];
  sentData: Uint8Array[];
  executionOrder: number;
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
          executionOrder: 0,
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

        // AIDEV-NOTE: Check if there's an active TCP handler and execute it
        const tcpHandler = getActiveTcpHandler();
        if (tcpHandler) {
          // Create handler execution record
          const execution: TcpHandlerExecution = {
            id: randomUUID(),
            handler_id: tcpHandler.id,
            tcp_connection_id: state.connectionId,
            order: state.executionOrder++,
            timestamp: now(),
            status: "running",
            error_message: null,
            console_output: null,
          };
          createTcpHandlerExecution(execution);

          try {
            // Convert received data to string
            const dataString = new TextDecoder().decode(data);

            // Load shared state
            const shared = getSharedState();

            const consoleOutput: string[] = [];

            const captureConsole = {
              log: (...args: unknown[]) => {
                consoleOutput.push(
                  `[LOG] ${args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ")}`,
                );
              },
              debug: (...args: unknown[]) => {
                consoleOutput.push(
                  `[DEBUG] ${args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ")}`,
                );
              },
              info: (...args: unknown[]) => {
                consoleOutput.push(
                  `[INFO] ${args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ")}`,
                );
              },
              warn: (...args: unknown[]) => {
                consoleOutput.push(
                  `[WARN] ${args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ")}`,
                );
              },
              error: (...args: unknown[]) => {
                consoleOutput.push(
                  `[ERROR] ${args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ")}`,
                );
              },
            };

            // Function to send data back to the client
            const send = (responseData: string) => {
              const responseBuffer = new Uint8Array(Buffer.from(responseData));
              socket.write(responseBuffer);
              state.sentData.push(responseBuffer);
            };

            const sleep = (ms: number): Promise<void> => {
              return new Promise((resolve) => setTimeout(resolve, ms));
            };

            const transpiler = new Transpiler({ loader: "ts" });
            const code = transpiler.transformSync(tcpHandler.code);

            // Wrap the code in an async function to support await
            const wrappedCode = `(async () => { ${code} })()`;

            // Execute the handler
            runInNewContext(wrappedCode, {
              data: deepFreeze(dataString),
              send,
              console: captureConsole,
              shared: shared.data,
              sleep,
              btoa,
              atob,
            });

            // Save the shared state after handler execution
            updateSharedState(shared.data);

            // Update handler execution with success status
            updateTcpHandlerExecution({
              id: execution.id,
              status: "success",
              console_output: consoleOutput.join("\n") || null,
            });

            // Log console output if any
            if (consoleOutput.length > 0) {
              console.log(
                `TCP Handler console output:\n${consoleOutput.join("\n")}`,
              );
            }
          } catch (e) {
            console.error("Error running TCP handler script", e);

            // Update handler execution with error status
            updateTcpHandlerExecution({
              id: execution.id,
              status: "error",
              error_message: e instanceof Error ? e.message : String(e),
            });

            // Send error response if handler fails
            const errorMessage = new Uint8Array(Buffer.from("error\n"));
            socket.write(errorMessage);
            state.sentData.push(errorMessage);
          }
        } else {
          // No handler configured, send default ack response
          const ackMessage = new Uint8Array(Buffer.from("ack\n"));
          socket.write(ackMessage);
          state.sentData.push(ackMessage);
        }

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

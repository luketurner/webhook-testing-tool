import "@/server-only";
import {
  getAllTcpConnectionsMeta,
  getTcpConnection,
  deleteTcpConnection,
  clearTcpConnections,
} from "./model";
import { TCP_PORT } from "@/config";
import { sleep } from "bun";

export const tcpConnectionController = {
  "/api/tcp-connections": {
    GET: (req) => {
      return Response.json(getAllTcpConnectionsMeta());
    },
    DELETE: (req) => {
      clearTcpConnections();
      return Response.json({ status: "ok" });
    },
  },
  "/api/tcp-connections/:id": {
    GET: (req) => {
      const connection = getTcpConnection(req.params.id);

      if (!connection) {
        return new Response(null, { status: 404 });
      }

      return Response.json(connection);
    },
    DELETE: (req) => {
      deleteTcpConnection(req.params.id);
      return Response.json({ status: "ok" });
    },
  },
  "/api/tcp-connections/test": {
    POST: async (req) => {
      try {
        // Connect to the TCP server
        const socket = await Bun.connect({
          hostname: "localhost",
          port: TCP_PORT,
          socket: {
            open() {},
            data() {},
            close() {},
            error() {},
          },
        });

        // Send test payload
        const testPayload = "Test TCP connection from WTT admin dashboard";
        socket.write(testPayload);

        // Wait briefly for response processing
        await sleep(10);

        // Close the connection
        socket.end();

        return Response.json({
          status: "success",
          message: "TCP test connection completed successfully",
          payload: testPayload,
          port: TCP_PORT,
        });
      } catch (error) {
        return Response.json(
          {
            status: "error",
            message: "Failed to connect to TCP server",
            error: error.message,
          },
          { status: 500 },
        );
      }
    },
  },
};

import "@/server-only";
import {
  getAllTcpConnectionsMeta,
  getTcpConnection,
  deleteTcpConnection,
  clearTcpConnections,
  bulkDeleteTcpConnections,
  archiveTcpConnection,
  unarchiveTcpConnection,
  bulkArchiveTcpConnections,
} from "./model";
import { TCP_PORT } from "@/config";
import { sleep } from "bun";
import { z } from "zod/v4";
import { uuidSchema } from "@/util/uuid";
import { timestampSchema } from "@/util/datetime";

const bulkDeleteBodySchema = z.object({
  ids: z.array(uuidSchema).optional().default([]),
});

const archiveBodySchema = z.object({
  archived_timestamp: timestampSchema.nullish(),
});

const bulkArchiveBodySchema = z.object({
  ids: z.array(uuidSchema).optional().default([]),
  archived_timestamp: timestampSchema,
});

export const tcpConnectionController = {
  "/api/tcp-connections": {
    GET: (req) => {
      const url = new URL(req.url);
      const includeArchived =
        url.searchParams.get("includeArchived") === "true";
      return Response.json(getAllTcpConnectionsMeta(includeArchived));
    },
    DELETE: (req) => {
      const count = clearTcpConnections();
      return Response.json({ status: "ok", deleted_count: count });
    },
  },
  "/api/tcp-connections/bulk-delete": {
    DELETE: async (req) => {
      const body = bulkDeleteBodySchema.parse(await req.json());
      const count = bulkDeleteTcpConnections(
        body.ids.length > 0 ? body.ids : undefined,
      );
      return Response.json({ status: "ok", deleted_count: count });
    },
  },
  "/api/tcp-connections/bulk-archive": {
    PATCH: async (req) => {
      const body = bulkArchiveBodySchema.parse(await req.json());
      const count = bulkArchiveTcpConnections(
        body.ids.length > 0 ? body.ids : undefined,
      );
      return Response.json({ status: "ok", archived_count: count });
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
    PATCH: async (req) => {
      const body = archiveBodySchema.parse(await req.json());

      if (body.archived_timestamp === null) {
        const result = unarchiveTcpConnection(req.params.id);
        return Response.json(result);
      } else {
        const result = archiveTcpConnection(req.params.id);
        return Response.json(result);
      }
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

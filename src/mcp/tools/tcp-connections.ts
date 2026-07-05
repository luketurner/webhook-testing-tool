import "@/server-only";
import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  archiveTcpConnection,
  getAllTcpConnectionsMeta,
  getTcpConnection,
} from "@/tcp-connections/model";
import { parseUUID } from "@/util/uuid";
import { errorResult, jsonResult } from "../tool-response";

export function registerTcpConnectionTools(server: McpServer) {
  server.registerTool(
    "list-tcp-connections",
    {
      title: "List TCP connections",
      description:
        "Returns metadata for captured TCP connections, most recent first. Sent/received data is omitted; use get-tcp-connection for full details.",
      inputSchema: {
        include_archived: z
          .boolean()
          .optional()
          .describe("Include archived connections (default false)"),
      },
    },
    ({ include_archived }) =>
      jsonResult(getAllTcpConnectionsMeta(include_archived ?? false)),
  );

  server.registerTool(
    "get-tcp-connection",
    {
      title: "Get TCP connection",
      description:
        "Returns a full TCP connection including base64-encoded sent/received data.",
      inputSchema: {
        id: z.uuid().describe("The TCP connection id"),
      },
    },
    ({ id }) => {
      const connection = getTcpConnection(parseUUID(id));
      if (!connection) {
        return errorResult(`TCP connection not found: ${id}`);
      }
      return jsonResult(connection);
    },
  );

  server.registerTool(
    "archive-tcp-connection",
    {
      title: "Archive TCP connection",
      description: "Archives a TCP connection.",
      inputSchema: {
        id: z.uuid().describe("The TCP connection id"),
      },
    },
    ({ id }) => {
      try {
        return jsonResult(archiveTcpConnection(parseUUID(id)));
      } catch {
        return errorResult(`TCP connection not found: ${id}`);
      }
    },
  );
}

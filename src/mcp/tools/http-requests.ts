import "@/server-only";
import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  archiveRequestEvent,
  getAllRequestEventsMeta,
  getRequestEvent,
} from "@/request-events/model";
import { getHandlerExecutionsByRequestId } from "@/handler-executions/model";
import { sendWebhookRequest } from "@/webhook-server/send-request";
import { HTTP_METHODS } from "@/util/http";
import { kvListSchema, parseKvList } from "@/util/kv-list";
import { parseUUID } from "@/util/uuid";
import { errorResult, jsonResult } from "../tool-response";

export function registerHttpRequestTools(server: McpServer) {
  server.registerTool(
    "send-http-request",
    {
      title: "Send HTTP request",
      description:
        "Sends a test HTTP request to the webhook server. The request is captured as a request event and processed by matching handlers; use get-http-request afterwards to inspect the capture. Returns the HTTP response.",
      inputSchema: {
        method: z.enum(HTTP_METHODS).describe("HTTP method"),
        url: z
          .string()
          .min(1)
          .describe(
            "Path to request on the webhook server (e.g. '/my-hook'), or an absolute URL",
          ),
        headers: kvListSchema(z.string())
          .optional()
          .describe("Request headers as [name, value] pairs"),
        query: kvListSchema(z.string())
          .optional()
          .describe("Query parameters as [name, value] pairs"),
        body: z.base64().optional().describe("Base64-encoded request body"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        // Can target absolute URLs and triggers handler code
        openWorldHint: true,
      },
    },
    async ({ method, url, headers, query, body }) => {
      const response = await sendWebhookRequest({
        method,
        url,
        headers: parseKvList(headers ?? [], z.string()),
        query: parseKvList(query ?? [], z.string()),
        body,
      });
      return jsonResult({
        status: response.status,
        statusText: response.statusText,
        headers: [...response.headers.entries()],
        body: Buffer.from(await response.arrayBuffer()).toString("base64"),
      });
    },
  );

  server.registerTool(
    "list-http-requests",
    {
      title: "List HTTP requests",
      description:
        "Returns metadata for captured HTTP request events, most recent first. Payloads and headers are omitted; use get-http-request for full details.",
      inputSchema: {
        include_archived: z
          .boolean()
          .optional()
          .describe("Include archived requests (default false)"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ include_archived }) =>
      jsonResult(getAllRequestEventsMeta(include_archived ?? false)),
  );

  server.registerTool(
    "get-http-request",
    {
      title: "Get HTTP request",
      description:
        "Returns a full HTTP request event including payloads (base64-encoded bodies), headers, and its associated handler executions.",
      inputSchema: {
        id: z.uuid().describe("The request event id"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ id }) => {
      const requestId = parseUUID(id);
      try {
        return jsonResult({
          request: getRequestEvent(requestId),
          handler_executions: getHandlerExecutionsByRequestId(requestId),
        });
      } catch {
        return errorResult(`HTTP request not found: ${id}`);
      }
    },
  );

  server.registerTool(
    "archive-http-request",
    {
      title: "Archive HTTP request",
      description: "Archives an HTTP request event.",
      inputSchema: {
        id: z.uuid().describe("The request event id"),
      },
      annotations: {
        readOnlyHint: false,
        // Reversible via the dashboard's unarchive action
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    ({ id }) => {
      try {
        return jsonResult(archiveRequestEvent(parseUUID(id)));
      } catch {
        return errorResult(`HTTP request not found: ${id}`);
      }
    },
  );
}

import "@/server-only";
import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createHandler,
  deleteHandler,
  getAllHandlersMeta,
  getHandler,
  getNextHandlerOrder,
  updateHandler,
} from "@/handlers/model";
import { HTTP_METHODS } from "@/util/http";
import { parseUUID, randomUUID } from "@/util/uuid";
import { errorResult, jsonResult, textResult } from "../tool-response";

const methodSchema = z
  .enum(["*", ...HTTP_METHODS])
  .describe("HTTP method the handler matches ('*' matches all methods)");

export function registerHandlerTools(server: McpServer) {
  server.registerTool(
    "list-handlers",
    {
      title: "List webhook handlers",
      description:
        "Returns metadata for all webhook handlers in execution order. Handler code is omitted; use get-handler to read it.",
    },
    () => jsonResult(getAllHandlersMeta()),
  );

  server.registerTool(
    "get-handler",
    {
      title: "Get webhook handler",
      description: "Returns a webhook handler including its code.",
      inputSchema: {
        id: z.uuid().describe("The handler id"),
      },
    },
    ({ id }) => {
      try {
        return jsonResult(getHandler(parseUUID(id)));
      } catch {
        return errorResult(`Handler not found: ${id}`);
      }
    },
  );

  server.registerTool(
    "create-handler",
    {
      title: "Create webhook handler",
      description:
        "Creates a new webhook handler. The handler code runs for matching requests; see the 'handlers' manual page for the code API.",
      inputSchema: {
        name: z.string().min(1).describe("Display name for the handler"),
        code: z.string().min(1).describe("JavaScript handler code"),
        path: z
          .string()
          .min(1)
          .describe("URL path the handler matches, e.g. '/webhook' or '/*'"),
        method: methodSchema,
        order: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe(
            "Execution order (defaults to after all existing handlers)",
          ),
        jku: z.string().optional().describe("JWKS URL for JWT verification"),
        jwks: z
          .string()
          .optional()
          .describe("Inline JWKS for JWT verification"),
      },
    },
    ({ name, code, path, method, order, jku, jwks }) =>
      jsonResult(
        createHandler({
          id: randomUUID(),
          version_id: "1",
          name,
          code,
          path,
          method,
          order: order ?? getNextHandlerOrder(),
          jku,
          jwks,
        }),
      ),
  );

  server.registerTool(
    "update-handler",
    {
      title: "Update webhook handler",
      description:
        "Updates a webhook handler. Only the provided fields are changed.",
      inputSchema: {
        id: z.uuid().describe("The handler id"),
        name: z.string().min(1).optional(),
        code: z.string().min(1).optional(),
        path: z.string().min(1).optional(),
        method: methodSchema.optional(),
        order: z.number().int().min(0).optional(),
        jku: z.string().nullable().optional(),
        jwks: z.string().nullable().optional(),
      },
    },
    ({ id, ...updates }) => {
      let existing;
      try {
        existing = getHandler(parseUUID(id));
      } catch {
        return errorResult(`Handler not found: ${id}`);
      }
      const changes = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined),
      );
      return jsonResult(updateHandler({ ...existing, ...changes }));
    },
  );

  server.registerTool(
    "delete-handler",
    {
      title: "Delete webhook handler",
      description: "Permanently deletes a webhook handler.",
      inputSchema: {
        id: z.uuid().describe("The handler id"),
      },
    },
    ({ id }) => {
      try {
        getHandler(parseUUID(id));
      } catch {
        return errorResult(`Handler not found: ${id}`);
      }
      deleteHandler(parseUUID(id));
      return textResult(`Handler deleted: ${id}`);
    },
  );
}

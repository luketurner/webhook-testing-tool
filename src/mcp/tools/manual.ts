import "@/server-only";
import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { manualPages } from "@/docs";
import { errorResult, jsonResult, textResult } from "../tool-response";

export function registerManualTools(server: McpServer) {
  server.registerTool(
    "list-manual-pages",
    {
      title: "List manual pages",
      description:
        "Returns the names of the built-in manual pages documenting Webhook Testing Tool features.",
    },
    () => jsonResult(Object.keys(manualPages)),
  );

  server.registerTool(
    "get-manual-page",
    {
      title: "Get manual page",
      description: "Returns a manual page as raw markdown.",
      inputSchema: {
        name: z.string().min(1).describe("The manual page name"),
      },
    },
    async ({ name }) => {
      const pagePath = manualPages[name];
      if (!pagePath) {
        return errorResult(
          `Manual page not found: ${name}. Available pages: ${Object.keys(manualPages).join(", ")}`,
        );
      }
      return textResult(await Bun.file(pagePath).text());
    },
  );
}

import "@/server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerHttpRequestTools } from "./tools/http-requests";
import { registerTcpConnectionTools } from "./tools/tcp-connections";
import { registerHandlerTools } from "./tools/handlers";
import { registerJwtTools } from "./tools/jwt";
import { registerManualTools } from "./tools/manual";

// The MCP endpoint is stateless, so a fresh server is created per request.
// Construction only registers tools and is cheap.
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "webhook-testing-tool",
    version: "1.0.0",
  });

  registerHttpRequestTools(server);
  registerTcpConnectionTools(server);
  registerHandlerTools(server);
  registerJwtTools(server);
  registerManualTools(server);

  return server;
}

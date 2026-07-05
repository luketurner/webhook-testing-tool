import "@/server-only";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { JWTPayload } from "jose";
import { withMcpAuth } from "@/auth/mcp-auth";
import { withCors } from "@/auth/cors";
import { createMcpServer } from "./server";

function toAuthInfo(req: Request, jwt: JWTPayload): AuthInfo {
  const authorization = req.headers.get("authorization") ?? "";
  return {
    token: authorization.replace(/^Bearer\s+/, ""),
    clientId: typeof jwt.client_id === "string" ? jwt.client_id : "",
    scopes: typeof jwt.scope === "string" ? jwt.scope.split(" ") : [],
    expiresAt: jwt.exp,
  };
}

const methodNotAllowed = () =>
  new Response(null, { status: 405, headers: { Allow: "POST" } });

// The /mcp endpoint uses OAuth bearer tokens, so it is mounted without
// buildController (which applies session-cookie auth).
export const mcpController = {
  "/mcp": {
    POST: withCors(
      withMcpAuth(async (req, _server, jwt) => {
        const mcpServer = createMcpServer();
        const transport = new WebStandardStreamableHTTPServerTransport({
          sessionIdGenerator: undefined, // stateless
          enableJsonResponse: true,
        });
        await mcpServer.connect(transport);
        return transport.handleRequest(req, {
          authInfo: toAuthInfo(req, jwt),
        });
      }),
    ),
    // Stateless server: no SSE stream to open, no session to terminate
    GET: withCors(methodNotAllowed),
    DELETE: withCors(methodNotAllowed),
    // withCors answers preflight requests before invoking the handler
    OPTIONS: withCors(methodNotAllowed),
  },
};

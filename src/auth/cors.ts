import "@/server-only";
import type { ControllerMethod } from "@/dashboard/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, mcp-protocol-version",
  "Access-Control-Max-Age": "86400",
};

/**
 * Adds permissive CORS headers to a controller's responses and answers
 * preflight requests. Only for public OAuth/MCP endpoints — credentialed
 * (cookie) endpoints are unaffected because browsers reject wildcard
 * origins for credentialed requests.
 */
export function withCors(controller: ControllerMethod): ControllerMethod {
  return async (req: Request, server: Bun.Server<undefined>) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    const response = await controller(req, server);
    for (const [k, v] of Object.entries(CORS_HEADERS)) {
      response.headers.set(k, v);
    }
    return response;
  };
}

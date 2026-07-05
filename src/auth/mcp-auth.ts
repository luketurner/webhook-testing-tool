import "@/server-only";
import { verifyJwsAccessToken } from "better-auth/oauth2";
import type { JWTPayload } from "jose";
import { auth } from "./index";
import { db } from "@/db";
import { BASE_URL } from "@/config";
import type { ControllerMethod } from "@/dashboard/server";

export const MCP_RESOURCE = `${BASE_URL}/mcp`;
export const OAUTH_ISSUER = `${BASE_URL}/api/auth`;

export type McpControllerMethod = (
  req: Request,
  server: Bun.Server<undefined>,
  jwt: JWTPayload,
) => Response | Promise<Response>;

// Stable cache key so verifyJwsAccessToken caches the fetched JWKS
const jwksCacheKey = {};

// Access tokens are stateless JWTs, so consent is re-checked on every request
// to make revoking an application in the dashboard take effect immediately
// instead of when the token expires. WTT is both the authorization server and
// the resource server, so this is one indexed query against the local DB.
function hasActiveConsent(jwt: JWTPayload): boolean {
  // client_id is populated from the azp claim by verifyJwsAccessToken
  const clientId = jwt.client_id;
  const userId = jwt.sub;
  if (typeof clientId !== "string" || typeof userId !== "string") {
    return false;
  }
  return (
    db
      .query(
        `SELECT "id" FROM "oauthConsent" WHERE "clientId" = ? AND "userId" = ?`,
      )
      .get(clientId, userId) !== null
  );
}

function unauthorized(message: string, invalidToken: boolean): Response {
  // MCP clients rely on resource_metadata for authorization server discovery
  // (RFC 9728). The path suffix matches the resource URL's path.
  const params = [
    ...(invalidToken ? ['error="invalid_token"'] : []),
    `resource_metadata="${BASE_URL}/.well-known/oauth-protected-resource/mcp"`,
  ];
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate": `Bearer ${params.join(", ")}`,
    },
  });
}

/**
 * Bearer-token auth middleware for the MCP endpoint. Verifies OAuth access
 * tokens (JWTs issued by the oauth-provider plugin) against the local JWKS
 * in-process — no HTTP self-fetch, which matters when BASE_URL is a public
 * address that is not reachable from the server itself.
 */
export function withMcpAuth(controller: McpControllerMethod): ControllerMethod {
  return async (req: Request, server: Bun.Server<undefined>) => {
    const authorization = req.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : undefined;

    if (!token) {
      return unauthorized("missing authorization header", false);
    }

    let jwt: JWTPayload;
    try {
      jwt = await verifyJwsAccessToken(token, {
        jwksFetch: async () => auth.api.getJwks(),
        jwksCacheKey,
        verifyOptions: {
          issuer: OAUTH_ISSUER,
          audience: MCP_RESOURCE,
        },
      });
    } catch (error) {
      console.error("MCP auth error:", error);
      return unauthorized("invalid access token", true);
    }

    if (!hasActiveConsent(jwt)) {
      return unauthorized("authorization revoked", true);
    }

    return controller(req, server, jwt);
  };
}

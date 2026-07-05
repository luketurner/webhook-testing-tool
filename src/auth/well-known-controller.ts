import "@/server-only";
import {
  oauthProviderAuthServerMetadata,
  oauthProviderOpenIdConfigMetadata,
} from "@better-auth/oauth-provider";
import { auth } from "./index";
import { withCors } from "./cors";
import { BASE_URL } from "@/config";

// The OAuth issuer is the better-auth base URL (BASE_URL + /api/auth), so per
// RFC 8414 clients probe both the path-inserted and root well-known variants.
const authServerMetadata = withCors(oauthProviderAuthServerMetadata(auth));
const openIdConfigMetadata = withCors(oauthProviderOpenIdConfigMetadata(auth));

// RFC 9728 protected resource metadata for the MCP server. MCP clients are
// pointed here by the WWW-Authenticate header on 401 responses from /mcp.
const protectedResourceMetadata = withCors(() =>
  Response.json({
    resource: `${BASE_URL}/mcp`,
    authorization_servers: [`${BASE_URL}/api/auth`],
    bearer_methods_supported: ["header"],
    resource_name: "Webhook Testing Tool MCP Server",
    scopes_supported: ["openid", "profile", "email", "offline_access"],
  }),
);

export const wellKnownController = {
  "/.well-known/oauth-authorization-server": authServerMetadata,
  "/.well-known/oauth-authorization-server/api/auth": authServerMetadata,
  "/.well-known/openid-configuration": openIdConfigMetadata,
  "/.well-known/openid-configuration/api/auth": openIdConfigMetadata,
  "/.well-known/oauth-protected-resource": protectedResourceMetadata,
  "/.well-known/oauth-protected-resource/mcp": protectedResourceMetadata,
};

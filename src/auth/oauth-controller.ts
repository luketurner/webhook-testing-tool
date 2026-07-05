import "@/server-only";
import { auth } from "./index";
import { withCors } from "./cors";

const handler = (req: Request) => auth.handler(req);

// Selectively mounts the better-auth handler for the OAuth provider plugin's
// endpoints. Mounted without buildController: these endpoints implement their
// own auth (session cookies for authorize/consent, client credentials/PKCE
// for token). The rest of the better-auth surface (e.g. sign-up) stays
// unexposed; the hand-rolled routes in controller.ts take precedence because
// exact routes win over wildcards in Bun's router.
export const oauthController = {
  // authorize, token, register, consent, userinfo, introspect, revoke, ...
  "/api/auth/oauth2/*": withCors(handler),
  // JWKS published by the jwt plugin; used to verify MCP access tokens
  "/api/auth/jwks": withCors(handler),
  // issuer-relative discovery documents served by the plugin's onRequest hook
  "/api/auth/.well-known/*": withCors(handler),
};

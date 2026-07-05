import { describe, test, expect, beforeEach } from "bun:test";
import { auth } from "@/auth";
import { db } from "@/db";
import { BASE_URL } from "@/config";
import { mcpController } from "@/mcp/controller";
import { wellKnownController } from "@/auth/well-known-controller";
import { oauthConsentsController } from "@/auth/oauth-consents-controller";

// Full OAuth 2.1 authorization flow against the in-process better-auth
// handler: dynamic client registration -> authorize (PKCE) -> consent ->
// token exchange -> authenticated MCP call -> consent revocation.

const fakeServer = {} as Bun.Server<undefined>;
const REDIRECT_URI = "http://localhost:9099/callback";
const MCP_RESOURCE = `${BASE_URL}/mcp`;
const ISSUER = `${BASE_URL}/api/auth`;

const testEmail = "oauth-tester@example.com";
const testPassword = "test-password-123";

function base64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

async function makePkce() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64url(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
    ),
  );
  return { verifier, challenge };
}

async function createSessionCookie(): Promise<string> {
  await auth.api.signUpEmail({
    body: { email: testEmail, password: testPassword, name: "OAuth Tester" },
  });
  const response = await auth.api.signInEmail({
    body: { email: testEmail, password: testPassword },
    asResponse: true,
  });
  const cookie = response.headers
    .getSetCookie()
    .find((c) => c.startsWith("better-auth.session_token="));
  expect(cookie).toBeTruthy();
  return cookie!.split(";")[0];
}

async function registerClient(): Promise<string> {
  const response = await auth.handler(
    new Request(`${ISSUER}/oauth2/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: "Test MCP Client",
        redirect_uris: [REDIRECT_URI],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
      }),
    }),
  );
  expect([200, 201]).toContain(response.status);
  const client = await response.json();
  expect(client.client_id).toBeString();
  return client.client_id;
}

interface FlowResult {
  clientId: string;
  sessionCookie: string;
  tokens: {
    access_token: string;
    refresh_token?: string;
    token_type: string;
  };
}

async function runAuthorizationFlow(scope: string): Promise<FlowResult> {
  const sessionCookie = await createSessionCookie();
  const clientId = await registerClient();
  const { verifier, challenge } = await makePkce();

  // Authorize: no consent yet, so this redirects to the consent page with a
  // signed oauth query appended to the hash URL
  const authorizeUrl = new URL(`${ISSUER}/oauth2/authorize`);
  authorizeUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope,
    state: "test-state",
    code_challenge: challenge,
    code_challenge_method: "S256",
    resource: MCP_RESOURCE,
  }).toString();
  const authorizeResponse = await auth.handler(
    new Request(authorizeUrl, {
      headers: { Cookie: sessionCookie, Accept: "application/json" },
    }),
  );
  const authorizeData = await authorizeResponse.json();
  expect(authorizeData.url).toContain("/oauth/consent?");
  const oauthQuery = authorizeData.url.split("?")[1];

  // Consent: accepts and resumes authorization, returning the client
  // callback URL with the authorization code
  const consentResponse = await auth.handler(
    new Request(`${ISSUER}/oauth2/consent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
        Accept: "application/json",
      },
      body: JSON.stringify({ accept: true, oauth_query: oauthQuery }),
    }),
  );
  const consentData = await consentResponse.json();
  expect(consentData.url).toStartWith(REDIRECT_URI);
  const callbackUrl = new URL(consentData.url);
  const code = callbackUrl.searchParams.get("code");
  expect(code).toBeString();
  expect(callbackUrl.searchParams.get("state")).toBe("test-state");
  expect(callbackUrl.searchParams.get("iss")).toBe(ISSUER);

  // Token exchange with PKCE verifier and RFC 8707 resource indicator
  const tokenResponse = await auth.handler(
    new Request(`${ISSUER}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code!,
        code_verifier: verifier,
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        resource: MCP_RESOURCE,
      }).toString(),
    }),
  );
  expect(tokenResponse.status).toBe(200);
  const tokens = await tokenResponse.json();
  expect(tokens.access_token).toBeString();
  return { clientId, sessionCookie, tokens };
}

async function callMcp(accessToken: string): Promise<Response> {
  return mcpController["/mcp"].POST(
    new Request(MCP_RESOURCE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
    }),
    fakeServer,
  );
}

describe("MCP OAuth flow", () => {
  beforeEach(() => {
    // NOTE: the jwks table is deliberately NOT cleared — the signing key is
    // cached in-process and clearing it would desync token verification
    for (const table of [
      "oauthConsent",
      "oauthAccessToken",
      "oauthRefreshToken",
      "oauthClient",
      "session",
      "account",
      "user",
    ]) {
      db.prepare(`DELETE FROM "${table}"`).run();
    }
  });

  test("well-known discovery documents are served with correct issuer", async () => {
    const metadataResponse = await wellKnownController[
      "/.well-known/oauth-authorization-server"
    ](
      new Request(`${BASE_URL}/.well-known/oauth-authorization-server`),
      fakeServer,
    );
    expect(metadataResponse.status).toBe(200);
    expect(metadataResponse.headers.get("Access-Control-Allow-Origin")).toBe(
      "*",
    );
    const metadata = await metadataResponse.json();
    expect(metadata.issuer).toBe(ISSUER);
    expect(metadata.authorization_endpoint).toBe(`${ISSUER}/oauth2/authorize`);
    expect(metadata.token_endpoint).toBe(`${ISSUER}/oauth2/token`);
    expect(metadata.registration_endpoint).toBe(`${ISSUER}/oauth2/register`);
    expect(metadata.jwks_uri).toBe(`${ISSUER}/jwks`);
    expect(metadata.code_challenge_methods_supported).toEqual(["S256"]);

    const resourceResponse = await wellKnownController[
      "/.well-known/oauth-protected-resource/mcp"
    ](
      new Request(`${BASE_URL}/.well-known/oauth-protected-resource/mcp`),
      fakeServer,
    );
    const resourceMetadata = await resourceResponse.json();
    expect(resourceMetadata.resource).toBe(MCP_RESOURCE);
    expect(resourceMetadata.authorization_servers).toEqual([ISSUER]);
  });

  test("full flow: register, authorize, consent, exchange, call MCP", async () => {
    const { tokens } = await runAuthorizationFlow(
      "openid profile offline_access",
    );
    expect(tokens.refresh_token).toBeString();

    const mcpResponse = await callMcp(tokens.access_token);
    expect(mcpResponse.status).toBe(200);
    const rpc = await mcpResponse.json();
    expect(rpc.result.tools).toHaveLength(16);
    const names = rpc.result.tools.map((t: { name: string }) => t.name);
    expect(names).toContain("list-http-requests");
    expect(names).toContain("send-http-request");
    expect(names).toContain("verify-jwt");
  });

  test("denying consent redirects with access_denied", async () => {
    const sessionCookie = await createSessionCookie();
    const clientId = await registerClient();
    const { challenge } = await makePkce();

    const authorizeUrl = new URL(`${ISSUER}/oauth2/authorize`);
    authorizeUrl.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: "openid",
      state: "deny-state",
      code_challenge: challenge,
      code_challenge_method: "S256",
      resource: MCP_RESOURCE,
    }).toString();
    const authorizeResponse = await auth.handler(
      new Request(authorizeUrl, {
        headers: { Cookie: sessionCookie, Accept: "application/json" },
      }),
    );
    const oauthQuery = (await authorizeResponse.json()).url.split("?")[1];

    const consentResponse = await auth.handler(
      new Request(`${ISSUER}/oauth2/consent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
          Accept: "application/json",
        },
        body: JSON.stringify({ accept: false, oauth_query: oauthQuery }),
      }),
    );
    const consentData = await consentResponse.json();
    expect(consentData.url).toContain("error=access_denied");
  });

  test("consents endpoint lists the authorized application with client info", async () => {
    const { clientId, sessionCookie } = await runAuthorizationFlow("openid");

    const response = await oauthConsentsController["/api/oauth/consents"].GET(
      new Request(`${BASE_URL}/api/oauth/consents`, {
        headers: { Cookie: sessionCookie },
      }),
    );
    expect(response.status).toBe(200);
    const consents = await response.json();
    expect(consents).toHaveLength(1);
    expect(consents[0].clientId).toBe(clientId);
    expect(consents[0].scopes).toContain("openid");
    expect(consents[0].client.client_name).toBe("Test MCP Client");
  });

  test("revoking a consent revokes the client's refresh tokens", async () => {
    const { clientId, sessionCookie, tokens } = await runAuthorizationFlow(
      "openid offline_access",
    );
    expect(tokens.refresh_token).toBeString();

    // The access token works before revocation
    expect((await callMcp(tokens.access_token)).status).toBe(200);

    const listResponse = await oauthConsentsController[
      "/api/oauth/consents"
    ].GET(
      new Request(`${BASE_URL}/api/oauth/consents`, {
        headers: { Cookie: sessionCookie },
      }),
    );
    const consents = await listResponse.json();
    const consentId = consents[0].id;

    const deleteResponse = await oauthConsentsController[
      "/api/oauth/consents/:id"
    ].DELETE(
      Object.assign(
        new Request(`${BASE_URL}/api/oauth/consents/${consentId}`, {
          method: "DELETE",
          headers: { Cookie: sessionCookie },
        }),
        { params: { id: consentId } },
      ) as Bun.BunRequest<"/api/oauth/consents/:id">,
    );
    expect(deleteResponse.status).toBe(200);

    // Consent list is now empty
    const afterResponse = await oauthConsentsController[
      "/api/oauth/consents"
    ].GET(
      new Request(`${BASE_URL}/api/oauth/consents`, {
        headers: { Cookie: sessionCookie },
      }),
    );
    expect(await afterResponse.json()).toHaveLength(0);

    // The unexpired access token is rejected immediately (per-request
    // consent check), not just when it expires
    const revokedMcpResponse = await callMcp(tokens.access_token);
    expect(revokedMcpResponse.status).toBe(401);
    expect(revokedMcpResponse.headers.get("WWW-Authenticate")).toContain(
      'error="invalid_token"',
    );

    // Refresh grant now fails because the refresh token is revoked
    const refreshResponse = await auth.handler(
      new Request(`${ISSUER}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokens.refresh_token!,
          client_id: clientId,
        }).toString(),
      }),
    );
    expect(refreshResponse.status).toBeGreaterThanOrEqual(400);
  });

  test("tokens without the MCP audience are rejected", async () => {
    // Omitting the resource parameter yields an opaque (non-JWT) token,
    // which must not grant MCP access
    const sessionCookie = await createSessionCookie();
    const clientId = await registerClient();
    const { verifier, challenge } = await makePkce();

    const authorizeUrl = new URL(`${ISSUER}/oauth2/authorize`);
    authorizeUrl.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: "openid",
      code_challenge: challenge,
      code_challenge_method: "S256",
    }).toString();
    const authorizeResponse = await auth.handler(
      new Request(authorizeUrl, {
        headers: { Cookie: sessionCookie, Accept: "application/json" },
      }),
    );
    const oauthQuery = (await authorizeResponse.json()).url.split("?")[1];

    const consentResponse = await auth.handler(
      new Request(`${ISSUER}/oauth2/consent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
          Accept: "application/json",
        },
        body: JSON.stringify({ accept: true, oauth_query: oauthQuery }),
      }),
    );
    const code = new URL((await consentResponse.json()).url).searchParams.get(
      "code",
    );

    const tokenResponse = await auth.handler(
      new Request(`${ISSUER}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code!,
          code_verifier: verifier,
          client_id: clientId,
          redirect_uri: REDIRECT_URI,
        }).toString(),
      }),
    );
    expect(tokenResponse.status).toBe(200);
    const tokens = await tokenResponse.json();

    const mcpResponse = await callMcp(tokens.access_token);
    expect(mcpResponse.status).toBe(401);
  });
});

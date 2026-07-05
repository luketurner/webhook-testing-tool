import { describe, test, expect } from "bun:test";
import { mcpController } from "./controller";
import { BASE_URL } from "@/config";

const fakeServer = {} as Bun.Server<undefined>;
const route = mcpController["/mcp"];

function mcpRequest(init: RequestInit = {}): Request {
  return new Request(`${BASE_URL}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...init.headers,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    }),
    ...init,
  });
}

describe("mcp/controller auth", () => {
  test("POST without a token returns 401 with resource metadata discovery", async () => {
    const response = await route.POST(mcpRequest(), fakeServer);
    expect(response.status).toBe(401);
    const wwwAuthenticate = response.headers.get("WWW-Authenticate");
    expect(wwwAuthenticate).toStartWith("Bearer ");
    expect(wwwAuthenticate).toContain(
      `resource_metadata="${BASE_URL}/.well-known/oauth-protected-resource/mcp"`,
    );
  });

  test("POST with a garbage token returns 401 invalid_token", async () => {
    const response = await route.POST(
      mcpRequest({ headers: { Authorization: "Bearer garbage" } }),
      fakeServer,
    );
    expect(response.status).toBe(401);
    const wwwAuthenticate = response.headers.get("WWW-Authenticate");
    expect(wwwAuthenticate).toContain('error="invalid_token"');
    expect(wwwAuthenticate).toContain("resource_metadata=");
  });

  test("POST with a forged JWT returns 401", async () => {
    // Structurally valid JWT signed with an unknown key
    const forged =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
      Buffer.from(JSON.stringify({ sub: "x" })).toString("base64url") +
      ".c2lnbmF0dXJl";
    const response = await route.POST(
      mcpRequest({ headers: { Authorization: `Bearer ${forged}` } }),
      fakeServer,
    );
    expect(response.status).toBe(401);
  });

  test("GET returns 405 (stateless: no SSE stream)", async () => {
    const response = await route.GET(
      new Request(`${BASE_URL}/mcp`, { method: "GET" }),
      fakeServer,
    );
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
  });

  test("DELETE returns 405 (stateless: no session to terminate)", async () => {
    const response = await route.DELETE(
      new Request(`${BASE_URL}/mcp`, { method: "DELETE" }),
      fakeServer,
    );
    expect(response.status).toBe(405);
  });

  test("OPTIONS preflight returns CORS headers", async () => {
    const response = await route.OPTIONS(
      new Request(`${BASE_URL}/mcp`, { method: "OPTIONS" }),
      fakeServer,
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
      "Authorization",
    );
  });
});

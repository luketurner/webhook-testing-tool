import "@/server-only";
import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tryParseJWT } from "@/util/authorization";
import { verifyJWTWithKey } from "@/util/jwt-verify-key";
import { errorResult, jsonResult } from "../tool-response";

export function registerJwtTools(server: McpServer) {
  server.registerTool(
    "inspect-jwt",
    {
      title: "Inspect JWT",
      description:
        "Parses a raw JWT (with or without a 'Bearer ' prefix) and returns its decoded header and payload. Does not verify the signature; use verify-jwt for that.",
      inputSchema: {
        token: z.string().min(1).describe("The raw JWT"),
      },
    },
    ({ token }) => {
      const parsed = tryParseJWT(token.replace(/^Bearer\s+/, "").trim());
      if (!parsed) {
        return errorResult("Not a JWT: expected three dot-separated segments");
      }
      return jsonResult({
        isValid: parsed.isValid,
        headers: parsed.headers,
        payload: parsed.payload,
        signature: parsed.rawSignature,
        ...(parsed.error ? { error: String(parsed.error) } : {}),
      });
    },
  );

  server.registerTool(
    "verify-jwt",
    {
      title: "Verify JWT",
      description:
        "Verifies a JWT's signature and time-based claims against the provided key. The key may be a JWKS document, a single JWK, a PEM-encoded key or certificate (public or private), or an HMAC shared secret. Alternatively pass a JWKS endpoint URL as jku.",
      inputSchema: {
        token: z.string().min(1).describe("The raw JWT"),
        key: z
          .string()
          .optional()
          .describe("Key material: JWKS JSON, JWK JSON, PEM, or HMAC secret"),
        jku: z
          .string()
          .optional()
          .describe("JWKS endpoint URL to fetch keys from"),
      },
    },
    async ({ token, key, jku }) =>
      jsonResult(await verifyJWTWithKey(token, { key, jku })),
  );
}

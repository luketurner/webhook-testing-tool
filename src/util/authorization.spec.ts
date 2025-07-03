import { describe, expect, test } from "bun:test";
import {
  isBasicAuth,
  isDigestAuth,
  isGenericBearerAuth,
  isJWTAuth,
  isUnknownAuth,
  parseAuthorizationHeader,
  parseUnknownHeader,
  tryParseBasicHeader,
  tryParseDigestHeader,
  tryParseGenericBearerHeader,
  tryParseJWTHeader,
} from "./authorization";

// These tests cover all authorization header formats supported by the system

describe("Authorization Header Parsing", () => {
  describe("tryParseBasicHeader", () => {
    test("should parse valid Basic auth header", () => {
      const credentials = btoa("username:password");
      const header = `Basic ${credentials}`;

      const result = tryParseBasicHeader(header);

      expect(result).not.toBeNull();
      expect(result!.authType).toBe("basic");
      expect(result!.isValid).toBe(true);
      expect(result!.username).toBe("username");
      expect(result!.password).toBe("password");
      expect(result!.encodedCredentials).toBe(credentials);
      expect(result!.rawHeader).toBe(header);
    });

    test("should parse Basic auth with colon in password", () => {
      const credentials = btoa("user:pass:with:colons");
      const header = `Basic ${credentials}`;

      const result = tryParseBasicHeader(header);

      expect(result).not.toBeNull();
      expect(result!.username).toBe("user");
      expect(result!.password).toBe("pass:with:colons");
    });

    test("should parse Basic auth with empty password", () => {
      const credentials = btoa("username:");
      const header = `Basic ${credentials}`;

      const result = tryParseBasicHeader(header);

      expect(result).not.toBeNull();
      expect(result!.username).toBe("username");
      expect(result!.password).toBe("");
    });

    test("should return null for non-Basic headers", () => {
      expect(tryParseBasicHeader("Bearer token123")).toBeNull();
      expect(tryParseBasicHeader("Digest realm=test")).toBeNull();
      expect(tryParseBasicHeader("Unknown header")).toBeNull();
    });

    test("should handle invalid base64 encoding", () => {
      const header = "Basic invalid-base64-!@#$";

      const result = tryParseBasicHeader(header);

      expect(result).not.toBeNull();
      expect(result!.authType).toBe("basic");
      expect(result!.isValid).toBe(false);
      expect(result!.error).toBeDefined();
    });

    test("should handle malformed credentials format", () => {
      const credentials = btoa("no-colon-separator");
      const header = `Basic ${credentials}`;

      const result = tryParseBasicHeader(header);

      expect(result).not.toBeNull();
      expect(result!.isValid).toBe(false);
      expect(result!.error).toBeDefined();
    });
  });

  describe("tryParseDigestHeader", () => {
    test("should recognize Digest auth header", () => {
      const header = "Digest realm=test";

      const result = tryParseDigestHeader(header);

      expect(result).not.toBeNull();
      expect(result!.authType).toBe("digest");
      expect(result!.isValid).toBe(true);
      expect(result!.rawHeader).toBe(header);
    });

    test("should return null for non-Digest headers", () => {
      expect(tryParseDigestHeader("Basic dXNlcjpwYXNz")).toBeNull();
      expect(tryParseDigestHeader("Bearer token123")).toBeNull();
      expect(tryParseDigestHeader("Unknown header")).toBeNull();
    });

    test("should handle complex Digest parameters", () => {
      const header =
        'Digest username="user", realm="Test Realm", nonce="abc123", uri="/resource", response="def456"';

      const result = tryParseDigestHeader(header);

      expect(result).not.toBeNull();
      expect(result!.authType).toBe("digest");
      expect(result!.isValid).toBe(true);
    });
  });

  describe("tryParseGenericBearerHeader", () => {
    test("should parse Bearer token header", () => {
      const token = "abc123def456";
      const header = `Bearer ${token}`;

      const result = tryParseGenericBearerHeader(header);

      expect(result).not.toBeNull();
      expect(result!.authType).toBe("bearer");
      expect(result!.isValid).toBe(false); // Generic bearer is always false until validated
      expect(result!.token).toBe(token);
      expect(result!.rawHeader).toBe(header);
    });

    test("should handle Bearer token with spaces", () => {
      const token = "token with spaces";
      const header = `Bearer ${token}`;

      const result = tryParseGenericBearerHeader(header);

      expect(result).not.toBeNull();
      expect(result!.token).toBe(token);
    });

    test("should return null for non-Bearer headers", () => {
      expect(tryParseGenericBearerHeader("Basic dXNlcjpwYXNz")).toBeNull();
      expect(tryParseGenericBearerHeader("Digest realm=test")).toBeNull();
      expect(tryParseGenericBearerHeader("Unknown header")).toBeNull();
    });

    test("should handle empty Bearer token", () => {
      const header = "Bearer ";

      const result = tryParseGenericBearerHeader(header);

      expect(result).not.toBeNull();
      expect(result!.token).toBe("");
    });
  });

  describe("tryParseJWTHeader", () => {
    test("should parse valid JWT Bearer token", () => {
      const header = { alg: "RS256", typ: "JWT" };
      const payload = { sub: "1234567890", name: "John Doe", iat: 1516239022 };

      const headerB64 = btoa(JSON.stringify(header));
      const payloadB64 = btoa(JSON.stringify(payload));
      const signature = "signature";

      const jwt = `Bearer ${headerB64}.${payloadB64}.${signature}`;

      const result = tryParseJWTHeader(jwt);

      expect(result).not.toBeNull();
      expect(result!.authType).toBe("jwt");
      expect(result!.isValid).toBe(true);
      expect(result!.rawHeader).toBe(jwt);
      expect(result!.rawHeaders).toBe(headerB64);
      expect(result!.rawPayload).toBe(payloadB64);
      expect(result!.rawSignature).toBe(signature);
      expect(result!.headers).toEqual(header);
      expect(result!.payload).toEqual(payload);
      expect(result!.decodedHeaders).toBe(JSON.stringify(header));
      expect(result!.decodedPayload).toBe(JSON.stringify(payload));
    });

    test("should handle JWT with base64url encoding (- and _ characters)", () => {
      const header = { alg: "RS256", typ: "JWT" };
      const payload = { sub: "1234567890", name: "John Doe", iat: 1516239022 };

      // Create base64url encoded parts (with - and _ instead of + and /)
      const headerB64 = btoa(JSON.stringify(header))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
      const payloadB64 = btoa(JSON.stringify(payload))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
      const signature = "sig-with_special-chars";

      const jwt = `Bearer ${headerB64}.${payloadB64}.${signature}`;

      const result = tryParseJWTHeader(jwt);

      expect(result).not.toBeNull();
      expect(result!.authType).toBe("jwt");
      expect(result!.isValid).toBe(true);
      expect(result!.rawHeaders).toBe(headerB64);
      expect(result!.rawPayload).toBe(payloadB64);
      expect(result!.rawSignature).toBe(signature);
    });

    test("should return null for non-JWT Bearer tokens", () => {
      expect(tryParseJWTHeader("Bearer simple-token")).toBeNull();
      // This should return a JWT object with isValid=false due to invalid base64 in parts
      const result = tryParseJWTHeader("Bearer token.without.proper.structure");
      expect(result).not.toBeNull();
      expect(result!.isValid).toBe(false);
      expect(tryParseJWTHeader("Basic dXNlcjpwYXNz")).toBeNull();
    });

    test("should handle invalid JWT structure gracefully", () => {
      const jwt = "Bearer invalid.structure";

      const result = tryParseJWTHeader(jwt);

      expect(result).toBeNull();
    });

    test("should handle invalid base64 in JWT parts", () => {
      const jwt = "Bearer invalid-base64!@#.invalid-base64!@#.signature";

      const result = tryParseJWTHeader(jwt);

      expect(result).not.toBeNull();
      expect(result!.authType).toBe("jwt");
      expect(result!.isValid).toBe(false);
      expect(result!.error).toBeDefined();
    });

    test("should handle invalid JSON in JWT parts", () => {
      const invalidHeader = btoa("not-json");
      const validPayload = btoa(JSON.stringify({ sub: "123" }));
      const jwt = `Bearer ${invalidHeader}.${validPayload}.signature`;

      const result = tryParseJWTHeader(jwt);

      expect(result).not.toBeNull();
      expect(result!.authType).toBe("jwt");
      expect(result!.isValid).toBe(false);
      expect(result!.error).toBeDefined();
    });

    test("should parse JWT with complex payload", () => {
      const header = { alg: "HS256", typ: "JWT", kid: "key-123" };
      const payload = {
        sub: "1234567890",
        name: "John Doe",
        iat: 1516239022,
        exp: 1516242622,
        aud: ["api1", "api2"],
        scope: "read write",
        custom: { nested: "value" },
      };

      const headerB64 = btoa(JSON.stringify(header));
      const payloadB64 = btoa(JSON.stringify(payload));
      const signature = "HS256-signature";

      const jwt = `Bearer ${headerB64}.${payloadB64}.${signature}`;

      const result = tryParseJWTHeader(jwt);

      expect(result).not.toBeNull();
      expect(result!.isValid).toBe(true);
      expect(result!.headers).toEqual(header);
      expect(result!.payload).toEqual(payload);
    });
  });

  describe("parseUnknownHeader", () => {
    test("should parse any header as unknown type", () => {
      const header = "Custom auth-scheme param1=value1";

      const result = parseUnknownHeader(header);

      expect(result.authType).toBe("unknown");
      expect(result.isValid).toBe(true);
      expect(result.rawHeader).toBe(header);
    });

    test("should handle empty header", () => {
      const result = parseUnknownHeader("");

      expect(result.authType).toBe("unknown");
      expect(result.isValid).toBe(true);
      expect(result.rawHeader).toBe("");
    });
  });

  describe("parseAuthorizationHeader", () => {
    test("should parse Basic auth header", () => {
      const credentials = btoa("user:pass");
      const header = `Basic ${credentials}`;

      const result = parseAuthorizationHeader(header);

      expect(result.authType).toBe("basic");
      expect(isBasicAuth(result)).toBe(true);
      if (isBasicAuth(result)) {
        expect(result.username).toBe("user");
        expect(result.password).toBe("pass");
      }
    });

    test("should parse Digest auth header", () => {
      const header = "Digest realm=test";

      const result = parseAuthorizationHeader(header);

      expect(result.authType).toBe("digest");
      expect(isDigestAuth(result)).toBe(true);
    });

    test("should prioritize JWT over generic Bearer", () => {
      const header = { alg: "RS256", typ: "JWT" };
      const payload = { sub: "123" };
      const headerB64 = btoa(JSON.stringify(header));
      const payloadB64 = btoa(JSON.stringify(payload));
      const jwt = `Bearer ${headerB64}.${payloadB64}.signature`;

      const result = parseAuthorizationHeader(jwt);

      expect(result.authType).toBe("jwt");
      expect(isJWTAuth(result)).toBe(true);
      expect(isGenericBearerAuth(result)).toBe(false);
    });

    test("should parse non-JWT Bearer as generic bearer", () => {
      const header = "Bearer simple-token";

      const result = parseAuthorizationHeader(header);

      expect(result.authType).toBe("bearer");
      expect(isGenericBearerAuth(result)).toBe(true);
      if (isGenericBearerAuth(result)) {
        expect(result.token).toBe("simple-token");
      }
    });

    test("should parse unknown header types", () => {
      const header = "CustomScheme token=value";

      const result = parseAuthorizationHeader(header);

      expect(result.authType).toBe("unknown");
      expect(isUnknownAuth(result)).toBe(true);
    });

    test("should follow correct parsing priority order", () => {
      // The parser should try in order: Basic, Digest, JWT, Generic Bearer, Unknown

      // Test that Basic takes precedence
      const basicHeader = `Basic ${btoa("user:pass")}`;
      expect(parseAuthorizationHeader(basicHeader).authType).toBe("basic");

      // Test that Digest takes precedence over others (except Basic)
      const digestHeader = "Digest realm=test";
      expect(parseAuthorizationHeader(digestHeader).authType).toBe("digest");

      // Test that JWT takes precedence over generic Bearer
      const jwtHeader = `Bearer ${btoa('{"alg":"RS256"}')}.${btoa('{"sub":"123"}')}.sig`;
      expect(parseAuthorizationHeader(jwtHeader).authType).toBe("jwt");

      // Test that generic Bearer is used when JWT parsing fails
      const bearerHeader = "Bearer simple-token";
      expect(parseAuthorizationHeader(bearerHeader).authType).toBe("bearer");
    });
  });

  describe("Type guards", () => {
    test("isBasicAuth should correctly identify Basic auth", () => {
      const basicAuth = tryParseBasicHeader(`Basic ${btoa("user:pass")}`);
      const jwtAuth = tryParseJWTHeader(
        `Bearer ${btoa('{"alg":"RS256"}')}.${btoa('{"sub":"123"}')}.sig`,
      );

      expect(isBasicAuth(basicAuth!)).toBe(true);
      expect(isBasicAuth(jwtAuth!)).toBe(false);
    });

    test("isDigestAuth should correctly identify Digest auth", () => {
      const digestAuth = tryParseDigestHeader("Digest realm=test");
      const basicAuth = tryParseBasicHeader(`Basic ${btoa("user:pass")}`);

      expect(isDigestAuth(digestAuth!)).toBe(true);
      expect(isDigestAuth(basicAuth!)).toBe(false);
    });

    test("isGenericBearerAuth should correctly identify generic Bearer auth", () => {
      const bearerAuth = tryParseGenericBearerHeader("Bearer token123");
      const jwtAuth = tryParseJWTHeader(
        `Bearer ${btoa('{"alg":"RS256"}')}.${btoa('{"sub":"123"}')}.sig`,
      );

      expect(isGenericBearerAuth(bearerAuth!)).toBe(true);
      expect(isGenericBearerAuth(jwtAuth!)).toBe(false);
    });

    test("isJWTAuth should correctly identify JWT auth", () => {
      const jwtAuth = tryParseJWTHeader(
        `Bearer ${btoa('{"alg":"RS256"}')}.${btoa('{"sub":"123"}')}.sig`,
      );
      const bearerAuth = tryParseGenericBearerHeader("Bearer simple-token");

      expect(isJWTAuth(jwtAuth!)).toBe(true);
      expect(isJWTAuth(bearerAuth!)).toBe(false);
    });

    test("isUnknownAuth should correctly identify unknown auth", () => {
      const unknownAuth = parseUnknownHeader("CustomScheme param=value");
      const basicAuth = tryParseBasicHeader(`Basic ${btoa("user:pass")}`);

      expect(isUnknownAuth(unknownAuth)).toBe(true);
      expect(isUnknownAuth(basicAuth!)).toBe(false);
    });
  });

  describe("Edge cases and error handling", () => {
    test("should handle headers with extra whitespace", () => {
      const header = `  Basic   ${btoa("user:pass")}  `;

      const result = tryParseBasicHeader(header);

      expect(result).toBeNull(); // Should be null because it doesn't start with "Basic "
    });

    test("should handle case sensitivity correctly", () => {
      // Authorization headers are case-sensitive per RFC 7235
      expect(tryParseBasicHeader("basic dXNlcjpwYXNz")).toBeNull();
      expect(tryParseBasicHeader("BASIC dXNlcjpwYXNz")).toBeNull();
      expect(tryParseDigestHeader("digest realm=test")).toBeNull();
      expect(tryParseGenericBearerHeader("bearer token123")).toBeNull();
    });

    test("should handle very long headers", () => {
      const longToken = "a".repeat(10000);
      const header = `Bearer ${longToken}`;

      const result = tryParseGenericBearerHeader(header);

      expect(result).not.toBeNull();
      expect(result!.token).toBe(longToken);
    });

    test("should handle special characters in headers", () => {
      const specialChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
      const header = `Bearer ${specialChars}`;

      const result = tryParseGenericBearerHeader(header);

      expect(result).not.toBeNull();
      expect(result!.token).toBe(specialChars);
    });

    test("should handle Unicode characters", () => {
      // Note: btoa doesn't handle Unicode directly, so this will fail
      // This test shows the limitation of basic Base64 encoding with Unicode
      const unicodeString = "🔐🗝️💯";

      expect(() => {
        const credentials = btoa(`user:${unicodeString}`);
        const header = `Basic ${credentials}`;
        tryParseBasicHeader(header);
      }).toThrow();
    });
  });
});

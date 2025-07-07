import { describe, expect, test } from "bun:test";
import {
  isBasicAuth,
  isDigestAuth,
  isGenericBearerAuth,
  isJWTAuth,
  isUnknownAuth,
  isHMACAuth,
  parseAuthorizationHeader,
  parseUnknownHeader,
  tryParseBasicHeader,
  tryParseDigestHeader,
  tryParseGenericBearerHeader,
  tryParseJWTHeader,
  tryParseHMACHeader,
  verifyHMACAuthorization,
} from "./authorization";
import { createHmac } from "crypto";

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
      expect(result!.username).toBe("user");
      expect(result!.realm).toBe("Test Realm");
      expect(result!.nonce).toBe("abc123");
      expect(result!.uri).toBe("/resource");
      expect(result!.response).toBe("def456");
    });

    test("should parse Digest with all RFC 7616 parameters", () => {
      const header =
        'Digest username="admin", realm="My App", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", uri="/dir/index.html", qop=auth, nc=00000001, cnonce="0a4f113b", response="6629fae49393a05397450978507c4ef1", opaque="5ccc069c403ebaf9f0171e9517f40e41", algorithm=MD5';

      const result = tryParseDigestHeader(header);

      expect(result).not.toBeNull();
      expect(result!.authType).toBe("digest");
      expect(result!.isValid).toBe(true);
      expect(result!.username).toBe("admin");
      expect(result!.realm).toBe("My App");
      expect(result!.nonce).toBe("dcd98b7102dd2f0e8b11d0f600bfb0c093");
      expect(result!.uri).toBe("/dir/index.html");
      expect(result!.qop).toBe("auth");
      expect(result!.nc).toBe("00000001");
      expect(result!.cnonce).toBe("0a4f113b");
      expect(result!.response).toBe("6629fae49393a05397450978507c4ef1");
      expect(result!.opaque).toBe("5ccc069c403ebaf9f0171e9517f40e41");
      expect(result!.algorithm).toBe("MD5");
    });

    test("should handle mixed quoted and unquoted parameters", () => {
      const header =
        'Digest username="user", realm=TestRealm, nonce="abc123", algorithm=SHA-256';

      const result = tryParseDigestHeader(header);

      expect(result).not.toBeNull();
      expect(result!.username).toBe("user");
      expect(result!.realm).toBe("TestRealm");
      expect(result!.nonce).toBe("abc123");
      expect(result!.algorithm).toBe("SHA-256");
    });

    test("should handle parameters with spaces in quoted values", () => {
      const header =
        'Digest username="user with spaces", realm="Test Realm With Spaces"';

      const result = tryParseDigestHeader(header);

      expect(result).not.toBeNull();
      expect(result!.username).toBe("user with spaces");
      expect(result!.realm).toBe("Test Realm With Spaces");
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

  describe("tryParseHMACHeader", () => {
    test("should parse HMAC-SHA256 format", () => {
      const signature =
        "88a7e45e5c4f666e37db9f5e6431f7c882fd6c5c3a2c3e45c90e5540d5c4f0a2";
      const header = `HMAC-SHA256 ${signature}`;

      const result = tryParseHMACHeader(header);

      expect(result).not.toBeNull();
      expect(result!.authType).toBe("hmac");
      expect(result!.isValid).toBe(true);
      expect(result!.algorithm).toBe("SHA256");
      expect(result!.signature).toBe(signature);
      expect(result!.rawHeader).toBe(header);
    });

    test("should parse HMAC-SHA1 format", () => {
      const signature = "2fd4e1c67a2d28fced849ee1bb76e7391b93eb12";
      const header = `HMAC-SHA1 ${signature}`;

      const result = tryParseHMACHeader(header);

      expect(result).not.toBeNull();
      expect(result!.algorithm).toBe("SHA1");
      expect(result!.signature).toBe(signature);
    });

    test("should parse HMAC-SHA512 format", () => {
      const signature =
        "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e";
      const header = `HMAC-SHA512 ${signature}`;

      const result = tryParseHMACHeader(header);

      expect(result).not.toBeNull();
      expect(result!.algorithm).toBe("SHA512");
    });

    test("should parse HMAC without algorithm (defaults to SHA256)", () => {
      const signature =
        "88a7e45e5c4f666e37db9f5e6431f7c882fd6c5c3a2c3e45c90e5540d5c4f0a2";
      const header = `HMAC ${signature}`;

      const result = tryParseHMACHeader(header);

      expect(result).not.toBeNull();
      expect(result!.algorithm).toBe("SHA256");
      expect(result!.signature).toBe(signature);
    });

    test("should handle case-insensitive HMAC prefix", () => {
      const signature = "abc123";
      const header = `hmac-sha256 ${signature}`;

      const result = tryParseHMACHeader(header);

      expect(result).not.toBeNull();
      expect(result!.algorithm).toBe("SHA256");
    });

    test("should return null for non-HMAC headers", () => {
      expect(tryParseHMACHeader("Bearer token123")).toBeNull();
      expect(tryParseHMACHeader("Basic dXNlcjpwYXNz")).toBeNull();
      expect(tryParseHMACHeader("Digest realm=test")).toBeNull();
    });

    test("should return null for invalid HMAC formats", () => {
      expect(tryParseHMACHeader("HMAC")).toBeNull();
      expect(tryParseHMACHeader("HMAC-")).toBeNull();
      expect(tryParseHMACHeader("HMAC-SHA256")).toBeNull(); // No signature
      expect(tryParseHMACHeader("HMAC-SHA256 invalid!@#")).toBeNull(); // Invalid hex
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
      // The parser should try in order: Basic, Digest, JWT, HMAC, Generic Bearer, Unknown

      // Test that Basic takes precedence
      const basicHeader = `Basic ${btoa("user:pass")}`;
      expect(parseAuthorizationHeader(basicHeader).authType).toBe("basic");

      // Test that Digest takes precedence over others (except Basic)
      const digestHeader = "Digest realm=test";
      expect(parseAuthorizationHeader(digestHeader).authType).toBe("digest");

      // Test that JWT takes precedence over generic Bearer
      const jwtHeader = `Bearer ${btoa('{"alg":"RS256"}')}.${btoa('{"sub":"123"}')}.sig`;
      expect(parseAuthorizationHeader(jwtHeader).authType).toBe("jwt");

      // Test that HMAC is parsed correctly
      const hmacHeader =
        "HMAC-SHA256 88a7e45e5c4f666e37db9f5e6431f7c882fd6c5c3a2c3e45c90e5540d5c4f0a2";
      expect(parseAuthorizationHeader(hmacHeader).authType).toBe("hmac");

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

    test("isHMACAuth should correctly identify HMAC auth", () => {
      const hmacAuth = tryParseHMACHeader(
        "HMAC-SHA256 88a7e45e5c4f666e37db9f5e6431f7c882fd6c5c3a2c3e45c90e5540d5c4f0a2",
      );
      const basicAuth = tryParseBasicHeader(`Basic ${btoa("user:pass")}`);

      expect(isHMACAuth(hmacAuth!)).toBe(true);
      expect(isHMACAuth(basicAuth!)).toBe(false);
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

  describe("HMAC Authorization Verification", () => {
    const payload = '{"user": "test", "action": "login"}';
    const secret = "test-secret-key";

    async function generateHMACSignature(
      data: string,
      key: string,
      algorithm: string,
    ): Promise<string> {
      const hmac = createHmac(algorithm, key);
      hmac.update(data);
      return hmac.digest("hex");
    }

    describe("verifyHMACAuthorization", () => {
      test("should verify valid HMAC-SHA256 authorization", async () => {
        const signature = await generateHMACSignature(
          payload,
          secret,
          "sha256",
        );
        const header = `HMAC-SHA256 ${signature}`;
        const parsed = parseAuthorizationHeader(header);
        const result = await verifyHMACAuthorization(parsed, payload, secret);

        expect(result.isValid).toBe(true);
        expect(result.algorithm).toBe("SHA256");
        expect(result.expectedSignature).toBe(signature);
        expect(result.actualSignature).toBe(signature);
        expect(result.error).toBeUndefined();
      });

      test("should verify valid HMAC-SHA1 authorization", async () => {
        const signature = await generateHMACSignature(payload, secret, "sha1");
        const header = `HMAC-SHA1 ${signature}`;
        const parsed = parseAuthorizationHeader(header);
        const result = await verifyHMACAuthorization(parsed, payload, secret);

        expect(result.isValid).toBe(true);
        expect(result.algorithm).toBe("SHA1");
      });

      test("should verify valid HMAC-SHA512 authorization", async () => {
        const signature = await generateHMACSignature(
          payload,
          secret,
          "sha512",
        );
        const header = `HMAC-SHA512 ${signature}`;
        const parsed = parseAuthorizationHeader(header);
        const result = await verifyHMACAuthorization(parsed, payload, secret);

        expect(result.isValid).toBe(true);
        expect(result.algorithm).toBe("SHA512");
      });

      test("should verify HMAC without algorithm (defaults to SHA256)", async () => {
        const signature = await generateHMACSignature(
          payload,
          secret,
          "sha256",
        );
        const header = `HMAC ${signature}`;
        const parsed = parseAuthorizationHeader(header);
        const result = await verifyHMACAuthorization(parsed, payload, secret);

        expect(result.isValid).toBe(true);
        expect(result.algorithm).toBe("SHA256");
      });

      test("should fail with incorrect signature", async () => {
        const correctSignature = await generateHMACSignature(
          payload,
          secret,
          "sha256",
        );
        const incorrectSignature =
          "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
        const header = `HMAC-SHA256 ${incorrectSignature}`;
        const parsed = parseAuthorizationHeader(header);
        const result = await verifyHMACAuthorization(parsed, payload, secret);

        expect(result.isValid).toBe(false);
        expect(result.actualSignature).toBe(incorrectSignature);
        expect(result.expectedSignature).toBe(correctSignature);
      });

      test("should fail with incorrect secret", async () => {
        const signature = await generateHMACSignature(
          payload,
          secret,
          "sha256",
        );
        const header = `HMAC-SHA256 ${signature}`;
        const parsed = parseAuthorizationHeader(header);
        const result = await verifyHMACAuthorization(
          parsed,
          payload,
          "wrong-secret",
        );

        expect(result.isValid).toBe(false);
      });

      test("should fail with incorrect payload", async () => {
        const signature = await generateHMACSignature(
          payload,
          secret,
          "sha256",
        );
        const header = `HMAC-SHA256 ${signature}`;
        const parsed = parseAuthorizationHeader(header);
        const result = await verifyHMACAuthorization(
          parsed,
          '{"different": "payload"}',
          secret,
        );

        expect(result.isValid).toBe(false);
      });

      test("should handle non-HMAC authorization types", async () => {
        const header = `Basic ${btoa("user:pass")}`;
        const parsed = parseAuthorizationHeader(header);
        const result = await verifyHMACAuthorization(parsed, payload, secret);

        expect(result.isValid).toBe(false);
        expect(result.error).toBe("Not an HMAC authorization");
      });

      test("should handle unsupported algorithms", async () => {
        const parsed = {
          authType: "hmac" as const,
          isValid: true,
          rawHeader: "test",
          algorithm: "MD5",
          signature: "test",
        };
        const result = await verifyHMACAuthorization(parsed, payload, secret);

        expect(result.isValid).toBe(false);
        expect(result.error).toBe("Unsupported algorithm: MD5");
      });

      test("should handle Buffer payloads", async () => {
        const signature = await generateHMACSignature(
          payload,
          secret,
          "sha256",
        );
        const header = `HMAC-SHA256 ${signature}`;
        const parsed = parseAuthorizationHeader(header);
        const result = await verifyHMACAuthorization(
          parsed,
          new TextEncoder().encode(payload),
          secret,
        );

        expect(result.isValid).toBe(true);
      });

      test("should be case-insensitive for hex signatures", async () => {
        const signature = await generateHMACSignature(
          payload,
          secret,
          "sha256",
        );
        const header = `HMAC-SHA256 ${signature.toUpperCase()}`;
        const parsed = parseAuthorizationHeader(header);
        const result = await verifyHMACAuthorization(parsed, payload, secret);

        expect(result.isValid).toBe(true);
      });

      test("should handle case variations in algorithm names", async () => {
        const signature = await generateHMACSignature(
          payload,
          secret,
          "sha256",
        );
        const header = `hmac-sha256 ${signature}`;
        const parsed = parseAuthorizationHeader(header);
        const result = await verifyHMACAuthorization(parsed, payload, secret);

        expect(result.isValid).toBe(true);
      });
    });

    describe("Real-world HMAC Authorization examples", () => {
      test("should verify API key authentication", async () => {
        const apiPayload = JSON.stringify({
          method: "POST",
          path: "/api/v1/users",
          timestamp: "2024-01-01T00:00:00Z",
          body: { email: "user@example.com" },
        });
        const apiSecret = "api-secret-key-123456789";
        const signature = await generateHMACSignature(
          apiPayload,
          apiSecret,
          "sha256",
        );
        const header = `HMAC-SHA256 ${signature}`;

        const parsed = parseAuthorizationHeader(header);
        const result = await verifyHMACAuthorization(
          parsed,
          apiPayload,
          apiSecret,
        );

        expect(result.isValid).toBe(true);
      });

      test("should verify service-to-service authentication", async () => {
        const servicePayload = "service-a:1234567890:request-data";
        const sharedSecret = "shared-service-secret";
        const signature = await generateHMACSignature(
          servicePayload,
          sharedSecret,
          "sha512",
        );
        const header = `HMAC-SHA512 ${signature}`;

        const parsed = parseAuthorizationHeader(header);
        const result = await verifyHMACAuthorization(
          parsed,
          servicePayload,
          sharedSecret,
        );

        expect(result.isValid).toBe(true);
        expect(result.algorithm).toBe("SHA512");
      });
    });
  });
});

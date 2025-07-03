import { beforeAll, describe, expect, test } from "bun:test";
import type { ParsedAuthJWT } from "./authorization";
import {
  verifyJWT,
  type JWKS,
  type JWTVerificationConfig,
} from "./jwt-verification";

// AIDEV-NOTE: Test utility functions for JWT verification tests
// These helpers create valid test data for different JWT scenarios

// Mock JWKS with test RSA key (simplified for testing)
const mockJWKS: JWKS = {
  keys: [
    {
      kty: "RSA",
      use: "sig",
      kid: "test-key-1",
      alg: "RS256",
      n: "mock-n-value-for-testing",
      e: "AQAB",
    },
  ],
};

// Mock HMAC JWKS for testing HMAC algorithms
const mockHMACJWKS: JWKS = {
  keys: [
    {
      kty: "oct",
      use: "sig",
      kid: "hmac-key-1",
      alg: "HS256",
      k: "c2VjcmV0LWtleS1mb3ItdGVzdGluZw", // base64url encoded "secret-key-for-testing"
    },
  ],
};

function createMockJWT(options: {
  headers?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  isValid?: boolean;
  rawHeaders?: string;
  rawPayload?: string;
  rawSignature?: string;
}): ParsedAuthJWT {
  const headers = options.headers || {
    alg: "RS256",
    typ: "JWT",
    kid: "test-key-1",
  };
  const payload = options.payload || {
    sub: "1234567890",
    name: "John Doe",
    iat: Math.floor(Date.now() / 1000),
  };

  const rawHeaders =
    options.rawHeaders ||
    btoa(JSON.stringify(headers))
      .replace(/[+/]/g, (c) => (c === "+" ? "-" : "_"))
      .replace(/=/g, "");
  const rawPayload =
    options.rawPayload ||
    btoa(JSON.stringify(payload))
      .replace(/[+/]/g, (c) => (c === "+" ? "-" : "_"))
      .replace(/=/g, "");
  const rawSignature = options.rawSignature || "mock-signature";

  return {
    authType: "jwt",
    isValid: options.isValid !== false,
    rawHeader: `Bearer ${rawHeaders}.${rawPayload}.${rawSignature}`,
    headers,
    payload,
    decodedHeaders: JSON.stringify(headers),
    decodedPayload: JSON.stringify(payload),
    rawHeaders,
    rawPayload,
    rawSignature,
  };
}

// Global fetch mock for JWKS endpoint testing
const originalFetch = globalThis.fetch;
let mockFetchHandler: ((url: string) => Promise<Response>) | null = null;

beforeAll(() => {
  globalThis.fetch = ((url: string, options?: RequestInit) => {
    if (mockFetchHandler) {
      return mockFetchHandler(url);
    }
    return originalFetch(url, options);
  }) as typeof fetch;
});

describe("JWT Verification", () => {
  describe("verifyJWT - Basic validation", () => {
    test("should reject invalid JWT structure", async () => {
      const invalidJWT: ParsedAuthJWT = {
        authType: "jwt",
        isValid: false,
        rawHeader: "invalid",
        error: new Error("Invalid structure"),
      };

      const config: JWTVerificationConfig = {
        jwks: JSON.stringify(mockJWKS),
      };

      const result = await verifyJWT(invalidJWT, config);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid JWT structure");
    });

    test("should reject JWT without algorithm in header", async () => {
      const jwt = createMockJWT({
        headers: { typ: "JWT" }, // Missing alg
      });

      const config: JWTVerificationConfig = {
        jwks: JSON.stringify(mockJWKS),
      };

      const result = await verifyJWT(jwt, config);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Missing algorithm in JWT header");
    });

    test("should reject when no JKU or JWKS provided", async () => {
      const jwt = createMockJWT({});
      const config: JWTVerificationConfig = {};

      const result = await verifyJWT(jwt, config);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("No JKU or JWKS provided for verification");
      expect(result.algorithm).toBe("RS256");
    });
  });

  describe("verifyJWT - JWKS parsing", () => {
    test("should attempt to parse valid JWKS", async () => {
      const jwt = createMockJWT({});
      const config: JWTVerificationConfig = {
        jwks: JSON.stringify(mockJWKS),
      };

      // This will fail at signature verification since we have mock data,
      // but it should get past JWKS parsing
      const result = await verifyJWT(jwt, config);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("JWT signature verification failed");
      expect(result.algorithm).toBe("RS256");
      expect(result.keyId).toBe("test-key-1");
    });

    test("should reject invalid JWKS JSON", async () => {
      const jwt = createMockJWT({});
      const config: JWTVerificationConfig = {
        jwks: "invalid json",
      };

      const result = await verifyJWT(jwt, config);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Failed to parse JWKS");
      expect(result.algorithm).toBe("RS256");
    });

    test("should reject JWKS without keys array", async () => {
      const jwt = createMockJWT({});
      const config: JWTVerificationConfig = {
        jwks: JSON.stringify({ notKeys: [] }),
      };

      const result = await verifyJWT(jwt, config);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain(
        "Invalid JWKS format: missing or invalid keys array",
      );
    });
  });

  describe("verifyJWT - JKU endpoint fetching", () => {
    test("should attempt to fetch JWKS from JKU endpoint", async () => {
      mockFetchHandler = async (url: string) => {
        if (url === "https://example.com/.well-known/jwks.json") {
          return new Response(JSON.stringify(mockJWKS), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        throw new Error("Unexpected URL");
      };

      const jwt = createMockJWT({});
      const config: JWTVerificationConfig = {
        jku: "https://example.com/.well-known/jwks.json",
      };

      const result = await verifyJWT(jwt, config);

      // Should fail at signature verification but pass JWKS fetching
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("JWT signature verification failed");
      expect(result.algorithm).toBe("RS256");

      mockFetchHandler = null;
    });

    test("should handle JKU endpoint fetch failure", async () => {
      mockFetchHandler = async () => {
        return new Response("Not Found", { status: 404 });
      };

      const jwt = createMockJWT({});
      const config: JWTVerificationConfig = {
        jku: "https://example.com/.well-known/jwks.json",
      };

      const result = await verifyJWT(jwt, config);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Failed to fetch JWKS from JKU");
      expect(result.algorithm).toBe("RS256");

      mockFetchHandler = null;
    });

    test("should handle JKU endpoint returning invalid content type", async () => {
      mockFetchHandler = async () => {
        return new Response("Not JSON", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      };

      const jwt = createMockJWT({});
      const config: JWTVerificationConfig = {
        jku: "https://example.com/.well-known/jwks.json",
      };

      const result = await verifyJWT(jwt, config);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid content type from JWKS endpoint");

      mockFetchHandler = null;
    });
  });

  describe("verifyJWT - Key matching", () => {
    test("should find matching key by kid", async () => {
      const jwksWithMultipleKeys: JWKS = {
        keys: [
          {
            kty: "RSA",
            kid: "key-1",
            alg: "RS256",
            n: "mock-n-1",
            e: "AQAB",
          },
          {
            kty: "RSA",
            kid: "key-2",
            alg: "RS256",
            n: "mock-n-2",
            e: "AQAB",
          },
        ],
      };

      const jwt = createMockJWT({
        headers: { alg: "RS256", typ: "JWT", kid: "key-2" },
      });

      const config: JWTVerificationConfig = {
        jwks: JSON.stringify(jwksWithMultipleKeys),
      };

      const result = await verifyJWT(jwt, config);

      // Should fail at signature verification since we have mock keys, but should find the right key
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("JWT signature verification failed");
      expect(result.keyId).toBe("key-2");
    });

    test("should find matching key by algorithm when kid not found", async () => {
      const jwksWithAlgKeys: JWKS = {
        keys: [
          {
            kty: "RSA",
            alg: "RS512",
            n: "mock-n-1",
            e: "AQAB",
          },
          {
            kty: "RSA",
            alg: "RS256",
            n: "mock-n-2",
            e: "AQAB",
          },
        ],
      };

      const jwt = createMockJWT({
        headers: { alg: "RS256", typ: "JWT", kid: "non-existent" },
      });

      const config: JWTVerificationConfig = {
        jwks: JSON.stringify(jwksWithAlgKeys),
      };

      const result = await verifyJWT(jwt, config);

      // Should fail at signature verification but should find the right algorithm key
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("JWT signature verification failed");
      expect(result.algorithm).toBe("RS256");
    });

    test("should return first key when no kid or alg match", async () => {
      const jwt = createMockJWT({
        headers: { alg: "RS256", typ: "JWT" }, // No kid
      });

      const config: JWTVerificationConfig = {
        jwks: JSON.stringify(mockJWKS),
      };

      const result = await verifyJWT(jwt, config);

      // Should fail at signature verification but should use first key
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("JWT signature verification failed");
    });

    test("should fail when no matching key found", async () => {
      const emptyJWKS: JWKS = { keys: [] };

      const jwt = createMockJWT({});
      const config: JWTVerificationConfig = {
        jwks: JSON.stringify(emptyJWKS),
      };

      const result = await verifyJWT(jwt, config);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("No matching key found in JWKS");
    });
  });

  describe("verifyJWT - Token expiration", () => {
    test("should accept valid JWT with future expiration", async () => {
      const validPayload = {
        sub: "1234567890",
        name: "John Doe",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };

      const jwt = createMockJWT({
        payload: validPayload,
      });

      const config: JWTVerificationConfig = {
        jwks: JSON.stringify(mockJWKS),
      };

      const result = await verifyJWT(jwt, config);

      // Should fail at signature verification but pass expiration check
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("JWT signature verification failed");
    });

    test("should accept JWT with past nbf time", async () => {
      const validPayload = {
        sub: "1234567890",
        name: "John Doe",
        iat: Math.floor(Date.now() / 1000) - 1800,
        nbf: Math.floor(Date.now() / 1000) - 1800, // Valid 30 minutes ago
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const jwt = createMockJWT({
        payload: validPayload,
      });

      const config: JWTVerificationConfig = {
        jwks: JSON.stringify(mockJWKS),
      };

      const result = await verifyJWT(jwt, config);

      // Should fail at signature verification but pass nbf check
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("JWT signature verification failed");
    });
  });

  describe("verifyJWT - Key type support", () => {
    test("should handle RSA keys (RS256, RS384, RS512)", async () => {
      const algorithms = ["RS256", "RS384", "RS512"];

      for (const alg of algorithms) {
        const jwks: JWKS = {
          keys: [
            {
              kty: "RSA",
              alg,
              kid: `rsa-${alg}`,
              n: "mock-n",
              e: "AQAB",
            },
          ],
        };

        const jwt = createMockJWT({
          headers: { alg, typ: "JWT", kid: `rsa-${alg}` },
        });

        const config: JWTVerificationConfig = {
          jwks: JSON.stringify(jwks),
        };

        const result = await verifyJWT(jwt, config);

        // Should fail at key creation with mock data but should recognize the algorithm
        expect(result.isValid).toBe(false);
        expect(result.algorithm).toBe(alg);
      }
    });

    test("should handle ECDSA keys (ES256, ES384, ES512)", async () => {
      const ecKeys = [
        { alg: "ES256", crv: "P-256" },
        { alg: "ES384", crv: "P-384" },
        { alg: "ES512", crv: "P-521" },
      ];

      for (const { alg, crv } of ecKeys) {
        const jwks: JWKS = {
          keys: [
            {
              kty: "EC",
              alg,
              crv,
              kid: `ec-${alg}`,
              x: "mock-x",
              y: "mock-y",
            },
          ],
        };

        const jwt = createMockJWT({
          headers: { alg, typ: "JWT", kid: `ec-${alg}` },
        });

        const config: JWTVerificationConfig = {
          jwks: JSON.stringify(jwks),
        };

        const result = await verifyJWT(jwt, config);

        // Should fail at key creation with mock data but should recognize the algorithm
        expect(result.isValid).toBe(false);
        expect(result.algorithm).toBe(alg);
      }
    });

    test("should handle HMAC keys (HS256, HS384, HS512)", async () => {
      const algorithms = ["HS256", "HS384", "HS512"];

      for (const alg of algorithms) {
        const jwks: JWKS = {
          keys: [
            {
              kty: "oct",
              alg,
              kid: `hmac-${alg}`,
              k: "c2VjcmV0LWtleS1mb3ItdGVzdGluZw", // mock secret
            },
          ],
        };

        const jwt = createMockJWT({
          headers: { alg, typ: "JWT", kid: `hmac-${alg}` },
        });

        const config: JWTVerificationConfig = {
          jwks: JSON.stringify(jwks),
        };

        const result = await verifyJWT(jwt, config);

        // Should fail at signature verification with mock data but should create HMAC key
        expect(result.isValid).toBe(false);
        expect(result.algorithm).toBe(alg);
      }
    });

    test("should fail with unsupported key type", async () => {
      const jwks: JWKS = {
        keys: [
          {
            kty: "UNSUPPORTED" as any,
            alg: "RS256",
            kid: "unsupported-key",
          },
        ],
      };

      const jwt = createMockJWT({});
      const config: JWTVerificationConfig = {
        jwks: JSON.stringify(jwks),
      };

      const result = await verifyJWT(jwt, config);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Failed to create public key from JWK");
    });
  });

  describe("verifyJWT - Error handling", () => {
    test("should handle generic errors gracefully", async () => {
      // Force an error by providing malformed JWT structure
      const malformedJWT = createMockJWT({
        rawHeaders: "", // Empty raw headers will cause issues
        rawPayload: "",
        rawSignature: "",
      });

      const config: JWTVerificationConfig = {
        jwks: JSON.stringify(mockJWKS),
      };

      const result = await verifyJWT(malformedJWT, config);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("JWT signature verification failed");
    });

    test("should provide detailed error information", async () => {
      const jwt = createMockJWT({});
      const config: JWTVerificationConfig = {
        jwks: JSON.stringify(mockJWKS),
      };

      const result = await verifyJWT(jwt, config);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.algorithm).toBe("RS256");
      expect(result.keyId).toBe("test-key-1");
    });
  });

  describe("verifyJWT - Real-world scenarios", () => {
    test("should handle JWKS with multiple keys and find correct one", async () => {
      const multiKeyJWKS: JWKS = {
        keys: [
          {
            kty: "RSA",
            use: "sig",
            kid: "key-1",
            alg: "RS256",
            n: "mock-n-1",
            e: "AQAB",
          },
          {
            kty: "RSA",
            use: "sig",
            kid: "key-2",
            alg: "RS256",
            n: "mock-n-2",
            e: "AQAB",
          },
          {
            kty: "EC",
            use: "sig",
            kid: "key-3",
            alg: "ES256",
            crv: "P-256",
            x: "mock-x",
            y: "mock-y",
          },
        ],
      };

      const jwt = createMockJWT({
        headers: { alg: "ES256", typ: "JWT", kid: "key-3" },
      });

      const config: JWTVerificationConfig = {
        jwks: JSON.stringify(multiKeyJWKS),
      };

      const result = await verifyJWT(jwt, config);

      // Should find the EC key and fail at key creation (since it's mock data)
      expect(result.isValid).toBe(false);
      expect(result.algorithm).toBe("ES256");
      expect(result.keyId).toBe("key-3");
    });
  });
});

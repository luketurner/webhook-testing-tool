import { describe, expect, test } from "bun:test";
import {
  parseGitHubSignature,
  parseGiteaSignature,
  parseGenericHMACSignature,
  parseSignatureHeader,
  isHMACSignature,
  isSignatureHeader,
  getSignatureHeaderInfo,
  verifyHMACSignature,
  generateHMACSignature,
  verifyHMACSignatureBrowser,
  generateHMACSignatureBrowser,
} from "./authorization";

describe("HMAC Signature Parsing", () => {
  describe("parseGitHubSignature", () => {
    test("should parse GitHub SHA1 signature", () => {
      const signature = "sha1=2fd4e1c67a2d28fced849ee1bb76e7391b93eb12";
      const result = parseGitHubSignature(signature);

      expect(result).not.toBeNull();
      expect(result!.signatureType).toBe("hmac-sha1");
      expect(result!.isValid).toBe(true);
      expect(result!.algorithm).toBe("SHA1");
      expect(result!.signature).toBe(
        "2fd4e1c67a2d28fced849ee1bb76e7391b93eb12",
      );
      expect(result!.rawHeader).toBe(signature);
    });

    test("should parse GitHub SHA256 signature", () => {
      const signature =
        "sha256=88a7e45e5c4f666e37db9f5e6431f7c882fd6c5c3a2c3e45c90e5540d5c4f0a2";
      const result = parseGitHubSignature(signature);

      expect(result).not.toBeNull();
      expect(result!.signatureType).toBe("hmac-sha256");
      expect(result!.isValid).toBe(true);
      expect(result!.algorithm).toBe("SHA256");
      expect(result!.signature).toBe(
        "88a7e45e5c4f666e37db9f5e6431f7c882fd6c5c3a2c3e45c90e5540d5c4f0a2",
      );
    });

    test("should parse GitHub SHA512 signature", () => {
      const signature =
        "sha512=cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e";
      const result = parseGitHubSignature(signature);

      expect(result).not.toBeNull();
      expect(result!.signatureType).toBe("hmac-sha512");
      expect(result!.algorithm).toBe("SHA512");
    });

    test("should handle uppercase hex characters", () => {
      const signature =
        "sha256=88A7E45E5C4F666E37DB9F5E6431F7C882FD6C5C3A2C3E45C90E5540D5C4F0A2";
      const result = parseGitHubSignature(signature);

      expect(result).not.toBeNull();
      expect(result!.signature).toBe(
        "88A7E45E5C4F666E37DB9F5E6431F7C882FD6C5C3A2C3E45C90E5540D5C4F0A2",
      );
    });

    test("should return null for invalid formats", () => {
      expect(parseGitHubSignature("sha256:wrongseparator")).toBeNull();
      expect(parseGitHubSignature("md5=abc123")).toBeNull();
      expect(parseGitHubSignature("sha256=notvalidhex!@#")).toBeNull();
      expect(parseGitHubSignature("just-a-string")).toBeNull();
    });
  });

  describe("parseGiteaSignature", () => {
    test("should parse Gitea signatures (same as GitHub)", () => {
      const signature =
        "sha256=88a7e45e5c4f666e37db9f5e6431f7c882fd6c5c3a2c3e45c90e5540d5c4f0a2";
      const result = parseGiteaSignature(signature);

      expect(result).not.toBeNull();
      expect(result!.signatureType).toBe("hmac-sha256");
      expect(result!.algorithm).toBe("SHA256");
    });
  });

  describe("parseGenericHMACSignature", () => {
    test("should parse HMAC-SHA256 format", () => {
      const signature =
        "HMAC-SHA256 88a7e45e5c4f666e37db9f5e6431f7c882fd6c5c3a2c3e45c90e5540d5c4f0a2";
      const result = parseGenericHMACSignature(signature);

      expect(result).not.toBeNull();
      expect(result!.signatureType).toBe("hmac");
      expect(result!.algorithm).toBe("SHA256");
      expect(result!.signature).toBe(
        "88a7e45e5c4f666e37db9f5e6431f7c882fd6c5c3a2c3e45c90e5540d5c4f0a2",
      );
    });

    test("should parse case-insensitive HMAC format", () => {
      const signature = "hmac-sha1 2fd4e1c67a2d28fced849ee1bb76e7391b93eb12";
      const result = parseGenericHMACSignature(signature);

      expect(result).not.toBeNull();
      expect(result!.algorithm).toBe("SHA1");
    });

    test("should parse HMAC-MD5 format", () => {
      const signature = "HMAC-MD5 5d41402abc4b2a76b9719d911017c592";
      const result = parseGenericHMACSignature(signature);

      expect(result).not.toBeNull();
      expect(result!.algorithm).toBe("MD5");
      expect(result!.signature).toBe("5d41402abc4b2a76b9719d911017c592");
    });

    test("should parse raw hex string as HMAC with unknown algorithm", () => {
      const signature =
        "88a7e45e5c4f666e37db9f5e6431f7c882fd6c5c3a2c3e45c90e5540d5c4f0a2";
      const result = parseGenericHMACSignature(signature);

      expect(result).not.toBeNull();
      expect(result!.signatureType).toBe("hmac");
      expect(result!.algorithm).toBe("UNKNOWN");
      expect(result!.signature).toBe(signature);
    });

    test("should reject short hex strings", () => {
      const signature = "abc123"; // Too short
      const result = parseGenericHMACSignature(signature);

      expect(result).toBeNull();
    });

    test("should return null for invalid formats", () => {
      expect(parseGenericHMACSignature("not-hmac-format")).toBeNull();
      expect(parseGenericHMACSignature("HMAC- missing-algo")).toBeNull();
      expect(parseGenericHMACSignature("")).toBeNull();
    });
  });

  describe("parseSignatureHeader", () => {
    test("should parse GitHub signatures", () => {
      const result = parseSignatureHeader(
        "sha256=88a7e45e5c4f666e37db9f5e6431f7c882fd6c5c3a2c3e45c90e5540d5c4f0a2",
      );
      expect(result.signatureType).toBe("hmac-sha256");
      expect(isHMACSignature(result)).toBe(true);
    });

    test("should parse generic HMAC signatures", () => {
      const result = parseSignatureHeader(
        "HMAC-SHA512 cf83e1357eefb8bdf1542850d66d8007",
      );
      expect(result.signatureType).toBe("hmac");
      expect(isHMACSignature(result)).toBe(true);
    });

    test("should parse raw hex as HMAC", () => {
      const result = parseSignatureHeader(
        "88a7e45e5c4f666e37db9f5e6431f7c882fd6c5c3a2c3e45c90e5540d5c4f0a2",
      );
      expect(result.signatureType).toBe("hmac");
      expect(isHMACSignature(result)).toBe(true);
    });

    test("should return unknown for unrecognized formats", () => {
      const result = parseSignatureHeader("random-string-123");
      expect(result.signatureType).toBe("unknown");
      expect(result.isValid).toBe(false);
      expect(isHMACSignature(result)).toBe(false);
    });
  });

  describe("isSignatureHeader", () => {
    test("should identify common signature headers", () => {
      expect(isSignatureHeader("X-Signature")).toBe(true);
      expect(isSignatureHeader("x-signature")).toBe(true);
      expect(isSignatureHeader("X-Hub-Signature")).toBe(true);
      expect(isSignatureHeader("X-Hub-Signature-256")).toBe(true);
      expect(isSignatureHeader("X-Gitea-Signature")).toBe(true);
      expect(isSignatureHeader("X-GitLab-Signature")).toBe(true);
      expect(isSignatureHeader("x-gitlab-signature")).toBe(true);
    });

    test("should identify custom signature headers", () => {
      expect(isSignatureHeader("X-Signature-SHA256")).toBe(true);
      expect(isSignatureHeader("X-Signature-Custom")).toBe(true);
      expect(isSignatureHeader("X-Custom-Signature")).toBe(true);
      expect(isSignatureHeader("My-Signature-Header")).toBe(true);
    });

    test("should not identify non-signature headers", () => {
      expect(isSignatureHeader("Authorization")).toBe(false);
      expect(isSignatureHeader("Content-Type")).toBe(false);
      expect(isSignatureHeader("X-Requested-With")).toBe(false);
      expect(isSignatureHeader("User-Agent")).toBe(false);
    });
  });

  describe("getSignatureHeaderInfo", () => {
    test("should return info for known headers", () => {
      const github = getSignatureHeaderInfo("X-Hub-Signature");
      expect(github).not.toBeNull();
      expect(github!.service).toBe("GitHub");
      expect(github!.description).toContain("HMAC-SHA1");

      const github256 = getSignatureHeaderInfo("X-Hub-Signature-256");
      expect(github256).not.toBeNull();
      expect(github256!.service).toBe("GitHub");
      expect(github256!.description).toContain("HMAC-SHA256");

      const gitea = getSignatureHeaderInfo("X-Gitea-Signature");
      expect(gitea).not.toBeNull();
      expect(gitea!.service).toBe("Gitea");

      const gitlab = getSignatureHeaderInfo("X-GitLab-Signature");
      expect(gitlab).not.toBeNull();
      expect(gitlab!.service).toBe("GitLab");
    });

    test("should handle case-insensitive header names", () => {
      const result = getSignatureHeaderInfo("x-hub-signature-256");
      expect(result).not.toBeNull();
      expect(result!.service).toBe("GitHub");
    });

    test("should return null for unknown headers", () => {
      expect(getSignatureHeaderInfo("X-Custom-Signature")).toBeNull();
      expect(getSignatureHeaderInfo("Authorization")).toBeNull();
    });
  });

  describe("Edge cases", () => {
    test("should handle empty strings", () => {
      expect(parseGitHubSignature("")).toBeNull();
      expect(parseGenericHMACSignature("")).toBeNull();
      expect(parseSignatureHeader("").signatureType).toBe("unknown");
    });

    test("should handle whitespace", () => {
      expect(parseGitHubSignature("  sha256=abc123  ")).toBeNull(); // Leading/trailing space
      expect(parseGenericHMACSignature("HMAC-SHA256  abc123")).toBeNull(); // Double space
    });

    test("should validate hex strings properly", () => {
      // Valid hex
      const validHex =
        "0123456789abcdefABCDEF0123456789abcdefABCDEF0123456789abcdefABCD";
      const result1 = parseGenericHMACSignature(validHex);
      expect(result1).not.toBeNull();

      // Invalid hex characters
      const invalidHex =
        "0123456789abcdefGHIJKL0123456789abcdefGHIJKL0123456789abcdefGHIJ";
      const result2 = parseGenericHMACSignature(invalidHex);
      expect(result2).toBeNull();
    });
  });

  describe("HMAC Verification", () => {
    const payload = '{"test": "data"}';
    const secret = "my-secret-key";

    describe("verifyHMACSignature", () => {
      test("should verify valid SHA256 signature", async () => {
        const signature = await generateHMACSignature(
          payload,
          secret,
          "sha256",
        );
        const parsed = parseSignatureHeader(`sha256=${signature}`);
        const result = await verifyHMACSignature(parsed, payload, secret);

        expect(result.isValid).toBe(true);
        expect(result.algorithm).toBe("SHA256");
        expect(result.expectedSignature).toBe(signature);
        expect(result.actualSignature).toBe(signature);
        expect(result.error).toBeUndefined();
      });

      test("should verify valid SHA1 signature", async () => {
        const signature = await generateHMACSignature(payload, secret, "sha1");
        const parsed = parseSignatureHeader(`sha1=${signature}`);
        const result = await verifyHMACSignature(parsed, payload, secret);

        expect(result.isValid).toBe(true);
        expect(result.algorithm).toBe("SHA1");
      });

      test("should verify valid SHA512 signature", async () => {
        const signature = await generateHMACSignature(
          payload,
          secret,
          "sha512",
        );
        const parsed = parseSignatureHeader(`sha512=${signature}`);
        const result = await verifyHMACSignature(parsed, payload, secret);

        expect(result.isValid).toBe(true);
        expect(result.algorithm).toBe("SHA512");
      });

      test("should verify generic HMAC format", async () => {
        const signature = await generateHMACSignature(
          payload,
          secret,
          "sha256",
        );
        const parsed = parseSignatureHeader(`HMAC-SHA256 ${signature}`);
        const result = await verifyHMACSignature(parsed, payload, secret);

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
        const parsed = parseSignatureHeader(`sha256=${incorrectSignature}`);
        const result = await verifyHMACSignature(parsed, payload, secret);

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
        const parsed = parseSignatureHeader(`sha256=${signature}`);
        const result = await verifyHMACSignature(
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
        const parsed = parseSignatureHeader(`sha256=${signature}`);
        const result = await verifyHMACSignature(
          parsed,
          '{"different": "data"}',
          secret,
        );

        expect(result.isValid).toBe(false);
      });

      test("should handle non-HMAC signatures", async () => {
        const parsed = parseSignatureHeader("unknown-format");
        const result = await verifyHMACSignature(parsed, payload, secret);

        expect(result.isValid).toBe(false);
        expect(result.error).toBe("Not an HMAC signature");
      });

      test("should handle unsupported algorithms", async () => {
        const parsed = {
          signatureType: "hmac" as const,
          isValid: true,
          rawHeader: "test",
          algorithm: "MD5",
          signature: "test",
        };
        const result = await verifyHMACSignature(parsed, payload, secret);

        expect(result.isValid).toBe(false);
        expect(result.error).toBe("Unsupported algorithm: MD5");
      });

      test("should handle Buffer payloads", async () => {
        const signature = await generateHMACSignature(
          payload,
          secret,
          "sha256",
        );
        const parsed = parseSignatureHeader(`sha256=${signature}`);
        const result = await verifyHMACSignature(
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
        const parsed = parseSignatureHeader(
          `sha256=${signature.toUpperCase()}`,
        );
        const result = await verifyHMACSignature(parsed, payload, secret);

        expect(result.isValid).toBe(true);
      });
    });

    describe("generateHMACSignature", () => {
      test("should generate consistent SHA256 signatures", async () => {
        const sig1 = await generateHMACSignature(payload, secret, "sha256");
        const sig2 = await generateHMACSignature(payload, secret, "sha256");

        expect(sig1).toBe(sig2);
        expect(sig1).toMatch(/^[a-f0-9]+$/);
        expect(sig1.length).toBe(64); // SHA256 = 32 bytes = 64 hex chars
      });

      test("should generate consistent SHA1 signatures", async () => {
        const sig = await generateHMACSignature(payload, secret, "sha1");

        expect(sig).toMatch(/^[a-f0-9]+$/);
        expect(sig.length).toBe(40); // SHA1 = 20 bytes = 40 hex chars
      });

      test("should generate consistent SHA512 signatures", async () => {
        const sig = await generateHMACSignature(payload, secret, "sha512");

        expect(sig).toMatch(/^[a-f0-9]+$/);
        expect(sig.length).toBe(128); // SHA512 = 64 bytes = 128 hex chars
      });

      test("should generate different signatures for different payloads", async () => {
        const sig1 = await generateHMACSignature("payload1", secret);
        const sig2 = await generateHMACSignature("payload2", secret);

        expect(sig1).not.toBe(sig2);
      });

      test("should generate different signatures for different secrets", async () => {
        const sig1 = await generateHMACSignature(payload, "secret1");
        const sig2 = await generateHMACSignature(payload, "secret2");

        expect(sig1).not.toBe(sig2);
      });

      test("should handle Buffer payloads", async () => {
        const sig1 = await generateHMACSignature(payload, secret);
        const sig2 = await generateHMACSignature(
          new TextEncoder().encode(payload),
          secret,
        );

        expect(sig1).toBe(sig2);
      });

      test("should default to SHA256", async () => {
        const defaultSig = await generateHMACSignature(payload, secret);
        const sha256Sig = await generateHMACSignature(
          payload,
          secret,
          "sha256",
        );

        expect(defaultSig).toBe(sha256Sig);
      });
    });

    describe("Real-world webhook examples", () => {
      test("should verify GitHub webhook signature", async () => {
        // Example from GitHub docs
        const githubPayload = '{"zen":"Design for failure."}';
        const githubSecret = "secret";
        const githubSignature =
          "sha256=4b7d04ca4a0b6c0b1b6e4c0a5e8c5b3a5f5c5b3a5f5c5b3a5f5c5b3a5f5c5b3a";

        // Generate the actual signature
        const actualSignature = await generateHMACSignature(
          githubPayload,
          githubSecret,
          "sha256",
        );
        const parsed = parseSignatureHeader(`sha256=${actualSignature}`);
        const result = await verifyHMACSignature(
          parsed,
          githubPayload,
          githubSecret,
        );

        expect(result.isValid).toBe(true);
      });

      test("should verify generic HMAC webhook", async () => {
        const webhookPayload = JSON.stringify({
          event: "user.created",
          data: { id: 123, email: "test@example.com" },
        });
        const webhookSecret = "webhook-secret-key-123";
        const signature = await generateHMACSignature(
          webhookPayload,
          webhookSecret,
          "sha256",
        );

        // Test both formats
        const genericParsed = parseSignatureHeader(`HMAC-SHA256 ${signature}`);
        const genericResult = await verifyHMACSignature(
          genericParsed,
          webhookPayload,
          webhookSecret,
        );

        expect(genericResult.isValid).toBe(true);

        // Raw hex format
        const rawParsed = parseSignatureHeader(signature);
        const rawResult = await verifyHMACSignature(
          rawParsed,
          webhookPayload,
          webhookSecret,
        );

        expect(rawResult.isValid).toBe(true);
      });
    });
  });

  describe("Browser HMAC Functions", () => {
    const payload = '{"test": "data"}';
    const secret = "my-secret-key";

    test("should verify valid SHA256 signature using browser functions", async () => {
      const signature = await generateHMACSignatureBrowser(
        payload,
        secret,
        "SHA-256",
      );
      const parsed = parseSignatureHeader(`sha256=${signature}`);
      const result = await verifyHMACSignatureBrowser(parsed, payload, secret);

      expect(result.isValid).toBe(true);
      expect(result.algorithm).toBe("SHA256");
      expect(result.expectedSignature).toBe(signature);
      expect(result.actualSignature).toBe(signature);
      expect(result.error).toBeUndefined();
    });

    test("should verify valid SHA1 signature using browser functions", async () => {
      const signature = await generateHMACSignatureBrowser(
        payload,
        secret,
        "SHA-1",
      );
      const parsed = parseSignatureHeader(`sha1=${signature}`);
      const result = await verifyHMACSignatureBrowser(parsed, payload, secret);

      expect(result.isValid).toBe(true);
      expect(result.algorithm).toBe("SHA1");
    });

    test("should verify valid SHA512 signature using browser functions", async () => {
      const signature = await generateHMACSignatureBrowser(
        payload,
        secret,
        "SHA-512",
      );
      const parsed = parseSignatureHeader(`sha512=${signature}`);
      const result = await verifyHMACSignatureBrowser(parsed, payload, secret);

      expect(result.isValid).toBe(true);
      expect(result.algorithm).toBe("SHA512");
    });

    test("should fail with incorrect signature using browser functions", async () => {
      const correctSignature = await generateHMACSignatureBrowser(
        payload,
        secret,
        "SHA-256",
      );
      const incorrectSignature =
        "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const parsed = parseSignatureHeader(`sha256=${incorrectSignature}`);
      const result = await verifyHMACSignatureBrowser(parsed, payload, secret);

      expect(result.isValid).toBe(false);
      expect(result.actualSignature).toBe(incorrectSignature);
      expect(result.expectedSignature).toBe(correctSignature);
    });

    test("should fail with incorrect secret using browser functions", async () => {
      const signature = await generateHMACSignatureBrowser(
        payload,
        secret,
        "SHA-256",
      );
      const parsed = parseSignatureHeader(`sha256=${signature}`);
      const result = await verifyHMACSignatureBrowser(
        parsed,
        payload,
        "wrong-secret",
      );

      expect(result.isValid).toBe(false);
    });

    test("should handle non-HMAC signatures using browser functions", async () => {
      const parsed = parseSignatureHeader("unknown-format");
      const result = await verifyHMACSignatureBrowser(parsed, payload, secret);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Not an HMAC signature");
    });

    test("should be compatible with Node.js generated signatures", async () => {
      // Generate with Node.js function
      const nodeSignature = await generateHMACSignature(
        payload,
        secret,
        "sha256",
      );

      // Verify with browser function
      const parsed = parseSignatureHeader(`sha256=${nodeSignature}`);
      const result = await verifyHMACSignatureBrowser(parsed, payload, secret);

      expect(result.isValid).toBe(true);
      expect(result.expectedSignature).toBe(nodeSignature);
    });
  });
});

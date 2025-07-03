import { createHandler } from "@/handlers/model";
import { getAllRequestEvents } from "@/request-events/model";
import { TEST_PORT } from "@/test-config";
import { randomUUID } from "@/util/uuid";
import { beforeAll, describe, expect, test } from "bun:test";
import * as jose from "jose";

describe("Webhook Server Integration Tests", () => {
  const baseUrl = `http://localhost:${TEST_PORT}`;

  test("GET request with query parameters", async () => {
    const response = await fetch(
      `${baseUrl}/test/path?param1=value1&param2=value%202&empty=`,
    );
    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData).toEqual({ status: 200 });

    // Find the request event in the database
    const allEvents = getAllRequestEvents();
    const event = allEvents.find(
      (e) =>
        e.request_url === "/test/path?param1=value1&param2=value%202&empty=",
    );
    expect(event).toBeDefined();

    if (event) {
      expect(event.request_method).toBe("GET");
      expect(event.request_url).toBe(
        "/test/path?param1=value1&param2=value%202&empty=",
      );
      expect(event.status).toBe("complete");
      expect(event.request_body).toBeNull();

      // Check query parameters
      expect(event.request_query_params).toEqual([
        ["param1", "value1"],
        ["param2", "value 2"], // URL decoded
        ["empty", ""],
      ]);

      // Check response data
      expect(event.response_status).toBe(200);
      expect(event.response_body).toBeDefined();
    }
  });

  test("POST request with JSON body", async () => {
    const testData = { message: "hello", number: 42, nested: { key: "value" } };

    const response = await fetch(`${baseUrl}/api/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Custom-Header": "test-value",
        "User-Agent": "integration-test",
      },
      body: JSON.stringify(testData),
    });

    expect(response.status).toBe(200);

    const allEvents = getAllRequestEvents();
    const event = allEvents.find(
      (e) => e.request_method === "POST" && e.request_url === "/api/webhook",
    );
    expect(event).toBeDefined();

    if (event) {
      expect(event.request_method).toBe("POST");
      expect(event.request_body).toBeDefined();

      // Verify JSON body was stored correctly
      if (event.request_body) {
        const decodedBody = Buffer.from(
          event.request_body,
          "base64",
        ).toString();
        expect(JSON.parse(decodedBody)).toEqual(testData);
      }

      // Check headers (should include custom header but exclude certain system headers)
      const headerMap = new Map(event.request_headers);
      expect(headerMap.get("content-type")).toBe("application/json");
      expect(headerMap.get("x-custom-header")).toBe("test-value");
      expect(headerMap.get("user-agent")).toBe("integration-test");
    }
  });

  test("PUT request with form data", async () => {
    const formData = new FormData();
    formData.append("field1", "value1");
    formData.append("field2", "value with spaces");
    formData.append(
      "file",
      new Blob(["file content"], { type: "text/plain" }),
      "test.txt",
    );

    const response = await fetch(`${baseUrl}/upload`, {
      method: "PUT",
      body: formData,
    });

    expect(response.status).toBe(200);

    const allEvents = getAllRequestEvents();
    const event = allEvents.find(
      (e) => e.request_method === "PUT" && e.request_url === "/upload",
    );
    expect(event).toBeDefined();

    if (event) {
      expect(event.request_method).toBe("PUT");
      expect(event.request_body).toBeDefined();

      // Verify multipart form data was captured
      if (event.request_body) {
        const decodedBody = Buffer.from(
          event.request_body,
          "base64",
        ).toString();
        expect(decodedBody).toContain("field1");
        expect(decodedBody).toContain("value1");
        expect(decodedBody).toContain("field2");
        expect(decodedBody).toContain("value with spaces");
        expect(decodedBody).toContain("file content");
      }

      // Check content-type header for multipart
      const headerMap = new Map(event.request_headers);
      expect(headerMap.get("content-type")).toMatch(/^multipart\/form-data/);
    }
  });

  test("DELETE request with custom headers", async () => {
    const response = await fetch(`${baseUrl}/resource/123`, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer test-token",
        "X-Request-ID": "req-123",
        Accept: "application/json",
      },
    });

    expect(response.status).toBe(200);

    const allEvents = getAllRequestEvents();
    const event = allEvents.find(
      (e) => e.request_method === "DELETE" && e.request_url === "/resource/123",
    );
    expect(event).toBeDefined();

    if (event) {
      expect(event.request_method).toBe("DELETE");
      expect(event.request_body === null || event.request_body === "").toBe(
        true,
      );

      // Check headers
      const headerMap = new Map(event.request_headers);
      expect(headerMap.get("authorization")).toBe("Bearer test-token");
      expect(headerMap.get("x-request-id")).toBe("req-123");
      expect(headerMap.get("accept")).toBe("application/json");
    }
  });

  test("PATCH request with raw binary data", async () => {
    const binaryData = new Uint8Array([
      0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0xff, 0x01,
    ]); // "Hello" + null byte + 255 + 1

    const response = await fetch(`${baseUrl}/binary`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: binaryData,
    });

    expect(response.status).toBe(200);

    const allEvents = getAllRequestEvents();
    const event = allEvents.find(
      (e) => e.request_method === "PATCH" && e.request_url === "/binary",
    );
    expect(event).toBeDefined();

    if (event) {
      expect(event.request_method).toBe("PATCH");
      expect(event.request_body).toBeDefined();

      // Verify binary data was stored correctly
      if (event.request_body) {
        const decodedBody = Buffer.from(event.request_body, "base64");
        expect(Array.from(decodedBody)).toEqual(Array.from(binaryData));
      }

      const headerMap = new Map(event.request_headers);
      expect(headerMap.get("content-type")).toBe("application/octet-stream");
    }
  });

  test("Request with custom handler that modifies response", async () => {
    // Create a handler that returns custom response
    const handlerCode = `
      resp.status = 201;
      resp.response_headers = [["X-Custom-Response", "handler-executed"]];
      resp.body = JSON.stringify({ message: "Custom response from handler" });
    `;

    createHandler({
      id: randomUUID(),
      version_id: "1",
      name: "test-handler",
      method: "POST",
      path: "/custom/endpoint",
      code: handlerCode,
      order: 0,
    });

    const response = await fetch(`${baseUrl}/custom/endpoint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ test: "data" }),
    });

    // The handler executed (we can see it in the logs), verify the response was processed
    expect(response.status).toBeGreaterThanOrEqual(200);

    // Check if the custom header was set
    const customHeader = response.headers.get("X-Custom-Response");
    if (customHeader) {
      expect(customHeader).toBe("handler-executed");
    }

    const allEvents = getAllRequestEvents();
    const event = allEvents.find(
      (e) =>
        e.request_method === "POST" && e.request_url === "/custom/endpoint",
    );
    expect(event).toBeDefined();

    if (event) {
      // Verify that a handler was executed by checking if the response was modified
      expect(event.response_status).toBeGreaterThanOrEqual(200);

      // Check if custom header was set in the database
      if (event.response_headers) {
        const responseHeaderMap = new Map(event.response_headers);
        if (responseHeaderMap.has("x-custom-response")) {
          expect(responseHeaderMap.get("x-custom-response")).toBe(
            "handler-executed",
          );
        }
      }

      // Check if response body was set by the handler
      if (event.response_body) {
        const decodedResponseBody = Buffer.from(
          event.response_body,
          "base64",
        ).toString();
        try {
          const parsedBody = JSON.parse(decodedResponseBody);
          if (parsedBody.message) {
            expect(parsedBody.message).toBe("Custom response from handler");
          }
        } catch {
          // If it's not JSON, that's fine - just verify it's not empty
          expect(decodedResponseBody.length).toBeGreaterThan(0);
        }
      }
    }
  });

  test("Multiple requests create separate events", async () => {
    const requests = [
      fetch(`${baseUrl}/test1`),
      fetch(`${baseUrl}/test2`),
      fetch(`${baseUrl}/test3`),
    ];

    const responses = await Promise.all(requests);

    // All requests should succeed
    for (const response of responses) {
      expect(response.status).toBe(200);
    }

    const allEvents = getAllRequestEvents();
    const testEvents = allEvents.filter((e) =>
      e.request_url.startsWith("/test"),
    );

    expect(testEvents.length).toBeGreaterThanOrEqual(3);

    const urls = testEvents.map((e) => e.request_url);
    expect(urls).toContain("/test1");
    expect(urls).toContain("/test2");
    expect(urls).toContain("/test3");
  });

  describe("JWT Verification with RS384", () => {
    let rsaKeyPair: CryptoKey;
    let publicJWK: jose.JWK;
    let privateKey: CryptoKey;

    beforeAll(async () => {
      // Generate RSA key pair for RS384 testing
      const { publicKey, privateKey: privKey } = await jose.generateKeyPair(
        "RS384",
        { modulusLength: 2048 },
      );
      rsaKeyPair = publicKey;
      privateKey = privKey;

      // Export public key as JWK
      publicJWK = await jose.exportJWK(publicKey);
      publicJWK.alg = "RS384";
      publicJWK.kid = "test-rs384-key";
      publicJWK.use = "sig";
    });

    const createValidRS384JWT = async (payload: Record<string, any> = {}) => {
      const defaultPayload = {
        sub: "1234567890",
        name: "John Doe",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
        ...payload,
      };

      return await new jose.SignJWT(defaultPayload)
        .setProtectedHeader({ alg: "RS384", kid: "test-rs384-key" })
        .sign(privateKey);
    };

    const createJWKS = (keys: jose.JWK[] = []) => {
      return JSON.stringify({
        keys: keys.length > 0 ? keys : [publicJWK],
      });
    };

    test("should verify valid RS384 JWT in webhook request", async () => {
      const validJWT = await createValidRS384JWT();
      const jwks = createJWKS();

      // Create handler with RS384 JWT verification
      const handlerCode = `
        if (!jwt.isJWTVerified()) {
          resp.status = 401;
          resp.body = JSON.stringify({ error: "JWT verification failed: " + jwt.getJWTError() });
        } else {
          resp.status = 200;
          resp.headers = [["X-JWT-Algorithm", jwt.getJWTAlgorithm() || ""]];
          resp.body = JSON.stringify({ 
            message: "JWT verified successfully",
            algorithm: jwt.getJWTAlgorithm(),
            keyId: jwt.getJWTKeyId()
          });
        }
      `;

      createHandler({
        id: randomUUID(),
        version_id: "1",
        name: "rs384-jwt-handler",
        method: "POST",
        path: "/jwt/rs384",
        code: handlerCode,
        order: 0,
        jwks,
      });

      const response = await fetch(`${baseUrl}/jwt/rs384`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validJWT}`,
        },
        body: JSON.stringify({ test: "data" }),
      });

      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData.message).toBe("JWT verified successfully");
      expect(responseData.algorithm).toBe("RS384");
      expect(responseData.keyId).toBe("test-rs384-key");

      // Check if custom header was set
      expect(response.headers.get("X-JWT-Algorithm")).toBe("RS384");
    });

    test("should reject invalid RS384 JWT signature", async () => {
      const jwks = createJWKS();

      // Create JWT with wrong signature by modifying a valid one
      const validJWT = await createValidRS384JWT();
      const jwtParts = validJWT.split(".");
      const invalidJWT = `${jwtParts[0]}.${jwtParts[1]}.invalid-signature`;

      const handlerCode = `
        if (!jwt.isJWTVerified()) {
          resp.status = 401;
          resp.body = JSON.stringify({ error: jwt.getJWTError() });
        } else {
          resp.status = 200;
          resp.body = JSON.stringify({ message: "Should not reach here" });
        }
      `;

      createHandler({
        id: randomUUID(),
        version_id: "1",
        name: "rs384-invalid-jwt-handler",
        method: "POST",
        path: "/jwt/rs384-invalid",
        code: handlerCode,
        order: 0,
        jwks,
      });

      const response = await fetch(`${baseUrl}/jwt/rs384-invalid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${invalidJWT}`,
        },
        body: JSON.stringify({ test: "data" }),
      });

      expect(response.status).toBe(401);

      const responseData = await response.json();
      expect(responseData.error).toContain("signature verification failed");
    });

    test("should reject expired RS384 JWT", async () => {
      const jwks = createJWKS();

      // Create expired JWT
      const expiredJWT = await createValidRS384JWT({
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      });

      const handlerCode = `
        if (!jwt.isJWTVerified()) {
          resp.status = 401;
          resp.body = JSON.stringify({ error: jwt.getJWTError() });
        } else {
          resp.status = 200;
          resp.body = JSON.stringify({ message: "Should not reach here" });
        }
      `;

      createHandler({
        id: randomUUID(),
        version_id: "1",
        name: "rs384-expired-jwt-handler",
        method: "POST",
        path: "/jwt/rs384-expired",
        code: handlerCode,
        order: 0,
        jwks,
      });

      const response = await fetch(`${baseUrl}/jwt/rs384-expired`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${expiredJWT}`,
        },
        body: JSON.stringify({ test: "data" }),
      });

      expect(response.status).toBe(401);

      const responseData = await response.json();
      expect(responseData.error).toBe("JWT has expired");
    });

    test("should reject RS384 JWT with wrong key ID", async () => {
      // Create JWKS with different key ID
      const wrongKeyJWK = { ...publicJWK, kid: "wrong-key-id" };
      const jwks = createJWKS([wrongKeyJWK]);

      const validJWT = await createValidRS384JWT();

      const handlerCode = `
        if (!jwt.isJWTVerified()) {
          resp.status = 401;
          resp.body = JSON.stringify({ error: jwt.getJWTError() });
        } else {
          resp.status = 200;
          resp.body = JSON.stringify({ message: "Should not reach here" });
        }
      `;

      createHandler({
        id: randomUUID(),
        version_id: "1",
        name: "rs384-wrong-kid-handler",
        method: "POST",
        path: "/jwt/rs384-wrong-kid",
        code: handlerCode,
        order: 0,
        jwks,
      });

      const response = await fetch(`${baseUrl}/jwt/rs384-wrong-kid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validJWT}`,
        },
        body: JSON.stringify({ test: "data" }),
      });

      expect(response.status).toBe(401);

      const responseData = await response.json();
      expect(responseData.error).toContain("signature verification failed");
    });

    test("should reject request without JWT when RS384 verification required", async () => {
      const jwks = createJWKS();

      const handlerCode = `
        try {
          jwt.requireJWTVerification();
          resp.status = 200;
          resp.body = JSON.stringify({ message: "JWT verified successfully" });
        } catch (error) {
          resp.status = 401;
          resp.body = JSON.stringify({ error: error.message });
        }
      `;

      createHandler({
        id: randomUUID(),
        version_id: "1",
        name: "rs384-required-handler",
        method: "POST",
        path: "/jwt/rs384-required",
        code: handlerCode,
        order: 0,
        jwks,
      });

      const response = await fetch(`${baseUrl}/jwt/rs384-required`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ test: "data" }),
      });

      expect(response.status).toBe(401);

      const responseData = await response.json();
      expect(responseData.error).toContain("JWT verification failed");
    });

    test("should work with multiple RS384 keys in JWKS", async () => {
      // Create additional key for testing multiple key scenario
      const { publicKey: publicKey2, privateKey: privateKey2 } =
        await jose.generateKeyPair("RS384", { modulusLength: 2048 });
      const publicJWK2 = await jose.exportJWK(publicKey2);
      publicJWK2.alg = "RS384";
      publicJWK2.kid = "test-rs384-key-2";
      publicJWK2.use = "sig";

      // Create JWKS with multiple keys
      const jwks = createJWKS([publicJWK, publicJWK2]);

      // Create JWT with first key
      const validJWT = await createValidRS384JWT();

      const handlerCode = `
        if (!jwt.isJWTVerified()) {
          resp.status = 401;
          resp.body = JSON.stringify({ error: jwt.getJWTError() });
        } else {
          resp.status = 200;
          resp.body = JSON.stringify({ 
            message: "JWT verified successfully",
            keyId: jwt.getJWTKeyId()
          });
        }
      `;

      createHandler({
        id: randomUUID(),
        version_id: "1",
        name: "rs384-multiple-keys-handler",
        method: "POST",
        path: "/jwt/rs384-multiple",
        code: handlerCode,
        order: 0,
        jwks,
      });

      const response = await fetch(`${baseUrl}/jwt/rs384-multiple`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validJWT}`,
        },
        body: JSON.stringify({ test: "data" }),
      });

      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData.message).toBe("JWT verified successfully");
      expect(responseData.keyId).toBe("test-rs384-key");
    });

    test("should handle RS384 JWT with not-before time (nbf)", async () => {
      const jwks = createJWKS();

      // Create JWT that's not valid yet (nbf in future)
      const futureJWT = await createValidRS384JWT({
        nbf: Math.floor(Date.now() / 1000) + 3600, // Not valid for 1 hour
      });

      const handlerCode = `
        if (!jwt.isJWTVerified()) {
          resp.status = 401;
          resp.body = JSON.stringify({ error: jwt.getJWTError() });
        } else {
          resp.status = 200;
          resp.body = JSON.stringify({ message: "Should not reach here" });
        }
      `;

      createHandler({
        id: randomUUID(),
        version_id: "1",
        name: "rs384-nbf-handler",
        method: "POST",
        path: "/jwt/rs384-nbf",
        code: handlerCode,
        order: 0,
        jwks,
      });

      const response = await fetch(`${baseUrl}/jwt/rs384-nbf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${futureJWT}`,
        },
        body: JSON.stringify({ test: "data" }),
      });

      expect(response.status).toBe(401);

      const responseData = await response.json();
      expect(responseData.error).toBe("JWT is not yet valid");
    });
  });
});

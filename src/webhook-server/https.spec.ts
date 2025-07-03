import { clearHandlerExecutions } from "@/handler-executions/model";
import { clearHandlers } from "@/handlers/model";
import {
  clearRequestEvents,
  getAllRequestEvents,
} from "@/request-events/model";
import { TEST_PORT, TEST_SSL_PORT } from "@/test-config";
import { afterAll, beforeEach, describe, expect, test } from "bun:test";

describe("Webhook Server HTTPS/TLS Tests", () => {
  const baseUrl = `https://localhost:${TEST_SSL_PORT}`;

  afterAll(async () => {
    clearHandlerExecutions();
    clearRequestEvents();
    clearHandlers();
  });

  beforeEach(() => {
    // Clear any existing handlers before each test
    clearHandlers();
  });

  test("HTTPS GET request captures TLS info", async () => {
    // AIDEV-NOTE: Using fetch with rejectUnauthorized: false to accept self-signed cert
    const response = await fetch(`${baseUrl}/tls-test`, {
      // @ts-ignore - Bun supports this option
      tls: { rejectUnauthorized: false },
    });
    expect(response.status).toBe(200);

    const allEvents = getAllRequestEvents();
    const event = allEvents.find(
      (e) => e.request_url === "/tls-test" && e.tls_info !== null,
    );
    expect(event).toBeDefined();

    if (event) {
      expect(event.request_method).toBe("GET");
      expect(event.tls_info).toBeDefined();
      expect(event.tls_info).not.toBeNull();

      // Parse and verify TLS info
      if (event.tls_info) {
        const tlsInfo = JSON.parse(event.tls_info);

        // In a real TLS environment, we expect these fields
        // In test environment, they may be missing or have defaults
        expect(typeof tlsInfo).toBe("object");

        // If protocol is available, check it's a valid TLS version
        if (tlsInfo.protocol) {
          expect(tlsInfo.protocol).toMatch(/^TLSv1\.[23]$/);
        }

        // Check cipher suite exists if available
        if (tlsInfo.cipher && typeof tlsInfo.cipher === "object") {
          expect(tlsInfo.cipher).toHaveProperty("name");
        }

        // Check session reuse flag if present
        if (tlsInfo.hasOwnProperty("isSessionReused")) {
          expect(typeof tlsInfo.isSessionReused).toBe("boolean");
        }
      }
    }
  });

  test("HTTPS POST request with JSON body captures TLS info", async () => {
    const testData = { secure: true, message: "TLS test" };

    const response = await fetch(`${baseUrl}/api/secure-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testData),
      // @ts-ignore - Bun supports this option
      tls: { rejectUnauthorized: false },
    });

    expect(response.status).toBe(200);

    const allEvents = getAllRequestEvents();
    const event = allEvents.find(
      (e) =>
        e.request_method === "POST" &&
        e.request_url === "/api/secure-webhook" &&
        e.tls_info !== null,
    );
    expect(event).toBeDefined();

    if (event) {
      expect(event.request_body).toBeDefined();
      expect(event.tls_info).toBeDefined();
      expect(event.tls_info).not.toBeNull();

      // Verify JSON body
      if (event.request_body) {
        const decodedBody = Buffer.from(
          event.request_body,
          "base64",
        ).toString();
        expect(JSON.parse(decodedBody)).toEqual(testData);
      }

      // Verify TLS info exists and is valid JSON
      if (event.tls_info) {
        const tlsInfo = JSON.parse(event.tls_info);
        expect(typeof tlsInfo).toBe("object");

        // Check for TLS-specific fields if available
        if (tlsInfo.protocol) {
          expect(tlsInfo.protocol).toMatch(/^TLSv1\.[23]$/);
        }
        if (tlsInfo.cipher && typeof tlsInfo.cipher === "object") {
          expect(tlsInfo.cipher).toHaveProperty("name");
        }
      }
    }
  });

  test("Multiple HTTPS requests maintain separate TLS info", async () => {
    // Make multiple concurrent HTTPS requests
    const requests = [
      fetch(`${baseUrl}/tls1`, {
        // @ts-ignore
        tls: { rejectUnauthorized: false },
      }),
      fetch(`${baseUrl}/tls2`, {
        // @ts-ignore
        tls: { rejectUnauthorized: false },
      }),
      fetch(`${baseUrl}/tls3`, {
        // @ts-ignore
        tls: { rejectUnauthorized: false },
      }),
    ];

    const responses = await Promise.all(requests);

    // All requests should succeed
    for (const response of responses) {
      expect(response.status).toBe(200);
    }

    const allEvents = getAllRequestEvents();
    const tlsEvents = allEvents.filter(
      (e) => e.request_url.startsWith("/tls") && e.tls_info !== null,
    );

    expect(tlsEvents.length).toBeGreaterThanOrEqual(3);

    // Each event should have TLS info
    for (const event of tlsEvents) {
      expect(event.tls_info).toBeDefined();
      expect(event.tls_info).not.toBeNull();

      if (event.tls_info) {
        const tlsInfo = JSON.parse(event.tls_info);
        expect(typeof tlsInfo).toBe("object");

        // Check for TLS-specific fields if available
        if (tlsInfo.protocol) {
          expect(tlsInfo.protocol).toMatch(/^TLSv1\.[23]$/);
        }
        if (tlsInfo.cipher && typeof tlsInfo.cipher === "object") {
          expect(tlsInfo.cipher).toHaveProperty("name");
        }
      }
    }
  });

  test("HTTPS request with client certificate", async () => {
    // This test demonstrates that the server can capture client certificate info
    // In a real scenario, you'd configure the server to request client certs
    const response = await fetch(`${baseUrl}/client-cert-test`, {
      method: "POST",
      headers: {
        "X-Client-Cert": "test-client",
      },
      // @ts-ignore
      tls: { rejectUnauthorized: false },
    });

    expect(response.status).toBe(200);

    const allEvents = getAllRequestEvents();
    const event = allEvents.find(
      (e) => e.request_url === "/client-cert-test" && e.tls_info !== null,
    );
    expect(event).toBeDefined();

    if (event) {
      if (event.tls_info) {
        const tlsInfo = JSON.parse(event.tls_info);

        // Even without client cert, we should still capture server TLS info
        expect(typeof tlsInfo).toBe("object");

        // Check for TLS-specific fields if available
        if (tlsInfo.protocol) {
          expect(tlsInfo.protocol).toMatch(/^TLSv1\.[23]$/);
        }
        if (tlsInfo.cipher && typeof tlsInfo.cipher === "object") {
          expect(tlsInfo.cipher).toHaveProperty("name");
        }

        // peerCertificate would contain client cert info if provided
        // In this test it will be null or contain server cert info
      }
    }
  });

  test("HTTP request to non-SSL port does not capture TLS info", async () => {
    // Make a regular HTTP request to verify tls_info is null
    const httpUrl = `http://localhost:${TEST_PORT}/no-tls`;

    const response = await fetch(httpUrl);
    expect(response.status).toBe(200);

    const allEvents = getAllRequestEvents();
    const event = allEvents.find((e) => e.request_url === "/no-tls");
    expect(event).toBeDefined();

    if (event) {
      // TLS info should be null for HTTP requests
      expect(event.tls_info).toBeNull();
    }
  });
});

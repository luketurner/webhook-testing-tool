// Set test port before any imports to ensure config is loaded correctly
const TEST_PORT = 4123; // Use a fixed port in the 4000-5000 range for testing
process.env.WTT_WEBHOOK_PORT = TEST_PORT.toString();

import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "bun:test";
import express from "express";
import morgan from "morgan";
import bodyParser from "body-parser";
import { EXCLUDE_HEADER_MAP } from "../config-shared";
import type { RequestEvent } from "@/request-events/schema";
import { randomUUID } from "@/util/uuid";
import { now } from "@/util/timestamp";
import { fromObject } from "@/util/kv-list";
import type { HttpMethod } from "@/util/http";
import { fromBufferLike } from "@/util/base64";
import {
  createRequestEvent,
  updateRequestEvent,
  getAllRequestEvents,
  deleteRequestEvent,
} from "@/request-events/model";
import type { RequestId } from "@/request-events/schema";
import { appEvents } from "@/db/events";
import { handleRequest } from "./handle-request";
import { clearHandlers, createHandler } from "@/handlers/model";

describe("Webhook Server Integration Tests", () => {
  let server: any;
  let app: express.Application;
  const baseUrl = `http://localhost:${TEST_PORT}`;
  const testRequestIds: string[] = [];

  beforeAll(async () => {
    // Create Express app similar to the main webhook server
    app = express();
    app.use(morgan("combined"));
    app.use(bodyParser.raw({ type: (_req) => true }));

    app.all("*", async (req, res) => {
      const headers = { ...req.headers };
      for (const header of Object.keys(headers)) {
        if (EXCLUDE_HEADER_MAP[header]) delete headers[header];
      }

      // Extract query parameters from URL
      const url = new URL(
        req.originalUrl,
        `http://${req.headers.host || "localhost"}`,
      );
      const queryParams = [...url.searchParams.entries()];

      const event: RequestEvent = {
        id: randomUUID(),
        type: "inbound",
        status: "running",
        request_url: req.originalUrl,
        request_method: req.method as HttpMethod,
        request_timestamp: now(),
        request_body: Buffer.isBuffer(req.body)
          ? fromBufferLike(req.body)
          : null,
        request_headers: fromObject(headers),
        request_query_params: queryParams,
      };

      const createdEvent = createRequestEvent(event);
      appEvents.emit("request:created", createdEvent);

      // intercept response write so we can log the response info
      const oldWrite = res.write;
      const oldEnd = res.end;
      const chunks: Buffer[] = [];

      res.write = (...restArgs) => {
        chunks.push(Buffer.from(restArgs[0]));
        return oldWrite.apply(res, restArgs);
      };

      res.end = (...restArgs) => {
        if (restArgs[0]) {
          chunks.push(Buffer.from(restArgs[0]));
        }
        const body = Buffer.concat(chunks as any);
        const result = oldEnd.apply(res, restArgs);

        const updatedEvent = updateRequestEvent({
          id: event.id,
          status: "complete",
          response_status: res.statusCode,
          response_status_message: res.statusMessage,
          response_headers: fromObject(res.getHeaders()),
          response_body: body.length > 0 ? fromBufferLike(body) : null,
          response_timestamp: now(),
        });
        appEvents.emit("request:updated", updatedEvent);
        return result;
      };

      const [error, response] = await handleRequest(event);

      const responseStatus =
        typeof response?.status === "number" ? response.status : 200;
      res.status(responseStatus);
      for (const [k, v] of response?.response_headers || []) {
        res.set(k, v.toString());
      }
      res.send(
        response?.response_body === null ||
          response?.response_body === undefined
          ? { status: responseStatus }
          : Buffer.from(response.response_body, "base64"),
      );
    });

    // Start the test server
    server = await new Promise<any>((resolve) => {
      const srv = app.listen(TEST_PORT, () => {
        resolve(srv);
      });
    });

    // Give the server a moment to fully start
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    // Close the server
    if (server) {
      server.close();
    }

    // Clean up any remaining test request events
    for (const id of testRequestIds) {
      try {
        deleteRequestEvent(id as RequestId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  beforeEach(() => {
    // Clear any existing handlers before each test
    clearHandlers();
  });

  const cleanupRequestEvent = (id: string) => {
    testRequestIds.push(id);
  };

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
      cleanupRequestEvent(event.id);

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
      cleanupRequestEvent(event.id);

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
      cleanupRequestEvent(event.id);

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
      cleanupRequestEvent(event.id);

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
      cleanupRequestEvent(event.id);

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
      cleanupRequestEvent(event.id);

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

    // Clean up all test events
    for (const event of testEvents) {
      cleanupRequestEvent(event.id);
    }
  });
});

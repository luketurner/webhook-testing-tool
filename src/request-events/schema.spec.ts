import { expect, test, describe } from "bun:test";
import {
  requestEventSchema,
  requestEventMetaSchema,
  REQUEST_EVENT_TYPES,
  REQUEST_EVENT_STATUSES,
  type RequestEvent,
  type RequestEventMeta,
} from "./schema";
import { randomUUID } from "@/util/uuid";
import { now } from "@/util/timestamp";
import { parseBase64 } from "@/util/base64";

describe("request-events/schema", () => {
  const validRequestEvent = {
    id: randomUUID(),
    type: "inbound" as const,
    status: "running" as const,
    request_method: "GET" as const,
    request_url: "/test",
    request_headers: JSON.stringify([["Content-Type", "application/json"]]),
    request_body: Buffer.from("test body"),
    request_timestamp: now(),
    response_status: 200,
    response_status_message: "OK",
    response_headers: JSON.stringify([["Content-Type", "application/json"]]),
    response_body: Buffer.from("response body"),
    response_timestamp: now(),
  };

  describe("requestEventSchema", () => {
    test("should validate a complete valid request event", () => {
      const result = requestEventSchema.parse(validRequestEvent);

      expect(result).toMatchObject({
        id: validRequestEvent.id,
        type: validRequestEvent.type,
        status: validRequestEvent.status,
        request_method: validRequestEvent.request_method,
        request_url: validRequestEvent.request_url,
        response_status: validRequestEvent.response_status,
        response_status_message: validRequestEvent.response_status_message,
      });

      expect(result.request_headers).toEqual([
        ["Content-Type", "application/json"],
      ]);
      expect(result.response_headers).toEqual([
        ["Content-Type", "application/json"],
      ]);
    });

    test("should validate minimal request event with required fields only", () => {
      const minimalEvent = {
        id: randomUUID(),
        type: "inbound" as const,
        status: "running" as const,
        request_method: "POST" as const,
        request_url: "/minimal",
        request_headers: JSON.stringify([]),
        request_body: null,
        request_timestamp: now(),
        response_status: null,
        response_status_message: null,
        response_headers: null,
        response_body: null,
        response_timestamp: null,
      };

      const result = requestEventSchema.parse(minimalEvent);

      expect(result).toMatchObject({
        id: minimalEvent.id,
        type: minimalEvent.type,
        status: minimalEvent.status,
        request_method: minimalEvent.request_method,
        request_url: minimalEvent.request_url,
      });

      expect(result.request_headers).toEqual([]);
      expect(result.request_body).toBeNull();
      expect(result.response_headers).toBeNull();
      expect(result.response_body).toBeNull();
    });

    test("should validate all supported request event types", () => {
      REQUEST_EVENT_TYPES.forEach((type) => {
        const event = {
          ...validRequestEvent,
          id: randomUUID(),
          type,
        };

        const result = requestEventSchema.parse(event);
        expect(result.type).toBe(type);
      });
    });

    test("should validate all supported request event statuses", () => {
      REQUEST_EVENT_STATUSES.forEach((status) => {
        const event = {
          ...validRequestEvent,
          id: randomUUID(),
          status,
        };

        const result = requestEventSchema.parse(event);
        expect(result.status).toBe(status);
      });
    });

    test("should validate all supported HTTP methods", () => {
      const methods = [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "HEAD",
        "OPTIONS",
        "PATCH",
      ] as const;

      methods.forEach((method) => {
        const event = {
          ...validRequestEvent,
          id: randomUUID(),
          request_method: method,
        };

        const result = requestEventSchema.parse(event);
        expect(result.request_method).toBe(method);
      });
    });

    test("should handle JSON string headers preprocessing", () => {
      const complexHeaders = [
        ["Authorization", "Bearer token123"],
        ["Content-Type", "application/json; charset=utf-8"],
        ["X-Custom-Header", "custom-value"],
      ];

      const event = {
        ...validRequestEvent,
        id: randomUUID(),
        request_headers: JSON.stringify(complexHeaders),
        response_headers: JSON.stringify(complexHeaders),
      };

      const result = requestEventSchema.parse(event);
      expect(result.request_headers).toEqual(complexHeaders);
      expect(result.response_headers).toEqual(complexHeaders);
    });

    test("should handle Buffer-like body preprocessing", () => {
      const bodyContent = "test body content";
      const bodyBuffer = Buffer.from(bodyContent);

      const event = {
        ...validRequestEvent,
        id: randomUUID(),
        request_body: bodyBuffer,
        response_body: bodyBuffer,
      };

      const result = requestEventSchema.parse(event);
      expect(typeof result.request_body).toBe("string"); // Should be base64 string
      expect(typeof result.response_body).toBe("string"); // Should be base64 string
    });

    describe("validation failures", () => {
      test("should reject invalid request event type", () => {
        const invalidEvent = {
          ...validRequestEvent,
          type: "invalid-type",
        };

        expect(() => requestEventSchema.parse(invalidEvent)).toThrow();
      });

      test("should reject invalid request event status", () => {
        const invalidEvent = {
          ...validRequestEvent,
          status: "invalid-status",
        };

        expect(() => requestEventSchema.parse(invalidEvent)).toThrow();
      });

      test("should reject invalid HTTP method", () => {
        const invalidEvent = {
          ...validRequestEvent,
          request_method: "INVALID",
        };

        expect(() => requestEventSchema.parse(invalidEvent)).toThrow();
      });

      test("should reject missing required fields", () => {
        const requiredFields = [
          "id",
          "type",
          "status",
          "request_method",
          "request_url",
          "request_headers",
          "request_timestamp",
        ];

        requiredFields.forEach((field) => {
          const incompleteEvent = { ...validRequestEvent };
          delete incompleteEvent[field];

          expect(() => requestEventSchema.parse(incompleteEvent)).toThrow();
        });
      });

      test("should reject empty request URL", () => {
        const invalidEvent = {
          ...validRequestEvent,
          request_url: "",
        };

        expect(() => requestEventSchema.parse(invalidEvent)).toThrow();
      });

      test("should reject invalid UUID format", () => {
        const invalidEvent = {
          ...validRequestEvent,
          id: "not-a-uuid",
        };

        expect(() => requestEventSchema.parse(invalidEvent)).toThrow();
      });

      test("should reject invalid timestamp", () => {
        const invalidEvent = {
          ...validRequestEvent,
          request_timestamp: "not-a-timestamp",
        };

        expect(() => requestEventSchema.parse(invalidEvent)).toThrow();
      });

      test("should reject invalid response status codes", () => {
        const invalidStatuses = [99, 601, -1, "200"];

        invalidStatuses.forEach((status) => {
          const invalidEvent = {
            ...validRequestEvent,
            response_status: status,
          };

          expect(() => requestEventSchema.parse(invalidEvent)).toThrow();
        });
      });

      test("should reject empty response status message", () => {
        const invalidEvent = {
          ...validRequestEvent,
          response_status_message: "",
        };

        expect(() => requestEventSchema.parse(invalidEvent)).toThrow();
      });

      test("should reject malformed JSON in headers", () => {
        const invalidEvent = {
          ...validRequestEvent,
          request_headers: "not-valid-json",
        };

        expect(() => requestEventSchema.parse(invalidEvent)).toThrow();
      });

      test("should reject invalid header structure", () => {
        const invalidHeaders = [
          ["single-element"], // Should be key-value pairs
          ["key", "value", "extra"], // Should only have 2 elements
          [123, "value"], // Key should be string
          ["key", 456], // Value should be string
        ];

        invalidHeaders.forEach((headers) => {
          const invalidEvent = {
            ...validRequestEvent,
            request_headers: JSON.stringify([headers]),
          };

          expect(() => requestEventSchema.parse(invalidEvent)).toThrow();
        });
      });

      test("should reject completely invalid data types", () => {
        const invalidInputs = [null, undefined, "string", 123, [], true];

        invalidInputs.forEach((input) => {
          expect(() => requestEventSchema.parse(input)).toThrow();
        });
      });
    });
  });

  describe("requestEventMetaSchema", () => {
    test("should validate request event metadata without body/header fields", () => {
      const result = requestEventMetaSchema.parse(validRequestEvent);

      expect(result).toMatchObject({
        id: validRequestEvent.id,
        type: validRequestEvent.type,
        status: validRequestEvent.status,
        request_method: validRequestEvent.request_method,
        request_url: validRequestEvent.request_url,
        response_status: validRequestEvent.response_status,
        response_status_message: validRequestEvent.response_status_message,
      });

      // These fields should be omitted
      expect(result).not.toHaveProperty("request_headers");
      expect(result).not.toHaveProperty("request_body");
      expect(result).not.toHaveProperty("response_headers");
      expect(result).not.toHaveProperty("response_body");
    });

    test("should accept the same data as full schema but omit specific fields", () => {
      const fullResult = requestEventSchema.parse(validRequestEvent);
      const metaResult = requestEventMetaSchema.parse(validRequestEvent);

      // Should have same core fields
      expect(metaResult.id).toBe(fullResult.id);
      expect(metaResult.type).toBe(fullResult.type);
      expect(metaResult.status).toBe(fullResult.status);
      expect(metaResult.request_method).toBe(fullResult.request_method);
      expect(metaResult.request_url).toBe(fullResult.request_url);

      // But should not have body/header fields
      expect(metaResult).not.toHaveProperty("request_headers");
      expect(metaResult).not.toHaveProperty("request_body");
      expect(metaResult).not.toHaveProperty("response_headers");
      expect(metaResult).not.toHaveProperty("response_body");
    });

    test("should validate minimal metadata", () => {
      const minimalEvent = {
        id: randomUUID(),
        type: "outbound" as const,
        status: "complete" as const,
        request_method: "DELETE" as const,
        request_url: "/minimal-meta",
        request_timestamp: now(),
        response_status: null,
        response_status_message: null,
        response_timestamp: null,
      };

      const result = requestEventMetaSchema.parse(minimalEvent);

      expect(result).toMatchObject({
        id: minimalEvent.id,
        type: minimalEvent.type,
        status: minimalEvent.status,
        request_method: minimalEvent.request_method,
        request_url: minimalEvent.request_url,
      });
    });

    describe("metadata validation failures", () => {
      test("should reject same invalid data as full schema", () => {
        const invalidEvent = {
          ...validRequestEvent,
          type: "invalid-type",
        };

        expect(() => requestEventMetaSchema.parse(invalidEvent)).toThrow();
      });

      test("should still require core fields", () => {
        const incompleteEvent = {
          id: randomUUID(),
          type: "inbound",
          // Missing status, method, url, timestamp
        };

        expect(() => requestEventMetaSchema.parse(incompleteEvent)).toThrow();
      });
    });
  });

  describe("type exports and constants", () => {
    test("should export correct request event types", () => {
      expect(REQUEST_EVENT_TYPES).toEqual(["inbound", "outbound"]);
    });

    test("should export correct request event statuses", () => {
      expect(REQUEST_EVENT_STATUSES).toEqual(["running", "complete", "error"]);
    });

    test("should have proper TypeScript types", () => {
      // This is a compile-time test - if it compiles, types are correct
      const event: RequestEvent = {
        id: randomUUID(),
        type: "inbound",
        status: "running",
        request_method: "GET",
        request_url: "/test",
        request_headers: [],
        request_query_params: [],
        request_body: null,
        request_timestamp: now(),
        response_status: null,
        response_status_message: null,
        response_headers: null,
        response_body: null,
        response_timestamp: null,
      };

      const meta: RequestEventMeta = {
        id: randomUUID(),
        type: "outbound",
        status: "complete",
        request_method: "POST",
        request_url: "/meta-test",
        request_timestamp: now(),
        response_status: 201,
        response_status_message: "Created",
        response_timestamp: now(),
      };

      expect(event.type).toBeDefined();
      expect(meta.type).toBeDefined();
    });
  });
});

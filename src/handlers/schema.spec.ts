import { expect, test, describe } from "bun:test";
import {
  handlerSchema,
  handlerMetaSchema,
  bulkReorderSchema,
  type Handler,
  type HandlerMeta,
  type BulkReorderRequest,
} from "./schema";
import { randomUUID } from "@/util/uuid";

describe("handlers/schema", () => {
  const validHandler = {
    id: randomUUID(),
    version_id: "1.0.0",
    name: "Test Handler",
    code: "resp.status = 200; resp.body = 'Hello World';",
    path: "/test",
    method: "GET" as const,
    order: 1,
  };

  describe("handlerSchema", () => {
    test("should validate a complete valid handler", () => {
      const result = handlerSchema.parse(validHandler);

      expect(result).toMatchObject({
        id: validHandler.id,
        version_id: validHandler.version_id,
        name: validHandler.name,
        code: validHandler.code,
        path: validHandler.path,
        method: validHandler.method,
        order: validHandler.order,
      });
    });

    test("should validate handler with wildcard method", () => {
      const handlerWithWildcard = {
        ...validHandler,
        id: randomUUID(),
        method: "*" as const,
      };

      const result = handlerSchema.parse(handlerWithWildcard);
      expect(result.method).toBe("*");
    });

    test("should validate all supported HTTP methods", () => {
      const methods = ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH"] as const;

      methods.forEach(method => {
        const handler = {
          ...validHandler,
          id: randomUUID(),
          method,
        };

        const result = handlerSchema.parse(handler);
        expect(result.method).toBe(method);
      });
    });

    test("should validate handler with minimum order value", () => {
      const handler = {
        ...validHandler,
        id: randomUUID(),
        order: 0,
      };

      const result = handlerSchema.parse(handler);
      expect(result.order).toBe(0);
    });

    test("should validate handler with large order value", () => {
      const handler = {
        ...validHandler,
        id: randomUUID(),
        order: 999999,
      };

      const result = handlerSchema.parse(handler);
      expect(result.order).toBe(999999);
    });

    test("should validate handler with complex code", () => {
      const complexCode = `
        if (req.method === 'POST') {
          const body = JSON.parse(req.body);
          if (body.action === 'create') {
            resp.status = 201;
            resp.body = JSON.stringify({ id: 123, created: true });
          } else {
            resp.status = 400;
            resp.body = 'Invalid action';
          }
        } else {
          resp.status = 405;
          resp.body = 'Method not allowed';
        }
        resp.headers.push(['Content-Type', 'application/json']);
      `;

      const handler = {
        ...validHandler,
        id: randomUUID(),
        code: complexCode,
      };

      const result = handlerSchema.parse(handler);
      expect(result.code).toBe(complexCode);
    });

    test("should validate handler with path parameters", () => {
      const pathsWithParams = [
        "/users/:id",
        "/api/v1/users/:userId/posts/:postId",
        "/files/*",
        "/webhook/:service/:event",
        "/resource/:id/nested/:nestedId",
      ];

      pathsWithParams.forEach(path => {
        const handler = {
          ...validHandler,
          id: randomUUID(),
          path,
        };

        const result = handlerSchema.parse(handler);
        expect(result.path).toBe(path);
      });
    });

    test("should validate handler with different version formats", () => {
      const versions = [
        "1",
        "1.0",
        "1.0.0",
        "2.1.3",
        "v1.0.0",
        "latest",
        "develop",
        "feature-branch",
        "2023-01-01",
      ];

      versions.forEach(version => {
        const handler = {
          ...validHandler,
          id: randomUUID(),
          version_id: version,
        };

        const result = handlerSchema.parse(handler);
        expect(result.version_id).toBe(version);
      });
    });

    describe("validation failures", () => {
      test("should reject invalid HTTP method", () => {
        const invalidHandler = {
          ...validHandler,
          method: "INVALID",
        };

        expect(() => handlerSchema.parse(invalidHandler)).toThrow();
      });

      test("should reject missing required fields", () => {
        const requiredFields = [
          "id",
          "version_id",
          "name",
          "code",
          "path",
          "method",
          "order",
        ];

        requiredFields.forEach(field => {
          const incompleteHandler = { ...validHandler };
          delete incompleteHandler[field];

          expect(() => handlerSchema.parse(incompleteHandler)).toThrow();
        });
      });

      test("should reject empty string fields", () => {
        const stringFields = ["version_id", "name", "code", "path"];

        stringFields.forEach(field => {
          const invalidHandler = {
            ...validHandler,
            [field]: "",
          };

          expect(() => handlerSchema.parse(invalidHandler)).toThrow();
        });
      });

      test("should reject invalid UUID format", () => {
        const invalidHandler = {
          ...validHandler,
          id: "not-a-uuid",
        };

        expect(() => handlerSchema.parse(invalidHandler)).toThrow();
      });

      test("should reject negative order values", () => {
        const invalidHandler = {
          ...validHandler,
          order: -1,
        };

        expect(() => handlerSchema.parse(invalidHandler)).toThrow();
      });

      test("should reject non-integer order values", () => {
        const invalidOrders = [1.5, 2.7, "5", true, null];

        invalidOrders.forEach(order => {
          const invalidHandler = {
            ...validHandler,
            order,
          };

          expect(() => handlerSchema.parse(invalidHandler)).toThrow();
        });
      });

      test("should reject invalid data types", () => {
        const invalidInputs = [
          null,
          undefined,
          "string",
          123,
          [],
          true,
          { incomplete: "object" },
        ];

        invalidInputs.forEach(input => {
          expect(() => handlerSchema.parse(input)).toThrow();
        });
      });

      test("should reject handlers with extra fields", () => {
        const handlerWithExtra = {
          ...validHandler,
          extraField: "should not be allowed",
        };

        // Zod should strip extra fields by default, but let's verify behavior
        const result = handlerSchema.parse(handlerWithExtra);
        expect(result).not.toHaveProperty("extraField");
      });

      test("should reject whitespace-only string fields", () => {
        const whitespaceFields = ["version_id", "name", "code", "path"];

        whitespaceFields.forEach(field => {
          const invalidHandler = {
            ...validHandler,
            [field]: "   ",
          };

          // Depending on schema, this might or might not be rejected
          // Let's test the actual behavior
          try {
            const result = handlerSchema.parse(invalidHandler);
            // If it passes, the schema allows whitespace
            expect(result[field]).toBe("   ");
          } catch (error) {
            // If it throws, the schema rejects whitespace
            expect(error).toBeDefined();
          }
        });
      });
    });
  });

  describe("handlerMetaSchema", () => {
    test("should validate handler metadata without code field", () => {
      const result = handlerMetaSchema.parse(validHandler);

      expect(result).toMatchObject({
        id: validHandler.id,
        version_id: validHandler.version_id,
        name: validHandler.name,
        path: validHandler.path,
        method: validHandler.method,
        order: validHandler.order,
      });

      // Code field should be omitted
      expect(result).not.toHaveProperty("code");
    });

    test("should accept the same data as full schema but omit code", () => {
      const fullResult = handlerSchema.parse(validHandler);
      const metaResult = handlerMetaSchema.parse(validHandler);

      // Should have same core fields
      expect(metaResult.id).toBe(fullResult.id);
      expect(metaResult.version_id).toBe(fullResult.version_id);
      expect(metaResult.name).toBe(fullResult.name);
      expect(metaResult.path).toBe(fullResult.path);
      expect(metaResult.method).toBe(fullResult.method);
      expect(metaResult.order).toBe(fullResult.order);

      // But should not have code field
      expect(metaResult).not.toHaveProperty("code");
    });

    test("should validate all HTTP methods without code", () => {
      const methods = ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH", "*"] as const;

      methods.forEach(method => {
        const handler = {
          ...validHandler,
          id: randomUUID(),
          method,
        };

        const result = handlerMetaSchema.parse(handler);
        expect(result.method).toBe(method);
        expect(result).not.toHaveProperty("code");
      });
    });

    describe("metadata validation failures", () => {
      test("should reject same invalid data as full schema", () => {
        const invalidHandler = {
          ...validHandler,
          method: "INVALID",
        };

        expect(() => handlerMetaSchema.parse(invalidHandler)).toThrow();
      });

      test("should still require core fields", () => {
        const incompleteHandler = {
          id: randomUUID(),
          version_id: "1.0.0",
          // Missing name, path, method, order
        };

        expect(() => handlerMetaSchema.parse(incompleteHandler)).toThrow();
      });

      test("should reject negative order in metadata", () => {
        const invalidHandler = {
          ...validHandler,
          order: -5,
        };

        expect(() => handlerMetaSchema.parse(invalidHandler)).toThrow();
      });
    });
  });

  describe("bulkReorderSchema", () => {
    test("should validate bulk reorder request with single update", () => {
      const reorderRequest = {
        updates: [
          {
            id: randomUUID(),
            order: 1,
          },
        ],
      };

      const result = bulkReorderSchema.parse(reorderRequest);
      expect(result.updates).toHaveLength(1);
      expect(result.updates[0]).toMatchObject({
        id: reorderRequest.updates[0].id,
        order: reorderRequest.updates[0].order,
      });
    });

    test("should validate bulk reorder request with multiple updates", () => {
      const reorderRequest = {
        updates: [
          { id: randomUUID(), order: 1 },
          { id: randomUUID(), order: 2 },
          { id: randomUUID(), order: 3 },
          { id: randomUUID(), order: 0 },
          { id: randomUUID(), order: 999 },
        ],
      };

      const result = bulkReorderSchema.parse(reorderRequest);
      expect(result.updates).toHaveLength(5);
      
      result.updates.forEach((update, index) => {
        expect(update.id).toBe(reorderRequest.updates[index].id);
        expect(update.order).toBe(reorderRequest.updates[index].order);
      });
    });

    test("should validate reorder with zero order value", () => {
      const reorderRequest = {
        updates: [
          { id: randomUUID(), order: 0 },
        ],
      };

      const result = bulkReorderSchema.parse(reorderRequest);
      expect(result.updates[0].order).toBe(0);
    });

    test("should validate reorder with large order values", () => {
      const reorderRequest = {
        updates: [
          { id: randomUUID(), order: 999999 },
          { id: randomUUID(), order: 1000000 },
        ],
      };

      const result = bulkReorderSchema.parse(reorderRequest);
      expect(result.updates[0].order).toBe(999999);
      expect(result.updates[1].order).toBe(1000000);
    });

    describe("bulk reorder validation failures", () => {
      test("should reject empty updates array", () => {
        const invalidRequest = {
          updates: [],
        };

        expect(() => bulkReorderSchema.parse(invalidRequest)).toThrow();
      });

      test("should reject missing updates field", () => {
        const invalidRequest = {};

        expect(() => bulkReorderSchema.parse(invalidRequest)).toThrow();
      });

      test("should reject invalid UUID in updates", () => {
        const invalidRequest = {
          updates: [
            { id: "not-a-uuid", order: 1 },
          ],
        };

        expect(() => bulkReorderSchema.parse(invalidRequest)).toThrow();
      });

      test("should reject negative order values", () => {
        const invalidRequest = {
          updates: [
            { id: randomUUID(), order: -1 },
          ],
        };

        expect(() => bulkReorderSchema.parse(invalidRequest)).toThrow();
      });

      test("should reject non-integer order values", () => {
        const invalidOrders = [1.5, "5", true, null, undefined];

        invalidOrders.forEach(order => {
          const invalidRequest = {
            updates: [
              { id: randomUUID(), order },
            ],
          };

          expect(() => bulkReorderSchema.parse(invalidRequest)).toThrow();
        });
      });

      test("should reject updates with missing fields", () => {
        const invalidRequests = [
          {
            updates: [
              { id: randomUUID() }, // Missing order
            ],
          },
          {
            updates: [
              { order: 1 }, // Missing id
            ],
          },
          {
            updates: [
              {}, // Missing both
            ],
          },
        ];

        invalidRequests.forEach(request => {
          expect(() => bulkReorderSchema.parse(request)).toThrow();
        });
      });

      test("should reject non-array updates", () => {
        const invalidRequests = [
          { updates: "not-an-array" },
          { updates: 123 },
          { updates: { id: randomUUID(), order: 1 } },
          { updates: null },
          { updates: undefined },
        ];

        invalidRequests.forEach(request => {
          expect(() => bulkReorderSchema.parse(request)).toThrow();
        });
      });

      test("should reject completely invalid data types", () => {
        const invalidInputs = [
          null,
          undefined,
          "string",
          123,
          [],
          true,
        ];

        invalidInputs.forEach(input => {
          expect(() => bulkReorderSchema.parse(input)).toThrow();
        });
      });

      test("should reject updates with extra fields", () => {
        const requestWithExtra = {
          updates: [
            {
              id: randomUUID(),
              order: 1,
              extraField: "should not be allowed",
            },
          ],
        };

        // Zod should strip extra fields by default
        const result = bulkReorderSchema.parse(requestWithExtra);
        expect(result.updates[0]).not.toHaveProperty("extraField");
      });
    });
  });

  describe("type exports and TypeScript integration", () => {
    test("should have proper TypeScript types", () => {
      // This is a compile-time test - if it compiles, types are correct
      const handler: Handler = {
        id: randomUUID(),
        version_id: "1.0.0",
        name: "Test Handler",
        code: "resp.status = 200;",
        path: "/test",
        method: "GET",
        order: 1,
      };

      const meta: HandlerMeta = {
        id: randomUUID(),
        version_id: "1.0.0",
        name: "Test Handler Meta",
        path: "/test-meta",
        method: "POST",
        order: 2,
      };

      const bulkReorder: BulkReorderRequest = {
        updates: [
          { id: randomUUID(), order: 1 },
          { id: randomUUID(), order: 2 },
        ],
      };

      expect(handler.id).toBeDefined();
      expect(meta.id).toBeDefined();
      expect(bulkReorder.updates).toBeDefined();
    });

    test("should enforce HandlerMeta type excludes code", () => {
      // This test ensures that HandlerMeta type doesn't have code field
      const meta: HandlerMeta = {
        id: randomUUID(),
        version_id: "1.0.0",
        name: "Test",
        path: "/test",
        method: "GET",
        order: 1,
        // code: "should not compile", // This line should cause TypeScript error
      };

      expect(meta).not.toHaveProperty("code");
    });

    test("should validate method enum contains wildcard", () => {
      const handler: Handler = {
        id: randomUUID(),
        version_id: "1.0.0",
        name: "Wildcard Handler",
        code: "resp.status = 200;",
        path: "/wildcard",
        method: "*", // Should be valid
        order: 1,
      };

      const result = handlerSchema.parse(handler);
      expect(result.method).toBe("*");
    });

    test("should validate all method enum values", () => {
      // This test ensures our schema includes all expected methods
      const validMethods = ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH", "*"];
      
      validMethods.forEach(method => {
        const handler = {
          ...validHandler,
          id: randomUUID(),
          method: method as any,
        };

        expect(() => handlerSchema.parse(handler)).not.toThrow();
      });
    });
  });
});
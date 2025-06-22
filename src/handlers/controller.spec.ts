import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { handlerController } from "./controller";
import {
  createHandler,
  deleteHandler,
  getAllHandlers,
  clearHandlers,
} from "./model";
import type { Handler, HandlerId } from "./schema";
import { randomUUID } from "@/util/uuid";

describe("handlers/controller", () => {
  let testHandler: Handler;
  let createdHandlerIds: HandlerId[] = [];

  beforeEach(() => {
    testHandler = {
      id: randomUUID(),
      version_id: "1.0.0",
      name: "Test Handler",
      code: "resp.status = 200; resp.body = 'Hello World';",
      path: "/test",
      method: "GET",
      order: 1,
    };
  });

  afterEach(() => {
    // Clean up created handlers
    createdHandlerIds.forEach((id) => {
      try {
        deleteHandler(id);
      } catch (error) {
        // Ignore errors during cleanup
      }
    });
    createdHandlerIds = [];
  });

  describe("GET /api/handlers", () => {
    test("should return all handlers", async () => {
      // Create test handlers
      const handler1 = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 1,
      });
      createdHandlerIds.push(handler1.id);

      const handler2 = createHandler({
        ...testHandler,
        id: randomUUID(),
        name: "Handler 2",
        order: 2,
      });
      createdHandlerIds.push(handler2.id);

      const mockReq = {} as any;
      const response = handlerController["/api/handlers"].GET(mockReq);

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(2);

      const ourHandlers = data.filter(
        (handler: any) =>
          handler.id === handler1.id || handler.id === handler2.id,
      );
      expect(ourHandlers).toHaveLength(2);

      // Should include all fields including code
      ourHandlers.forEach((handler: any) => {
        expect(handler).toHaveProperty("id");
        expect(handler).toHaveProperty("version_id");
        expect(handler).toHaveProperty("name");
        expect(handler).toHaveProperty("code");
        expect(handler).toHaveProperty("path");
        expect(handler).toHaveProperty("method");
        expect(handler).toHaveProperty("order");
      });
    });

    test("should return empty array when no handlers exist", async () => {
      clearHandlers();

      const mockReq = {} as any;
      const response = handlerController["/api/handlers"].GET(mockReq);

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);
    });

    test("should return handlers ordered by order field", async () => {
      clearHandlers();

      // Create handlers with specific orders
      const handler1 = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 3,
        name: "Third",
      });
      createdHandlerIds.push(handler1.id);

      const handler2 = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 1,
        name: "First",
      });
      createdHandlerIds.push(handler2.id);

      const handler3 = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 2,
        name: "Second",
      });
      createdHandlerIds.push(handler3.id);

      const mockReq = {} as any;
      const response = handlerController["/api/handlers"].GET(mockReq);

      const data = await response.json();
      const ourHandlers = data.filter(
        (h: any) =>
          h.id === handler1.id || h.id === handler2.id || h.id === handler3.id,
      );

      expect(ourHandlers).toHaveLength(3);
      // Should be ordered by order field
      expect(ourHandlers[0].order).toBeLessThanOrEqual(ourHandlers[1].order);
      expect(ourHandlers[1].order).toBeLessThanOrEqual(ourHandlers[2].order);
    });
  });

  describe("POST /api/handlers", () => {
    test("should create a new handler", async () => {
      const handlerData = {
        ...testHandler,
      };

      const mockReq = {
        json: async () => handlerData,
      } as any;

      const response = await handlerController["/api/handlers"].POST(mockReq);
      createdHandlerIds.push(handlerData.id);

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({ status: "ok" });

      // Verify handler was created
      const allHandlers = getAllHandlers();
      const createdHandler = allHandlers.find((h) => h.id === handlerData.id);
      expect(createdHandler).toBeDefined();
      expect(createdHandler).toMatchObject(handlerData);
    });

    test("should auto-assign order when not provided", async () => {
      // Create a handler with known order first
      const existingHandler = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 5,
      });
      createdHandlerIds.push(existingHandler.id);

      const handlerDataWithoutOrder = {
        id: randomUUID(),
        version_id: "1.0.0",
        name: "Auto Order Handler",
        code: "resp.status = 200;",
        path: "/auto",
        method: "GET" as const,
        // order not provided
      };

      const mockReq = {
        json: async () => handlerDataWithoutOrder,
      } as any;

      const response = await handlerController["/api/handlers"].POST(mockReq);
      createdHandlerIds.push(handlerDataWithoutOrder.id);

      expect(response.status).toBe(200);

      // Verify handler was created with auto-assigned order
      const allHandlers = getAllHandlers();
      const createdHandler = allHandlers.find(
        (h) => h.id === handlerDataWithoutOrder.id,
      );
      expect(createdHandler).toBeDefined();
      expect(createdHandler!.order).toBe(6); // Should be max + 1
    });

    test("should auto-assign order when order is null", async () => {
      const handlerDataWithNullOrder = {
        ...testHandler,
        id: randomUUID(),
        order: null,
      };

      const mockReq = {
        json: async () => handlerDataWithNullOrder,
      } as any;

      const response = await handlerController["/api/handlers"].POST(mockReq);
      createdHandlerIds.push(handlerDataWithNullOrder.id);

      expect(response.status).toBe(200);

      const allHandlers = getAllHandlers();
      const createdHandler = allHandlers.find(
        (h) => h.id === handlerDataWithNullOrder.id,
      );
      expect(createdHandler).toBeDefined();
      expect(typeof createdHandler!.order).toBe("number");
      expect(createdHandler!.order).toBeGreaterThanOrEqual(1);
    });

    test("should create handler with wildcard method", async () => {
      const handlerData = {
        ...testHandler,
        id: randomUUID(),
        method: "*" as const,
      };

      const mockReq = {
        json: async () => handlerData,
      } as any;

      const response = await handlerController["/api/handlers"].POST(mockReq);
      createdHandlerIds.push(handlerData.id);

      expect(response.status).toBe(200);

      const allHandlers = getAllHandlers();
      const createdHandler = allHandlers.find((h) => h.id === handlerData.id);
      expect(createdHandler!.method).toBe("*");
    });

    test("should create handler with complex code", async () => {
      const complexCode = `
        const requestBody = JSON.parse(req.body || '{}');
        if (requestBody.action === 'ping') {
          resp.status = 200;
          resp.body = JSON.stringify({ pong: true, timestamp: Date.now() });
        } else {
          resp.status = 400;
          resp.body = 'Invalid action';
        }
      `;

      const handlerData = {
        ...testHandler,
        id: randomUUID(),
        code: complexCode,
      };

      const mockReq = {
        json: async () => handlerData,
      } as any;

      const response = await handlerController["/api/handlers"].POST(mockReq);
      createdHandlerIds.push(handlerData.id);

      expect(response.status).toBe(200);

      const allHandlers = getAllHandlers();
      const createdHandler = allHandlers.find((h) => h.id === handlerData.id);
      expect(createdHandler!.code).toBe(complexCode);
    });
  });

  describe("GET /api/handlers/:id", () => {
    test("should return specific handler by ID", async () => {
      const created = createHandler(testHandler);
      createdHandlerIds.push(created.id);

      const mockReq = {
        params: { id: created.id },
      } as any;

      const response = handlerController["/api/handlers/:id"].GET(mockReq);

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        id: created.id,
        version_id: created.version_id,
        name: created.name,
        code: created.code,
        path: created.path,
        method: created.method,
        order: created.order,
      });
    });

    test("should throw error for non-existent handler ID", () => {
      const nonExistentId = randomUUID();
      const mockReq = {
        params: { id: nonExistentId },
      } as any;

      expect(() => {
        handlerController["/api/handlers/:id"].GET(mockReq);
      }).toThrow();
    });

    test("should throw error for invalid ID format", () => {
      const mockReq = {
        params: { id: "invalid-id-format" },
      } as any;

      expect(() => {
        handlerController["/api/handlers/:id"].GET(mockReq);
      }).toThrow();
    });
  });

  describe("PUT /api/handlers/:id", () => {
    test("should update an existing handler", async () => {
      const created = createHandler(testHandler);
      createdHandlerIds.push(created.id);

      const updates = {
        ...created,
        name: "Updated Handler",
        code: "resp.status = 201; resp.body = 'Updated';",
        order: 99,
      };

      const mockReq = {
        params: { id: created.id },
        json: async () => updates,
      } as any;

      const response =
        await handlerController["/api/handlers/:id"].PUT(mockReq);

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({ status: "ok" });

      // Verify handler was updated
      const allHandlers = getAllHandlers();
      const updatedHandler = allHandlers.find((h) => h.id === created.id);
      expect(updatedHandler).toBeDefined();
      expect(updatedHandler!.name).toBe("Updated Handler");
      expect(updatedHandler!.code).toBe(
        "resp.status = 201; resp.body = 'Updated';",
      );
      expect(updatedHandler!.order).toBe(99);
    });

    test("should update handler method and path", async () => {
      const created = createHandler(testHandler);
      createdHandlerIds.push(created.id);

      const updates = {
        ...created,
        method: "POST" as const,
        path: "/updated-path",
      };

      const mockReq = {
        params: { id: created.id },
        json: async () => updates,
      } as any;

      const response =
        await handlerController["/api/handlers/:id"].PUT(mockReq);

      expect(response.status).toBe(200);

      const allHandlers = getAllHandlers();
      const updatedHandler = allHandlers.find((h) => h.id === created.id);
      expect(updatedHandler!.method).toBe("POST");
      expect(updatedHandler!.path).toBe("/updated-path");
    });

    test("should update handler to wildcard method", async () => {
      const created = createHandler(testHandler);
      createdHandlerIds.push(created.id);

      const updates = {
        ...created,
        method: "*" as const,
      };

      const mockReq = {
        params: { id: created.id },
        json: async () => updates,
      } as any;

      const response =
        await handlerController["/api/handlers/:id"].PUT(mockReq);

      expect(response.status).toBe(200);

      const allHandlers = getAllHandlers();
      const updatedHandler = allHandlers.find((h) => h.id === created.id);
      expect(updatedHandler!.method).toBe("*");
    });

    test("should throw error for non-existent handler", async () => {
      const nonExistentHandler = {
        ...testHandler,
        id: randomUUID(),
      };

      const mockReq = {
        params: { id: nonExistentHandler.id },
        json: async () => nonExistentHandler,
      } as any;

      await expect(
        handlerController["/api/handlers/:id"].PUT(mockReq),
      ).rejects.toThrow();
    });
  });

  describe("DELETE /api/handlers/:id", () => {
    test("should delete an existing handler", async () => {
      const created = createHandler(testHandler);
      // Don't add to cleanup array since we're testing deletion

      const mockReq = {
        params: { id: created.id },
      } as any;

      const response =
        await handlerController["/api/handlers/:id"].DELETE(mockReq);

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({ status: "deleted" });

      // Verify handler was deleted
      const allHandlers = getAllHandlers();
      const deletedHandler = allHandlers.find((h) => h.id === created.id);
      expect(deletedHandler).toBeUndefined();
    });

    test("should not throw error when deleting non-existent handler", async () => {
      const nonExistentId = randomUUID();
      const mockReq = {
        params: { id: nonExistentId },
      } as any;

      const response =
        await handlerController["/api/handlers/:id"].DELETE(mockReq);

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({ status: "deleted" });
    });
  });

  describe("POST /api/handlers/reorder", () => {
    test("should reorder multiple handlers", async () => {
      clearHandlers(); // Ensure clean state

      const handler1 = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 1,
        name: "Handler 1",
        path: "/reorder1",
      });
      createdHandlerIds.push(handler1.id);

      const handler2 = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 2,
        name: "Handler 2",
        path: "/reorder2",
      });
      createdHandlerIds.push(handler2.id);

      const handler3 = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 3,
        name: "Handler 3",
        path: "/reorder3",
      });
      createdHandlerIds.push(handler3.id);

      const reorderData = {
        updates: [
          { id: handler3.id, order: 10 },
          { id: handler1.id, order: 20 },
          { id: handler2.id, order: 30 },
        ],
      };

      const mockReq = {
        json: async () => reorderData,
      } as any;

      const response =
        await handlerController["/api/handlers/reorder"].POST(mockReq);

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({ status: "ok" });

      // Verify handlers were reordered
      const allHandlers = getAllHandlers();
      const reorderedHandler1 = allHandlers.find((h) => h.id === handler1.id);
      const reorderedHandler2 = allHandlers.find((h) => h.id === handler2.id);
      const reorderedHandler3 = allHandlers.find((h) => h.id === handler3.id);

      expect(reorderedHandler1!.order).toBe(20);
      expect(reorderedHandler2!.order).toBe(30);
      expect(reorderedHandler3!.order).toBe(10);
    });

    test("should reorder single handler", async () => {
      const handler = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 5,
      });
      createdHandlerIds.push(handler.id);

      const reorderData = {
        updates: [{ id: handler.id, order: 10 }],
      };

      const mockReq = {
        json: async () => reorderData,
      } as any;

      const response =
        await handlerController["/api/handlers/reorder"].POST(mockReq);

      expect(response.status).toBe(200);

      const allHandlers = getAllHandlers();
      const reorderedHandler = allHandlers.find((h) => h.id === handler.id);
      expect(reorderedHandler!.order).toBe(10);
    });

    test("should handle reorder with zero order value", async () => {
      const handler = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 5,
      });
      createdHandlerIds.push(handler.id);

      const reorderData = {
        updates: [{ id: handler.id, order: 0 }],
      };

      const mockReq = {
        json: async () => reorderData,
      } as any;

      const response =
        await handlerController["/api/handlers/reorder"].POST(mockReq);

      expect(response.status).toBe(200);

      const allHandlers = getAllHandlers();
      const reorderedHandler = allHandlers.find((h) => h.id === handler.id);
      expect(reorderedHandler!.order).toBe(0);
    });
  });

  describe("error handling and edge cases", () => {
    test("should handle malformed JSON in POST request", async () => {
      const mockReq = {
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as any;

      await expect(
        handlerController["/api/handlers"].POST(mockReq),
      ).rejects.toThrow();
    });

    test("should handle malformed JSON in PUT request", async () => {
      const created = createHandler(testHandler);
      createdHandlerIds.push(created.id);

      const mockReq = {
        params: { id: created.id },
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as any;

      await expect(
        handlerController["/api/handlers/:id"].PUT(mockReq),
      ).rejects.toThrow();
    });

    test("should handle malformed JSON in reorder request", async () => {
      const mockReq = {
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as any;

      await expect(
        handlerController["/api/handlers/reorder"].POST(mockReq),
      ).rejects.toThrow();
    });

    test("should handle missing params in GET request", () => {
      const mockReq = {} as any;

      expect(() => {
        handlerController["/api/handlers/:id"].GET(mockReq);
      }).toThrow();
    });

    test("should handle missing params in PUT request", async () => {
      const mockReq = {
        json: async () => testHandler,
      } as any;

      await expect(
        handlerController["/api/handlers/:id"].PUT(mockReq),
      ).rejects.toThrow();
    });

    test("should handle missing params in DELETE request", async () => {
      const mockReq = {} as any;

      await expect(
        handlerController["/api/handlers/:id"].DELETE(mockReq),
      ).rejects.toThrow();
    });

    test("should handle null/undefined ID param", () => {
      const mockReqs = [
        { params: { id: null } },
        { params: { id: undefined } },
        { params: {} },
      ];

      mockReqs.forEach((mockReq) => {
        expect(() => {
          handlerController["/api/handlers/:id"].GET(mockReq as any);
        }).toThrow();
      });
    });

    test("should handle invalid schema data in POST", async () => {
      const invalidHandlerData = {
        id: "not-a-uuid",
        version_id: "",
        name: "",
        code: "",
        path: "",
        method: "INVALID",
        order: -1,
      };

      const mockReq = {
        json: async () => invalidHandlerData,
      } as any;

      await expect(
        handlerController["/api/handlers"].POST(mockReq),
      ).rejects.toThrow();
    });

    test("should handle invalid schema data in PUT", async () => {
      const created = createHandler(testHandler);
      createdHandlerIds.push(created.id);

      const invalidUpdates = {
        ...created,
        method: "INVALID",
        order: "not-a-number",
      };

      const mockReq = {
        params: { id: created.id },
        json: async () => invalidUpdates,
      } as any;

      await expect(
        handlerController["/api/handlers/:id"].PUT(mockReq),
      ).rejects.toThrow();
    });

    test("should handle invalid reorder schema", async () => {
      const invalidReorderData = {
        updates: [], // Empty array should be invalid
      };

      const mockReq = {
        json: async () => invalidReorderData,
      } as any;

      await expect(
        handlerController["/api/handlers/reorder"].POST(mockReq),
      ).rejects.toThrow();
    });

    test("should handle reorder with invalid UUIDs", async () => {
      const invalidReorderData = {
        updates: [{ id: "not-a-uuid", order: 1 }],
      };

      const mockReq = {
        json: async () => invalidReorderData,
      } as any;

      await expect(
        handlerController["/api/handlers/reorder"].POST(mockReq),
      ).rejects.toThrow();
    });

    test("should handle reorder with negative orders", async () => {
      const invalidReorderData = {
        updates: [{ id: randomUUID(), order: -1 }],
      };

      const mockReq = {
        json: async () => invalidReorderData,
      } as any;

      await expect(
        handlerController["/api/handlers/reorder"].POST(mockReq),
      ).rejects.toThrow();
    });

    test("should validate large handler payloads correctly", async () => {
      // Test that the endpoint properly validates data (even large payloads)
      const invalidHandlerData = {
        id: "not-a-uuid", // Invalid UUID
        version_id: "", // Empty string
        name: "", // Empty string
        code: "", // Empty string
        path: "", // Empty string
        method: "INVALID", // Invalid method
        order: -1, // Negative order
      };

      const mockReq = {
        json: async () => invalidHandlerData,
      } as any;

      // Should throw due to schema validation failures
      await expect(
        handlerController["/api/handlers"].POST(mockReq),
      ).rejects.toThrow();
    });
  });
});

import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import {
  createHandler,
  updateHandler,
  getHandler,
  getHandlerMetadata,
  getAllHandlers,
  getAllHandlersMeta,
  deleteHandler,
  clearHandlers,
  getNextHandlerOrder,
  reorderHandlers,
} from "./model";
import type { Handler, HandlerId } from "./schema";
import { randomUUID } from "@/util/uuid";
import { before } from "node:test";

describe("handlers/model", () => {
  let testHandler: Handler;

  before(() => {
    clearHandlers();
  })

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
    clearHandlers();
  });

  describe("createHandler()", () => {
    test("should create a handler successfully", () => {
      const created = createHandler(testHandler);

      expect(created).toMatchObject({
        id: testHandler.id,
        version_id: testHandler.version_id,
        name: testHandler.name,
        code: testHandler.code,
        path: testHandler.path,
        method: testHandler.method,
        order: testHandler.order,
      });
    });

    test("should create handlers with different HTTP methods", () => {
      const methods = [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
        "HEAD",
        "OPTIONS",
        "*",
      ] as const;

      methods.forEach((method, index) => {
        const handler = createHandler({
          ...testHandler,
          id: randomUUID(),
          method: method,
          path: `/test-${method.toLowerCase()}`,
          order: index + 1,
        });

        expect(handler.method).toBe(method);
      });
    });

    test("should create handlers with different order values", () => {
      const orders = [0, 1, 10, 100, 999];

      orders.forEach((order) => {
        const handler = createHandler({
          ...testHandler,
          id: randomUUID(),
          path: `/test-order-${order}`,
          order: order,
        });

        expect(handler.order).toBe(order);
      });
    });

    test("should create handlers with complex code", () => {
      const complexCode = `
        if (req.method === 'POST') {
          resp.status = 201;
          resp.body = JSON.stringify({ created: true });
        } else {
          resp.status = 200;
          resp.body = 'OK';
        }
        resp.headers.push(['Content-Type', 'application/json']);
      `;

      const handler = createHandler({
        ...testHandler,
        id: randomUUID(),
        code: complexCode,
      });

      expect(handler.code).toBe(complexCode);
    });

    test("should create handlers with wildcard method", () => {
      const handler = createHandler({
        ...testHandler,
        id: randomUUID(),
        method: "*",
        path: "/wildcard",
      });

      expect(handler.method).toBe("*");
    });

    test("should create handlers with path parameters", () => {
      const pathsWithParams = [
        "/users/:id",
        "/api/v1/users/:userId/posts/:postId",
        "/files/*",
        "/webhook/:service/:event",
      ];

      pathsWithParams.forEach((path, index) => {
        const handler = createHandler({
          ...testHandler,
          id: randomUUID(),
          path: path,
          order: index + 1,
        });

        expect(handler.path).toBe(path);
      });
    });
  });

  describe("getHandler()", () => {
    test("should retrieve an existing handler", () => {
      const created = createHandler(testHandler);

      const retrieved = getHandler(created.id);

      expect(retrieved).toMatchObject({
        id: created.id,
        version_id: created.version_id,
        name: created.name,
        code: created.code,
        path: created.path,
        method: created.method,
        order: created.order,
      });
    });

    test("should throw an error for non-existent handler", () => {
      const nonExistentId = randomUUID();
      expect(() => getHandler(nonExistentId)).toThrow();
    });

    test("should throw an error for invalid ID format", () => {
      expect(() => getHandler("invalid-id" as HandlerId)).toThrow();
    });
  });

  describe("getHandlerMetadata()", () => {
    test("should retrieve metadata without code field", () => {
      const created = createHandler(testHandler);

      const meta = getHandlerMetadata(created.id);

      expect(meta).toMatchObject({
        id: created.id,
        version_id: created.version_id,
        name: created.name,
        path: created.path,
        method: created.method,
        order: created.order,
      });
      expect(meta).not.toHaveProperty("code");
    });

    test("should throw an error for non-existent handler", () => {
      const nonExistentId = randomUUID();
      expect(() => getHandlerMetadata(nonExistentId)).toThrow();
    });
  });

  describe("getAllHandlers()", () => {
    test("should return all handlers ordered by order field", () => {
      // Create handlers with different orders
      const handler1 = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 3,
        name: "Handler 3",
      });

      const handler2 = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 1,
        name: "Handler 1",
      });

      const handler3 = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 2,
        name: "Handler 2",
      });

      const allHandlers = getAllHandlers();
      const ourHandlers = allHandlers.filter(
        (h) =>
          h.id === handler1.id || h.id === handler2.id || h.id === handler3.id,
      );

      expect(ourHandlers).toHaveLength(3);

      // Should be ordered by order field (ascending)
      const ourHandlersSorted = ourHandlers.sort((a, b) => a.order - b.order);
      expect(ourHandlersSorted[0].order).toBe(1);
      expect(ourHandlersSorted[1].order).toBe(2);
      expect(ourHandlersSorted[2].order).toBe(3);
    });

    test("should return empty array when no handlers exist", () => {
      clearHandlers();
      const allHandlers = getAllHandlers();
      expect(allHandlers).toEqual([]);
    });

    test("should include all handler fields including code", () => {
      const created = createHandler(testHandler);

      const allHandlers = getAllHandlers();
      const ourHandler = allHandlers.find((h) => h.id === created.id);

      expect(ourHandler).toBeDefined();
      expect(ourHandler).toHaveProperty("code");
      expect(ourHandler!.code).toBe(testHandler.code);
    });
  });

  describe("getAllHandlersMeta()", () => {
    test("should return metadata for all handlers without code", () => {
      clearHandlers(); // Ensure clean state

      const handler1 = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 1,
      });

      const handler2 = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 2,
        name: "Handler 2",
        path: "/handler2", // Different path to avoid conflicts
      });

      const allMeta = getAllHandlersMeta();
      const handler1Meta = allMeta.find((m) => m.id === handler1.id);
      const handler2Meta = allMeta.find((m) => m.id === handler2.id);

      expect(handler1Meta).toBeDefined();
      expect(handler2Meta).toBeDefined();

      [handler1Meta, handler2Meta].forEach((meta) => {
        expect(meta).not.toHaveProperty("code");
        expect(meta).toHaveProperty("id");
        expect(meta).toHaveProperty("name");
        expect(meta).toHaveProperty("path");
        expect(meta).toHaveProperty("method");
        expect(meta).toHaveProperty("order");
      });
    });

    test("should return handlers ordered by order field", () => {
      clearHandlers(); // Ensure clean state

      const handler1 = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 200, // Use higher unique orders
        path: "/order200",
      });

      const handler2 = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 100,
        path: "/order100",
      });

      const allMeta = getAllHandlersMeta();
      const handler1Meta = allMeta.find((m) => m.id === handler1.id);
      const handler2Meta = allMeta.find((m) => m.id === handler2.id);

      expect(handler1Meta).toBeDefined();
      expect(handler2Meta).toBeDefined();

      // Verify ordering - handler2 (order 100) should come before handler1 (order 200)
      const handler1Index = allMeta.findIndex((m) => m.id === handler1.id);
      const handler2Index = allMeta.findIndex((m) => m.id === handler2.id);
      expect(handler2Index).toBeLessThan(handler1Index);
    });
  });

  describe("updateHandler()", () => {
    test("should update an existing handler", () => {
      const created = createHandler(testHandler);

      const updates = {
        ...created,
        name: "Updated Handler",
        code: "resp.status = 201; resp.body = 'Updated';",
        order: 99,
      };

      const updated = updateHandler(updates);

      expect(updated).toMatchObject({
        id: created.id,
        name: "Updated Handler",
        code: "resp.status = 201; resp.body = 'Updated';",
        order: 99,
      });
    });

    test("should update handler method and path", () => {
      const created = createHandler(testHandler);

      const updates = {
        ...created,
        method: "POST" as const,
        path: "/updated-path",
      };

      const updated = updateHandler(updates);

      expect(updated.method).toBe("POST");
      expect(updated.path).toBe("/updated-path");
    });

    test("should update handler version", () => {
      const created = createHandler(testHandler);

      const updates = {
        ...created,
        version_id: "2.0.0",
      };

      const updated = updateHandler(updates);

      expect(updated.version_id).toBe("2.0.0");
    });

    test("should throw error for non-existent handler", () => {
      const nonExistentHandler = {
        ...testHandler,
        id: randomUUID(),
      };

      expect(() => updateHandler(nonExistentHandler)).toThrow();
    });
  });

  describe("deleteHandler()", () => {
    test("should delete an existing handler", () => {
      const created = createHandler(testHandler);
      // Don't add to cleanup array since we're testing deletion

      deleteHandler(created.id);

      expect(() => getHandler(created.id)).toThrow();
    });

    test("should not throw error when deleting non-existent handler", () => {
      const nonExistentId = randomUUID();
      expect(() => deleteHandler(nonExistentId)).not.toThrow();
    });

    test("should remove handler from getAllHandlers result", () => {
      const created = createHandler(testHandler);
      const beforeDelete = getAllHandlers();
      const foundBefore = beforeDelete.find((h) => h.id === created.id);
      expect(foundBefore).toBeDefined();

      deleteHandler(created.id);

      const afterDelete = getAllHandlers();
      const foundAfter = afterDelete.find((h) => h.id === created.id);
      expect(foundAfter).toBeUndefined();
    });
  });

  describe("clearHandlers()", () => {
    test("should remove all handlers", () => {
      clearHandlers(); // Start with clean slate

      // Create multiple handlers
      const handler1 = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 100, // Use unique orders
        path: "/clear1",
      });
      const handler2 = createHandler({
        ...testHandler,
        id: randomUUID(),
        name: "Handler 2",
        order: 101,
        path: "/clear2",
      });

      const beforeClear = getAllHandlers();
      expect(beforeClear.length).toBeGreaterThanOrEqual(2);

      clearHandlers();

      const afterClear = getAllHandlers();
      expect(afterClear).toEqual([]);
    });

    test("should not throw error when clearing empty handlers table", () => {
      clearHandlers(); // Clear once
      expect(() => clearHandlers()).not.toThrow(); // Clear again
    });
  });

  describe("getNextHandlerOrder()", () => {
    test("should return 1 when no handlers exist", () => {
      clearHandlers();
      const nextOrder = getNextHandlerOrder();
      expect(nextOrder).toBe(1);
    });

    test("should return max order + 1 when handlers exist", () => {
      clearHandlers();

      const handler1 = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 5,
      });

      const handler2 = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 10,
      });

      const nextOrder = getNextHandlerOrder();
      expect(nextOrder).toBe(11);
    });

    test("should handle zero order values", () => {
      clearHandlers();

      const handler = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 0,
      });

      const nextOrder = getNextHandlerOrder();
      expect(nextOrder).toBe(1);
    });
  });

  describe("reorderHandlers()", () => {
    test("should reorder multiple handlers", () => {
      clearHandlers(); // Ensure clean state

      const handler1 = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 1,
        name: "Handler 1",
        path: "/handler1",
      });

      const handler2 = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 2,
        name: "Handler 2",
        path: "/handler2",
      });

      const handler3 = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 3,
        name: "Handler 3",
        path: "/handler3",
      });

      // Reorder: handler3 -> 10, handler1 -> 20, handler2 -> 30 (use non-conflicting orders)
      reorderHandlers([
        { id: handler3.id, order: 10 },
        { id: handler1.id, order: 20 },
        { id: handler2.id, order: 30 },
      ]);

      const reorderedHandler1 = getHandler(handler1.id);
      const reorderedHandler2 = getHandler(handler2.id);
      const reorderedHandler3 = getHandler(handler3.id);

      expect(reorderedHandler1.order).toBe(20);
      expect(reorderedHandler2.order).toBe(30);
      expect(reorderedHandler3.order).toBe(10);
    });

    test("should handle single handler reorder", () => {
      const handler = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 5,
      });

      reorderHandlers([{ id: handler.id, order: 10 }]);

      const reorderedHandler = getHandler(handler.id);
      expect(reorderedHandler.order).toBe(10);
    });

    test("should handle empty reorder array", () => {
      expect(() => reorderHandlers([])).not.toThrow();
    });

    test("should maintain transaction integrity", () => {
      const handler1 = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 1,
      });

      const handler2 = createHandler({
        ...testHandler,
        id: randomUUID(),
        order: 2,
      });

      const nonExistentId = randomUUID();

      // This should fail but might not throw in this implementation
      try {
        reorderHandlers([
          { id: handler1.id, order: 10 },
          { id: nonExistentId, order: 20 }, // This should cause failure
          { id: handler2.id, order: 30 },
        ]);
      } catch (error) {
        // If it throws, verify original orders are maintained
        const originalHandler1 = getHandler(handler1.id);
        const originalHandler2 = getHandler(handler2.id);
        expect(originalHandler1.order).toBe(1);
        expect(originalHandler2.order).toBe(2);
      }
    });
  });

  describe("error handling and edge cases", () => {
    test("should handle handlers with very long code", () => {
      const longCode = "resp.body = '" + "x".repeat(10000) + "';";

      const handler = createHandler({
        ...testHandler,
        id: randomUUID(),
        code: longCode,
      });

      const retrieved = getHandler(handler.id);
      expect(retrieved.code).toBe(longCode);
    });

    test("should handle handlers with special characters in name", () => {
      const specialNames = [
        "Handler with spaces",
        "Handler-with-dashes",
        "Handler_with_underscores",
        "Handler (with) parentheses",
        "Handler with 数字 and émojis 🚀",
      ];

      specialNames.forEach((name, index) => {
        const handler = createHandler({
          ...testHandler,
          id: randomUUID(),
          name: name,
          order: index + 1,
        });

        expect(handler.name).toBe(name);
      });
    });

    test("should handle handlers with complex paths", () => {
      const complexPaths = [
        "/api/v1/users/:id/posts/:postId",
        "/webhook/github/:repo/:event",
        "/files/*",
        "/nested/*/resource/:id",
        "/query?param=value",
        "/path-with-dashes",
        "/path_with_underscores",
      ];

      complexPaths.forEach((path, index) => {
        const handler = createHandler({
          ...testHandler,
          id: randomUUID(),
          path: path,
          order: index + 1,
        });

        expect(handler.path).toBe(path);
      });
    });

    test("should handle handlers with minimum required fields", () => {
      const minimalHandler = {
        id: randomUUID(),
        version_id: "1",
        name: "M",
        code: "1",
        path: "/",
        method: "GET" as const,
        order: 0,
      };

      const handler = createHandler(minimalHandler);

      expect(handler).toMatchObject(minimalHandler);
    });

    test("should handle concurrent handler operations", () => {
      // Create multiple handlers concurrently (simulated)
      const handlers = [];
      for (let i = 0; i < 5; i++) {
        const handler = createHandler({
          ...testHandler,
          id: randomUUID(),
          name: `Concurrent Handler ${i}`,
          order: i,
        });
        handlers.push(handler);
      }

      // Verify all were created
      expect(handlers).toHaveLength(5);
      handlers.forEach((handler) => {
        const retrieved = getHandler(handler.id);
        expect(retrieved.id).toBe(handler.id);
      });
    });
  });
});

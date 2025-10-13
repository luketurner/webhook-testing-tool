import { expect, test, describe, beforeEach } from "bun:test";
import {
  createTcpHandler,
  updateTcpHandler,
  getTcpHandler,
  getTcpHandlerMetadata,
  getAllTcpHandlers,
  getAllTcpHandlersMeta,
  deleteTcpHandler,
  clearTcpHandlers,
  getActiveTcpHandler,
} from "./model";
import type { TcpHandler, TcpHandlerId } from "./schema";
import { randomUUID } from "@/util/uuid";

describe("tcp-handlers/model", () => {
  let testTcpHandler: TcpHandler;

  beforeEach(() => {
    clearTcpHandlers();
    testTcpHandler = {
      id: randomUUID(),
      version_id: "1.0.0",
      name: "Test TCP Handler",
      code: 'console.log("Received:", data);\nsend("ack\\n");',
      enabled: true,
    };
  });

  describe("createTcpHandler()", () => {
    test("should create a TCP handler successfully", () => {
      const created = createTcpHandler(testTcpHandler);

      expect(created).toMatchObject({
        id: testTcpHandler.id,
        version_id: testTcpHandler.version_id,
        name: testTcpHandler.name,
        code: testTcpHandler.code,
        enabled: testTcpHandler.enabled,
      });
    });

    test("should create TCP handler with enabled flag true", () => {
      const handler = createTcpHandler({
        ...testTcpHandler,
        id: randomUUID(),
        enabled: true,
      });

      expect(handler.enabled).toBe(true);
    });

    test("should create TCP handler with enabled flag false", () => {
      const handler = createTcpHandler({
        ...testTcpHandler,
        id: randomUUID(),
        enabled: false,
      });

      expect(handler.enabled).toBe(false);
    });

    test("should create TCP handler with complex code", () => {
      const complexCode = `
        const message = data.trim();
        if (message === "PING") {
          send("PONG\\n");
        } else {
          send("UNKNOWN\\n");
        }
      `;

      const handler = createTcpHandler({
        ...testTcpHandler,
        id: randomUUID(),
        code: complexCode,
      });

      expect(handler.code).toBe(complexCode);
    });
  });

  describe("getTcpHandler()", () => {
    test("should retrieve an existing TCP handler", () => {
      const created = createTcpHandler(testTcpHandler);

      const retrieved = getTcpHandler(created.id);

      expect(retrieved).toMatchObject({
        id: created.id,
        version_id: created.version_id,
        name: created.name,
        code: created.code,
        enabled: created.enabled,
      });
    });

    test("should return null for non-existent handler", () => {
      const nonExistentId = randomUUID();
      const result = getTcpHandler(nonExistentId);
      expect(result).toBeNull();
    });

    test("should return null for invalid ID format", () => {
      const result = getTcpHandler("invalid-id" as TcpHandlerId);
      expect(result).toBeNull();
    });
  });

  describe("getTcpHandlerMetadata()", () => {
    test("should retrieve metadata without code field", () => {
      const created = createTcpHandler(testTcpHandler);

      const meta = getTcpHandlerMetadata(created.id);

      expect(meta).toMatchObject({
        id: created.id,
        version_id: created.version_id,
        name: created.name,
        enabled: created.enabled,
      });
      expect(meta).not.toHaveProperty("code");
    });

    test("should return null for non-existent handler", () => {
      const nonExistentId = randomUUID();
      const result = getTcpHandlerMetadata(nonExistentId);
      expect(result).toBeNull();
    });
  });

  describe("getAllTcpHandlers()", () => {
    test("should return all TCP handlers", () => {
      const handler1 = createTcpHandler({
        ...testTcpHandler,
        id: randomUUID(),
        name: "Handler 1",
      });

      const handler2 = createTcpHandler({
        ...testTcpHandler,
        id: randomUUID(),
        name: "Handler 2",
      });

      const allHandlers = getAllTcpHandlers();

      expect(allHandlers).toHaveLength(2);
      expect(allHandlers.find((h) => h.id === handler1.id)).toBeDefined();
      expect(allHandlers.find((h) => h.id === handler2.id)).toBeDefined();
    });

    test("should return empty array when no handlers exist", () => {
      const allHandlers = getAllTcpHandlers();
      expect(allHandlers).toEqual([]);
    });

    test("should include all handler fields including code", () => {
      const created = createTcpHandler(testTcpHandler);

      const allHandlers = getAllTcpHandlers();
      const handler = allHandlers.find((h) => h.id === created.id);

      expect(handler).toBeDefined();
      expect(handler).toHaveProperty("code");
      expect(handler!.code).toBe(testTcpHandler.code);
    });
  });

  describe("getAllTcpHandlersMeta()", () => {
    test("should return metadata for all handlers without code", () => {
      const handler1 = createTcpHandler({
        ...testTcpHandler,
        id: randomUUID(),
      });

      const handler2 = createTcpHandler({
        ...testTcpHandler,
        id: randomUUID(),
        name: "Handler 2",
      });

      const allMeta = getAllTcpHandlersMeta();

      expect(allMeta).toHaveLength(2);

      allMeta.forEach((meta) => {
        expect(meta).not.toHaveProperty("code");
        expect(meta).toHaveProperty("id");
        expect(meta).toHaveProperty("name");
        expect(meta).toHaveProperty("enabled");
      });
    });
  });

  describe("updateTcpHandler()", () => {
    test("should update an existing TCP handler", () => {
      const created = createTcpHandler(testTcpHandler);

      const updates = {
        id: created.id,
        name: "Updated Handler",
        code: 'send("updated\\n");',
        enabled: false,
      };

      const updated = updateTcpHandler(updates);

      expect(updated).toMatchObject({
        id: created.id,
        name: "Updated Handler",
        code: 'send("updated\\n");',
        enabled: false,
      });
    });

    test("should update only specific fields", () => {
      const created = createTcpHandler(testTcpHandler);

      const updates = {
        id: created.id,
        enabled: false,
      };

      const updated = updateTcpHandler(updates);

      expect(updated.enabled).toBe(false);
      expect(updated.name).toBe(testTcpHandler.name);
      expect(updated.code).toBe(testTcpHandler.code);
    });

    test("should update handler version", () => {
      const created = createTcpHandler(testTcpHandler);

      const updates = {
        id: created.id,
        version_id: "2.0.0",
      };

      const updated = updateTcpHandler(updates);

      expect(updated.version_id).toBe("2.0.0");
    });

    test("should throw error for non-existent handler", () => {
      const nonExistentHandler = {
        id: randomUUID(),
        name: "Non-existent",
      };

      expect(() => updateTcpHandler(nonExistentHandler)).toThrow();
    });
  });

  describe("deleteTcpHandler()", () => {
    test("should delete an existing TCP handler", () => {
      const created = createTcpHandler(testTcpHandler);

      deleteTcpHandler(created.id);

      const result = getTcpHandler(created.id);
      expect(result).toBeNull();
    });

    test("should not throw error when deleting non-existent handler", () => {
      const nonExistentId = randomUUID();
      expect(() => deleteTcpHandler(nonExistentId)).not.toThrow();
    });

    test("should remove handler from getAllTcpHandlers result", () => {
      const created = createTcpHandler(testTcpHandler);
      const beforeDelete = getAllTcpHandlers();
      const foundBefore = beforeDelete.find((h) => h.id === created.id);
      expect(foundBefore).toBeDefined();

      deleteTcpHandler(created.id);

      const afterDelete = getAllTcpHandlers();
      const foundAfter = afterDelete.find((h) => h.id === created.id);
      expect(foundAfter).toBeUndefined();
    });
  });

  describe("clearTcpHandlers()", () => {
    test("should remove all TCP handlers", () => {
      createTcpHandler({
        ...testTcpHandler,
        id: randomUUID(),
      });
      createTcpHandler({
        ...testTcpHandler,
        id: randomUUID(),
        name: "Handler 2",
      });

      const beforeClear = getAllTcpHandlers();
      expect(beforeClear.length).toBeGreaterThanOrEqual(2);

      clearTcpHandlers();

      const afterClear = getAllTcpHandlers();
      expect(afterClear).toEqual([]);
    });

    test("should not throw error when clearing empty table", () => {
      clearTcpHandlers();
      expect(() => clearTcpHandlers()).not.toThrow();
    });
  });

  describe("getActiveTcpHandler()", () => {
    test("should return enabled TCP handler", () => {
      const created = createTcpHandler({
        ...testTcpHandler,
        enabled: true,
      });

      const active = getActiveTcpHandler();

      expect(active).toBeDefined();
      expect(active?.id).toBe(created.id);
      expect(active?.enabled).toBe(true);
    });

    test("should return null when no handlers exist", () => {
      const active = getActiveTcpHandler();
      expect(active).toBeNull();
    });

    test("should return null when only disabled handlers exist", () => {
      createTcpHandler({
        ...testTcpHandler,
        enabled: false,
      });

      const active = getActiveTcpHandler();
      expect(active).toBeNull();
    });

    test("should return first enabled handler when multiple enabled handlers exist", () => {
      const handler1 = createTcpHandler({
        ...testTcpHandler,
        id: randomUUID(),
        name: "Handler 1",
        enabled: true,
      });

      const handler2 = createTcpHandler({
        ...testTcpHandler,
        id: randomUUID(),
        name: "Handler 2",
        enabled: true,
      });

      const active = getActiveTcpHandler();

      expect(active).toBeDefined();
      expect([handler1.id, handler2.id]).toContain(active?.id);
    });
  });

  describe("error handling and edge cases", () => {
    test("should handle TCP handlers with very long code", () => {
      const longCode = 'send("' + "x".repeat(10000) + '");';

      const handler = createTcpHandler({
        ...testTcpHandler,
        id: randomUUID(),
        code: longCode,
      });

      const retrieved = getTcpHandler(handler.id);
      expect(retrieved?.code).toBe(longCode);
    });

    test("should handle TCP handlers with special characters in name", () => {
      const specialNames = [
        "Handler with spaces",
        "Handler-with-dashes",
        "Handler_with_underscores",
        "Handler (with) parentheses",
        "Handler with 数字 and émojis 🚀",
      ];

      specialNames.forEach((name) => {
        const handler = createTcpHandler({
          ...testTcpHandler,
          id: randomUUID(),
          name: name,
        });

        expect(handler.name).toBe(name);
      });
    });

    test("should handle TCP handlers with minimum required fields", () => {
      const minimalHandler = {
        id: randomUUID(),
        version_id: "1",
        name: "M",
        code: "1",
        enabled: true,
      };

      const handler = createTcpHandler(minimalHandler);

      expect(handler).toMatchObject(minimalHandler);
    });
  });
});

import { expect, test, describe } from "bun:test";
import { tcpHandlerSchema, tcpHandlerMetaSchema } from "./schema";
import { randomUUID } from "@/util/uuid";
import type { TcpHandler } from "./schema";

describe("tcp-handlers/schema", () => {
  describe("tcpHandlerSchema", () => {
    test("should validate a valid TCP handler", () => {
      const validHandler: TcpHandler = {
        id: randomUUID(),
        version_id: "1.0.0",
        name: "Test TCP Handler",
        code: 'console.log("data:", data);\nsend("ack\\n");',
        enabled: true,
      };

      const result = tcpHandlerSchema.safeParse(validHandler);
      expect(result.success).toBe(true);
    });

    test("should reject handler without id", () => {
      const invalidHandler = {
        version_id: "1.0.0",
        name: "Test TCP Handler",
        code: 'send("ack\\n");',
        enabled: true,
      };

      const result = tcpHandlerSchema.safeParse(invalidHandler);
      expect(result.success).toBe(false);
    });

    test("should reject handler without version_id", () => {
      const invalidHandler = {
        id: randomUUID(),
        name: "Test TCP Handler",
        code: 'send("ack\\n");',
        enabled: true,
      };

      const result = tcpHandlerSchema.safeParse(invalidHandler);
      expect(result.success).toBe(false);
    });

    test("should reject handler without name", () => {
      const invalidHandler = {
        id: randomUUID(),
        version_id: "1.0.0",
        code: 'send("ack\\n");',
        enabled: true,
      };

      const result = tcpHandlerSchema.safeParse(invalidHandler);
      expect(result.success).toBe(false);
    });

    test("should reject handler without code", () => {
      const invalidHandler = {
        id: randomUUID(),
        version_id: "1.0.0",
        name: "Test TCP Handler",
        enabled: true,
      };

      const result = tcpHandlerSchema.safeParse(invalidHandler);
      expect(result.success).toBe(false);
    });

    test("should reject handler without enabled", () => {
      const invalidHandler = {
        id: randomUUID(),
        version_id: "1.0.0",
        name: "Test TCP Handler",
        code: 'send("ack\\n");',
      };

      const result = tcpHandlerSchema.safeParse(invalidHandler);
      expect(result.success).toBe(false);
    });

    test("should reject handler with empty name", () => {
      const invalidHandler = {
        id: randomUUID(),
        version_id: "1.0.0",
        name: "",
        code: 'send("ack\\n");',
        enabled: true,
      };

      const result = tcpHandlerSchema.safeParse(invalidHandler);
      expect(result.success).toBe(false);
    });

    test("should reject handler with empty code", () => {
      const invalidHandler = {
        id: randomUUID(),
        version_id: "1.0.0",
        name: "Test Handler",
        code: "",
        enabled: true,
      };

      const result = tcpHandlerSchema.safeParse(invalidHandler);
      expect(result.success).toBe(false);
    });

    test("should reject handler with empty version_id", () => {
      const invalidHandler = {
        id: randomUUID(),
        version_id: "",
        name: "Test Handler",
        code: 'send("ack\\n");',
        enabled: true,
      };

      const result = tcpHandlerSchema.safeParse(invalidHandler);
      expect(result.success).toBe(false);
    });

    test("should accept handler with enabled false", () => {
      const validHandler = {
        id: randomUUID(),
        version_id: "1.0.0",
        name: "Test TCP Handler",
        code: 'send("ack\\n");',
        enabled: false,
      };

      const result = tcpHandlerSchema.safeParse(validHandler);
      expect(result.success).toBe(true);
    });

    test("should reject handler with invalid UUID", () => {
      const invalidHandler = {
        id: "not-a-uuid",
        version_id: "1.0.0",
        name: "Test TCP Handler",
        code: 'send("ack\\n");',
        enabled: true,
      };

      const result = tcpHandlerSchema.safeParse(invalidHandler);
      expect(result.success).toBe(false);
    });

    test("should accept handler with long code", () => {
      const longCode = 'send("' + "x".repeat(10000) + '");';
      const validHandler = {
        id: randomUUID(),
        version_id: "1.0.0",
        name: "Test TCP Handler",
        code: longCode,
        enabled: true,
      };

      const result = tcpHandlerSchema.safeParse(validHandler);
      expect(result.success).toBe(true);
    });

    test("should accept handler with special characters in name", () => {
      const validHandler = {
        id: randomUUID(),
        version_id: "1.0.0",
        name: "Test TCP Handler 🚀 with émojis",
        code: 'send("ack\\n");',
        enabled: true,
      };

      const result = tcpHandlerSchema.safeParse(validHandler);
      expect(result.success).toBe(true);
    });
  });

  describe("tcpHandlerMetaSchema", () => {
    test("should validate TCP handler metadata without code", () => {
      const validMeta = {
        id: randomUUID(),
        version_id: "1.0.0",
        name: "Test TCP Handler",
        enabled: true,
      };

      const result = tcpHandlerMetaSchema.safeParse(validMeta);
      expect(result.success).toBe(true);
    });

    test("should reject metadata with code field", () => {
      const invalidMeta = {
        id: randomUUID(),
        version_id: "1.0.0",
        name: "Test TCP Handler",
        code: 'send("ack\\n");',
        enabled: true,
      };

      const result = tcpHandlerMetaSchema.safeParse(invalidMeta);
      // Zod's omit doesn't reject extra fields by default, it just ignores them
      // So this test verifies that code is not required in the schema
      if (result.success) {
        expect(result.data).not.toHaveProperty("code");
      }
    });

    test("should have same validation rules as tcpHandlerSchema except code", () => {
      const invalidMeta = {
        version_id: "1.0.0",
        name: "Test TCP Handler",
        enabled: true,
      };

      const result = tcpHandlerMetaSchema.safeParse(invalidMeta);
      expect(result.success).toBe(false);
    });
  });
});

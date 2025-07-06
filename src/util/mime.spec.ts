import { describe, it, expect } from "bun:test";
import {
  getExtensionFromMimeType,
  extractMimeType,
  findContentTypeHeader,
} from "./mime";

describe("MIME utilities", () => {
  describe("getExtensionFromMimeType", () => {
    it("should return correct extension for common MIME types", () => {
      expect(getExtensionFromMimeType("application/pdf")).toBe(".pdf");
      expect(getExtensionFromMimeType("application/json")).toBe(".json");
      expect(getExtensionFromMimeType("text/plain")).toBe(".txt");
      expect(getExtensionFromMimeType("image/jpeg")).toBe(".jpg");
      expect(getExtensionFromMimeType("image/png")).toBe(".png");
      expect(getExtensionFromMimeType("application/octet-stream")).toBe(".bin");
    });

    it("should handle MIME types with parameters", () => {
      expect(getExtensionFromMimeType("application/json; charset=utf-8")).toBe(
        ".json",
      );
      expect(getExtensionFromMimeType("text/html; charset=utf-8")).toBe(
        ".html",
      );
    });

    it("should return .txt for unknown MIME types", () => {
      expect(getExtensionFromMimeType("unknown/type")).toBe(".txt");
      expect(getExtensionFromMimeType("")).toBe(".txt");
    });

    it("should be case insensitive", () => {
      expect(getExtensionFromMimeType("APPLICATION/PDF")).toBe(".pdf");
      expect(getExtensionFromMimeType("Image/JPEG")).toBe(".jpg");
    });
  });

  describe("extractMimeType", () => {
    it("should extract MIME type from Content-Type header", () => {
      expect(extractMimeType("application/json; charset=utf-8")).toBe(
        "application/json",
      );
      expect(extractMimeType("text/html; charset=utf-8")).toBe("text/html");
      expect(extractMimeType("application/pdf")).toBe("application/pdf");
    });

    it("should handle empty or invalid input", () => {
      expect(extractMimeType("")).toBe("");
      expect(extractMimeType("invalid")).toBe("invalid");
    });
  });

  describe("findContentTypeHeader", () => {
    it("should find Content-Type header case insensitively", () => {
      const headers: [string, string][] = [
        ["host", "example.com"],
        ["content-type", "application/json"],
        ["user-agent", "test"],
      ];
      expect(findContentTypeHeader(headers)).toBe("application/json");
    });

    it("should find Content-Type header with different cases", () => {
      const headers: [string, string][] = [
        ["Content-Type", "text/html"],
        ["Accept", "text/html"],
      ];
      expect(findContentTypeHeader(headers)).toBe("text/html");
    });

    it("should return undefined if Content-Type header is not found", () => {
      const headers: [string, string][] = [
        ["host", "example.com"],
        ["user-agent", "test"],
      ];
      expect(findContentTypeHeader(headers)).toBeUndefined();
    });

    it("should handle empty headers array", () => {
      expect(findContentTypeHeader([])).toBeUndefined();
    });
  });
});

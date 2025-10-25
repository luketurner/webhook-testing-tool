import "@/server-only";
import { describe, test, expect } from "bun:test";
import {
  emailSchema,
  passwordSchema,
  filePathSchema,
} from "@/cli-admin/validation";

describe("Email Validation Schema", () => {
  test("T009: accepts valid email addresses", () => {
    expect(emailSchema.parse("admin@example.com")).toBe("admin@example.com");
    expect(emailSchema.parse("john.doe@company.co.uk")).toBe(
      "john.doe@company.co.uk",
    );
    expect(emailSchema.parse("user+tag@subdomain.domain.com")).toBe(
      "user+tag@subdomain.domain.com",
    );
  });

  test("T009: normalizes email to lowercase", () => {
    expect(emailSchema.parse("Admin@Example.COM")).toBe("admin@example.com");
    expect(emailSchema.parse("JOHN.DOE@COMPANY.COM")).toBe(
      "john.doe@company.com",
    );
  });

  test("T009: trims whitespace from email", () => {
    expect(emailSchema.parse("  admin@example.com  ")).toBe(
      "admin@example.com",
    );
    expect(emailSchema.parse("\t user@example.com \n")).toBe(
      "user@example.com",
    );
  });

  test("T009: rejects invalid email formats", () => {
    expect(() => emailSchema.parse("notanemail")).toThrow();
    expect(() => emailSchema.parse("user@")).toThrow();
    expect(() => emailSchema.parse("@domain.com")).toThrow();
    expect(() => emailSchema.parse("user name@domain.com")).toThrow();
  });

  test("T009: rejects email that is too short", () => {
    expect(() => emailSchema.parse("a@b")).toThrow("too short");
  });

  test("T009: rejects email that is too long", () => {
    const longEmail = "a".repeat(250) + "@example.com";
    expect(() => emailSchema.parse(longEmail)).toThrow("too long");
  });
});

describe("Password Validation Schema", () => {
  test("T009: accepts valid passwords", () => {
    expect(passwordSchema.parse("Admin123")).toBe("Admin123");
    expect(passwordSchema.parse("SecureP@ss1")).toBe("SecureP@ss1");
    expect(passwordSchema.parse("MyPassword99")).toBe("MyPassword99");
  });

  test("T009: rejects password that is too short", () => {
    expect(() => passwordSchema.parse("Admin1")).toThrow(
      "at least 8 characters",
    );
  });

  test("T009: rejects password missing uppercase", () => {
    expect(() => passwordSchema.parse("admin123")).toThrow("uppercase");
  });

  test("T009: rejects password missing lowercase", () => {
    expect(() => passwordSchema.parse("ADMIN123")).toThrow("lowercase");
  });

  test("T009: rejects password missing number", () => {
    expect(() => passwordSchema.parse("AdminPass")).toThrow("number");
  });

  test("T009: rejects password that is too long", () => {
    const longPassword = "A".repeat(126) + "a1"; // 128 chars, add one more to exceed max
    expect(() => passwordSchema.parse(longPassword + "X")).toThrow("too long");
  });

  test("T009: allows special characters in password", () => {
    expect(passwordSchema.parse("Admin123!@#")).toBe("Admin123!@#");
    expect(passwordSchema.parse("P@ssw0rd$")).toBe("P@ssw0rd$");
  });
});

describe("File Path Validation Schema", () => {
  test("T009: generates default filename with timestamp when no path provided", () => {
    const result = filePathSchema.parse("");
    expect(result).toMatch(/^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.db$/);
  });

  test("T009: accepts custom path with .db extension", () => {
    expect(filePathSchema.parse("/backups/wtt-backup.db")).toBe(
      "/backups/wtt-backup.db",
    );
    expect(filePathSchema.parse("./backup.db")).toBe("./backup.db");
  });

  test("T009: rejects path without .db extension", () => {
    expect(() => filePathSchema.parse("/backups/backup.txt")).toThrow(
      ".db extension",
    );
    expect(() => filePathSchema.parse("backup")).toThrow(".db extension");
  });

  test("T009: optional path defaults to empty string then generates timestamp", () => {
    const result = filePathSchema.parse(undefined);
    expect(result).toMatch(/^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.db$/);
  });
});

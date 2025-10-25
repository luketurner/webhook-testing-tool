import { describe, test, expect } from "bun:test";
import { passwordSchema, passwordResetSchema } from "@/user-management/schemas";

// T010: Unit tests for password validation schema
// Tests FR-007 (min 8 chars), FR-007a (unicode support), FR-008 (confirmation match)

describe("Password Validation Schema", () => {
  describe("Password Length (FR-007: minimum 8 characters)", () => {
    test("accepts password with exactly 8 characters", () => {
      const result = passwordSchema.safeParse("12345678");
      expect(result.success).toBe(true);
    });

    test("accepts password with 20 characters", () => {
      const result = passwordSchema.safeParse("a".repeat(20));
      expect(result.success).toBe(true);
    });

    test("accepts password with 100 characters", () => {
      const result = passwordSchema.safeParse("a".repeat(100));
      expect(result.success).toBe(true);
    });

    test("rejects password with 7 characters", () => {
      const result = passwordSchema.safeParse("1234567");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 8");
      }
    });

    test("rejects password with 1 character", () => {
      const result = passwordSchema.safeParse("a");
      expect(result.success).toBe(false);
    });

    test("rejects empty password", () => {
      const result = passwordSchema.safeParse("");
      expect(result.success).toBe(false);
    });
  });

  describe("Unicode and Special Character Support (FR-007a)", () => {
    test("accepts password with emoji", () => {
      const result = passwordSchema.safeParse("pass🔒word");
      expect(result.success).toBe(true);
    });

    test("accepts password with multiple emoji", () => {
      const result = passwordSchema.safeParse("🔒🔑🛡️🚀password");
      expect(result.success).toBe(true);
    });

    test("accepts password with Chinese characters", () => {
      const result = passwordSchema.safeParse("密码123456");
      expect(result.success).toBe(true);
    });

    test("accepts password with Japanese characters", () => {
      const result = passwordSchema.safeParse("パスワード123");
      expect(result.success).toBe(true);
    });

    test("accepts password with Arabic characters", () => {
      const result = passwordSchema.safeParse("كلمةالسر123");
      expect(result.success).toBe(true);
    });

    test("accepts password with Cyrillic characters", () => {
      const result = passwordSchema.safeParse("пароль123");
      expect(result.success).toBe(true);
    });

    test("accepts password with spaces", () => {
      const result = passwordSchema.safeParse("my secure password");
      expect(result.success).toBe(true);
    });

    test("accepts password with all special characters", () => {
      const result = passwordSchema.safeParse("!@#$%^&*()");
      expect(result.success).toBe(true);
    });

    test("accepts password with mixed unicode and special chars", () => {
      const result = passwordSchema.safeParse("🔒secure你好!");
      expect(result.success).toBe(true);
    });

    test("accepts password that is only emoji (if >= 8 chars)", () => {
      const result = passwordSchema.safeParse("🔒🔑🛡️🚀💻🔐🗝️🔓");
      expect(result.success).toBe(true);
    });
  });

  describe("Password Reset Schema (FR-008: confirmation match)", () => {
    test("accepts matching passwords", () => {
      const result = passwordResetSchema.safeParse({
        currentPassword: "oldpassword",
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      });
      expect(result.success).toBe(true);
    });

    test("rejects when passwords don't match", () => {
      const result = passwordResetSchema.safeParse({
        currentPassword: "oldpassword",
        newPassword: "newpassword123",
        confirmPassword: "differentpassword",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("do not match");
        expect(result.error.issues[0].path).toContain("confirmPassword");
      }
    });

    test("rejects when new password is too short", () => {
      const result = passwordResetSchema.safeParse({
        currentPassword: "oldpassword",
        newPassword: "short",
        confirmPassword: "short",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 8");
      }
    });

    test("rejects when current password is empty", () => {
      const result = passwordResetSchema.safeParse({
        currentPassword: "",
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Current password");
      }
    });

    test("accepts unicode passwords if they match", () => {
      const unicodePassword = "🔒secure你好123";
      const result = passwordResetSchema.safeParse({
        currentPassword: "oldpassword",
        newPassword: unicodePassword,
        confirmPassword: unicodePassword,
      });
      expect(result.success).toBe(true);
    });

    test("rejects unicode passwords if they don't match", () => {
      const result = passwordResetSchema.safeParse({
        currentPassword: "oldpassword",
        newPassword: "🔒secure你好123",
        confirmPassword: "🔒secure你好456",
      });
      expect(result.success).toBe(false);
    });

    test("case-sensitive password matching", () => {
      const result = passwordResetSchema.safeParse({
        currentPassword: "oldpassword",
        newPassword: "Password123",
        confirmPassword: "password123", // Different case
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("do not match");
      }
    });
  });
});

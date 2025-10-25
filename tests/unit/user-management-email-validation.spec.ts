import { describe, test, expect } from "bun:test";
import { emailSchema } from "@/user-management/schemas";

// T009: Unit tests for email validation schema
// Tests FR-004 (RFC 5322 format), FR-014 (max 254 chars), FR-015 (whitespace trimming)

describe("Email Validation Schema", () => {
  describe("Valid Emails (FR-004: RFC 5322 format)", () => {
    test("accepts standard email format", () => {
      const result = emailSchema.safeParse("user@example.com");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("user@example.com");
      }
    });

    test("accepts email with subdomain", () => {
      const result = emailSchema.safeParse("user@mail.example.com");
      expect(result.success).toBe(true);
    });

    test("accepts email with plus addressing", () => {
      const result = emailSchema.safeParse("user+tag@example.com");
      expect(result.success).toBe(true);
    });

    test("accepts email with dots in local part", () => {
      const result = emailSchema.safeParse("first.last@example.com");
      expect(result.success).toBe(true);
    });

    test("accepts email with numbers", () => {
      const result = emailSchema.safeParse("user123@example456.com");
      expect(result.success).toBe(true);
    });
  });

  describe("Invalid Emails (FR-004)", () => {
    test("rejects email without @", () => {
      const result = emailSchema.safeParse("userexample.com");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Invalid email");
      }
    });

    test("rejects email without domain", () => {
      const result = emailSchema.safeParse("user@");
      expect(result.success).toBe(false);
    });

    test("rejects email without local part", () => {
      const result = emailSchema.safeParse("@example.com");
      expect(result.success).toBe(false);
    });

    test("rejects email with spaces", () => {
      const result = emailSchema.safeParse("user name@example.com");
      expect(result.success).toBe(false);
    });

    test("rejects empty string", () => {
      const result = emailSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    test("rejects just domain", () => {
      const result = emailSchema.safeParse("example.com");
      expect(result.success).toBe(false);
    });
  });

  describe("Email Length Validation (FR-014: max 254 characters)", () => {
    test("accepts email with 254 characters", () => {
      // Create email exactly 254 chars: 242 char local + @ + example.com (11) = 254
      const local = "a".repeat(242);
      const email = `${local}@example.com`; // Total: 254 chars
      expect(email.length).toBe(254);

      const result = emailSchema.safeParse(email);
      expect(result.success).toBe(true);
    });

    test("rejects email with 255 characters", () => {
      // Create email with 255 chars
      const local = "a".repeat(243);
      const email = `${local}@example.com`; // Total: 255 chars
      expect(email.length).toBe(255);

      const result = emailSchema.safeParse(email);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("254 characters");
      }
    });

    test("rejects email with 300 characters", () => {
      const local = "a".repeat(286);
      const email = `${local}@example.com`;
      expect(email.length).toBeGreaterThan(254);

      const result = emailSchema.safeParse(email);
      expect(result.success).toBe(false);
    });
  });

  describe("Whitespace Trimming (FR-015)", () => {
    test("trims leading whitespace", () => {
      const result = emailSchema.safeParse("  user@example.com");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("user@example.com");
        expect(result.data).not.toContain(" ");
      }
    });

    test("trims trailing whitespace", () => {
      const result = emailSchema.safeParse("user@example.com  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("user@example.com");
      }
    });

    test("trims both leading and trailing whitespace", () => {
      const result = emailSchema.safeParse("  user@example.com  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("user@example.com");
      }
    });

    test("trims tabs and newlines", () => {
      const result = emailSchema.safeParse("\t\nuser@example.com\n\t");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("user@example.com");
      }
    });

    test("validation fails after trimming if email invalid", () => {
      // After trimming, this becomes just whitespace, which is invalid
      const result = emailSchema.safeParse("   ");
      expect(result.success).toBe(false);
    });
  });
});

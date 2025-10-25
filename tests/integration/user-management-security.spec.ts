import { describe, test, expect, beforeEach } from "bun:test";
import { auth } from "@/auth";
import { db } from "@/db";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "@/util/uuid";

// T038: Integration tests for security requirements
// Tests SR-001 (current password verification), SR-003 (generic error messages)

describe("User Management - Security", () => {
  let testUserId: string;
  let testUserEmail: string;
  let testPassword: string;
  let sessionToken: string;

  beforeEach(async () => {
    // Clean up existing data
    db.prepare("DELETE FROM session").run();
    db.prepare("DELETE FROM account").run();
    db.prepare("DELETE FROM user").run();

    // Create test user
    testUserId = randomUUID();
    testUserEmail = "security@example.com";
    testPassword = "correctPassword123";

    db.prepare(
      "INSERT INTO user (id, email, name, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(
      testUserId,
      testUserEmail,
      "Security Test User",
      0,
      Date.now(),
      Date.now(),
    );

    const passwordHash = await hashPassword(testPassword);
    db.prepare(
      "INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(
      randomUUID(),
      testUserEmail,
      "credential",
      testUserId,
      passwordHash,
      Date.now(),
      Date.now(),
    );

    // Sign in to get session token
    const signInResponse = await auth.api.signInEmail({
      body: {
        email: testUserEmail,
        password: testPassword,
      },
      asResponse: true,
    });

    const setCookieHeaders = signInResponse.headers.getSetCookie();
    const sessionCookie = setCookieHeaders.find((cookie) =>
      cookie.startsWith("better-auth.session_token="),
    );
    const tokenMatch = sessionCookie!.match(
      /better-auth\.session_token=([^;]+)/,
    );
    sessionToken = decodeURIComponent(tokenMatch![1]);
  });

  test("should reject wrong current password", async () => {
    const wrongPassword = "wrongPassword999";
    const newPassword = "newPassword123";

    const { updatePassword } = await import("@/user-management/actions");
    const mockReq = new Request("http://localhost/api/user/password", {
      method: "PUT",
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    // SR-001: Current password must be verified
    await expect(
      updatePassword(mockReq, wrongPassword, newPassword, newPassword),
    ).rejects.toThrow("Invalid credentials");

    // Verify password unchanged in database
    const account = db
      .query(
        "SELECT password FROM account WHERE userId = ? AND providerId = 'credential'",
      )
      .get(testUserId) as { password: string };

    // Password should still be the original
    const { verifyPassword } = await import("better-auth/crypto");
    const stillOriginal = await verifyPassword({
      hash: account.password,
      password: testPassword,
    });
    expect(stillOriginal).toBe(true);
  });

  test("should return generic error message for wrong password", async () => {
    const wrongPassword = "definitelyWrong";
    const newPassword = "newPassword123";

    const { updatePassword } = await import("@/user-management/actions");
    const mockReq = new Request("http://localhost/api/user/password", {
      method: "PUT",
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    try {
      await updatePassword(mockReq, wrongPassword, newPassword, newPassword);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      // SR-003: Error message should be generic (not reveal which check failed)
      expect(error instanceof Error).toBe(true);
      expect((error as Error).message).toBe("Invalid credentials");
      // Should NOT contain hints like "wrong password" or "incorrect current password"
      expect((error as Error).message).not.toContain("wrong");
      expect((error as Error).message).not.toContain("incorrect");
      expect((error as Error).message).not.toContain("current");
    }
  });

  test("should reject empty current password", async () => {
    const newPassword = "newPassword123";

    const { updatePassword } = await import("@/user-management/actions");
    const mockReq = new Request("http://localhost/api/user/password", {
      method: "PUT",
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    await expect(
      updatePassword(mockReq, "", newPassword, newPassword),
    ).rejects.toThrow("Current password is required");
  });

  test("should accept correct current password", async () => {
    const newPassword = "correctlyUpdatedPassword";

    const { updatePassword } = await import("@/user-management/actions");
    const mockReq = new Request("http://localhost/api/user/password", {
      method: "PUT",
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    // Should succeed with correct current password
    const result = await updatePassword(
      mockReq,
      testPassword,
      newPassword,
      newPassword,
    );

    expect(result.success).toBe(true);
  });
});

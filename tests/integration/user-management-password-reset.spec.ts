import { describe, test, expect, beforeEach } from "bun:test";
import { auth } from "@/auth";
import { db } from "@/db";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { randomUUID } from "@/util/uuid";

// T037: Integration tests for PUT /api/user/password endpoint
// Tests password update, login with new password, old password rejected

describe("PUT /api/user/password - Password Reset", () => {
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
    testUserEmail = "passwordtest@example.com";
    testPassword = "originalPassword123";

    db.prepare(
      "INSERT INTO user (id, email, name, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(
      testUserId,
      testUserEmail,
      "Password Test User",
      0,
      Date.now(),
      Date.now(),
    );

    // Create account with hashed password
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

  test("should update password successfully", async () => {
    const newPassword = "newSecurePassword456";

    const { updatePassword } = await import("@/user-management/actions");
    const mockReq = new Request("http://localhost/api/user/password", {
      method: "PUT",
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    const result = await updatePassword(
      mockReq,
      testPassword,
      newPassword,
      newPassword,
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe("Password updated successfully");

    // Verify password hash changed in database
    const account = db
      .query(
        "SELECT password FROM account WHERE userId = ? AND providerId = 'credential'",
      )
      .get(testUserId) as { password: string };

    // Verify new password works
    const passwordMatches = await verifyPassword({
      hash: account.password,
      password: newPassword,
    });
    expect(passwordMatches).toBe(true);
  });

  test("should allow login with new password", async () => {
    const newPassword = "brandNewPassword789";

    // Update password
    const { updatePassword } = await import("@/user-management/actions");
    const mockReq = new Request("http://localhost/api/user/password", {
      method: "PUT",
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    await updatePassword(mockReq, testPassword, newPassword, newPassword);

    // Sign out
    await auth.api.signOut({
      headers: new Headers({
        Cookie: `better-auth.session_token=${sessionToken}`,
      }),
    });

    // Login with new password
    const signInResponse = await auth.api.signInEmail({
      body: {
        email: testUserEmail,
        password: newPassword,
      },
      asResponse: true,
    });

    expect(signInResponse.status).toBe(200);

    const setCookieHeaders = signInResponse.headers.getSetCookie();
    expect(setCookieHeaders.length).toBeGreaterThan(0);
  });

  test("should reject login with old password after update", async () => {
    const newPassword = "completelyNewPassword";

    // Update password
    const { updatePassword } = await import("@/user-management/actions");
    const mockReq = new Request("http://localhost/api/user/password", {
      method: "PUT",
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    await updatePassword(mockReq, testPassword, newPassword, newPassword);

    // Sign out
    await auth.api.signOut({
      headers: new Headers({
        Cookie: `better-auth.session_token=${sessionToken}`,
      }),
    });

    // Try to login with old password (should fail)
    const failedLoginResponse = await auth.api.signInEmail({
      body: {
        email: testUserEmail,
        password: testPassword, // old password
      },
      asResponse: true,
    });

    expect(failedLoginResponse.status).not.toBe(200);
  });

  test("should reject mismatched password confirmation", async () => {
    const newPassword = "newPassword123";
    const differentConfirmation = "differentPassword456";

    const { updatePassword } = await import("@/user-management/actions");
    const mockReq = new Request("http://localhost/api/user/password", {
      method: "PUT",
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    // FR-008: Should reject when passwords don't match
    await expect(
      updatePassword(mockReq, testPassword, newPassword, differentConfirmation),
    ).rejects.toThrow("do not match");
  });

  test("should reject password shorter than 8 characters", async () => {
    const shortPassword = "short";

    const { updatePassword } = await import("@/user-management/actions");
    const mockReq = new Request("http://localhost/api/user/password", {
      method: "PUT",
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    // FR-007: Should reject passwords < 8 chars
    await expect(
      updatePassword(mockReq, testPassword, shortPassword, shortPassword),
    ).rejects.toThrow("at least 8");
  });

  test("should maintain session after password update", async () => {
    const newPassword = "sessionTestPassword";

    // Update password
    const { updatePassword } = await import("@/user-management/actions");
    const mockReq = new Request("http://localhost/api/user/password", {
      method: "PUT",
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    await updatePassword(mockReq, testPassword, newPassword, newPassword);

    // Verify session still works (no forced logout)
    const { getUserProfile } = await import("@/user-management/actions");
    const profileReq = new Request("http://localhost/api/user/profile", {
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    const profile = await getUserProfile(profileReq);

    expect(profile.success).toBe(true);
    expect(profile.user.id).toBe(testUserId);
  });

  test("should require authentication", async () => {
    const newPassword = "anyPassword123";

    const { updatePassword } = await import("@/user-management/actions");
    const mockReq = new Request("http://localhost/api/user/password", {
      method: "PUT",
      headers: {},
    });

    // FR-013: Should require authentication
    await expect(
      updatePassword(mockReq, testPassword, newPassword, newPassword),
    ).rejects.toThrow("Authentication required");
  });
});

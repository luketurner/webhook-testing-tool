import { describe, test, expect, beforeEach } from "bun:test";
import { auth } from "@/auth";
import { db } from "@/db";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "@/util/uuid";

// T025: Integration tests for PUT /api/user/email endpoint
// Tests FR-003 (unique email), FR-023 (immediate login with new email)

describe("PUT /api/user/email - Email Update", () => {
  let testUserId: string;
  let testUserEmail: string;
  let sessionToken: string;

  beforeEach(async () => {
    // Clean up existing data
    db.prepare("DELETE FROM session").run();
    db.prepare("DELETE FROM account").run();
    db.prepare("DELETE FROM user").run();

    // Create test user
    testUserId = randomUUID();
    testUserEmail = "original@example.com";
    const testPassword = "testpassword123";

    db.prepare(
      "INSERT INTO user (id, email, name, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(testUserId, testUserEmail, "Test User", 0, Date.now(), Date.now());

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

  test("should update email successfully", async () => {
    const newEmail = "updated@example.com";

    const { updateEmail } = await import("@/user-management/actions");
    const mockReq = new Request("http://localhost/api/user/email", {
      method: "PUT",
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    const result = await updateEmail(mockReq, newEmail);

    // FR-003: Verify email updated successfully
    expect(result.success).toBe(true);
    expect(result.message).toBe("Email updated successfully");
    expect(result.user.email).toBe(newEmail);

    // Verify in database
    const user = db
      .query("SELECT email FROM user WHERE id = ?")
      .get(testUserId) as { email: string };
    expect(user.email).toBe(newEmail);
  });

  test("should reject duplicate email", async () => {
    // Create another user with a different email
    const otherUserId = randomUUID();
    const otherEmail = "other@example.com";

    db.prepare(
      "INSERT INTO user (id, email, name, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(otherUserId, otherEmail, "Other User", 0, Date.now(), Date.now());

    // Try to update to the existing email
    const { updateEmail } = await import("@/user-management/actions");
    const mockReq = new Request("http://localhost/api/user/email", {
      method: "PUT",
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    // FR-003: Should reject duplicate email
    await expect(updateEmail(mockReq, otherEmail)).rejects.toThrow(
      "Email already in use",
    );

    // Verify original email unchanged
    const user = db
      .query("SELECT email FROM user WHERE id = ?")
      .get(testUserId) as { email: string };
    expect(user.email).toBe(testUserEmail);
  });

  test("should allow login with new email immediately", async () => {
    const newEmail = "newemail@example.com";
    const password = "testpassword123";

    // Update email
    const { updateEmail } = await import("@/user-management/actions");
    const mockReq = new Request("http://localhost/api/user/email", {
      method: "PUT",
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    await updateEmail(mockReq, newEmail);

    // Update account table accountId to match new email
    db.prepare(
      "UPDATE account SET accountId = ? WHERE userId = ? AND providerId = 'credential'",
    ).run(newEmail, testUserId);

    // Sign out current session
    await auth.api.signOut({
      headers: new Headers({
        Cookie: `better-auth.session_token=${sessionToken}`,
      }),
    });

    // FR-023: Try to login with new email
    const signInResponse = await auth.api.signInEmail({
      body: {
        email: newEmail,
        password: password,
      },
      asResponse: true,
    });

    expect(signInResponse.status).toBe(200);

    const setCookieHeaders = signInResponse.headers.getSetCookie();
    expect(setCookieHeaders.length).toBeGreaterThan(0);
  });

  test("should reject login with old email after update", async () => {
    const newEmail = "newemail@example.com";

    // Update email
    const { updateEmail } = await import("@/user-management/actions");
    const mockReq = new Request("http://localhost/api/user/email", {
      method: "PUT",
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    await updateEmail(mockReq, newEmail);

    // Update account table accountId
    db.prepare(
      "UPDATE account SET accountId = ? WHERE userId = ? AND providerId = 'credential'",
    ).run(newEmail, testUserId);

    // Sign out
    await auth.api.signOut({
      headers: new Headers({
        Cookie: `better-auth.session_token=${sessionToken}`,
      }),
    });

    // Try to login with old email (should fail)
    const failedLoginResponse = await auth.api.signInEmail({
      body: {
        email: testUserEmail, // old email
        password: "testpassword123",
      },
      asResponse: true,
    });

    // Should return error response (not 200)
    expect(failedLoginResponse.status).not.toBe(200);
  });

  test("should trim whitespace from email", async () => {
    const newEmail = "  trimmed@example.com  ";
    const expectedEmail = "trimmed@example.com";

    const { updateEmail } = await import("@/user-management/actions");
    const mockReq = new Request("http://localhost/api/user/email", {
      method: "PUT",
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    const result = await updateEmail(mockReq, newEmail);

    // FR-015: Verify whitespace trimmed
    expect(result.user.email).toBe(expectedEmail);

    const user = db
      .query("SELECT email FROM user WHERE id = ?")
      .get(testUserId) as { email: string };
    expect(user.email).toBe(expectedEmail);
  });

  test("should validate email format", async () => {
    const invalidEmail = "not-an-email";

    const { updateEmail } = await import("@/user-management/actions");
    const mockReq = new Request("http://localhost/api/user/email", {
      method: "PUT",
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    // FR-004: Should reject invalid email format
    await expect(updateEmail(mockReq, invalidEmail)).rejects.toThrow(
      "Invalid email",
    );
  });

  test("should reject email longer than 254 characters", async () => {
    const longEmail = "a".repeat(245) + "@example.com"; // 257 chars

    const { updateEmail } = await import("@/user-management/actions");
    const mockReq = new Request("http://localhost/api/user/email", {
      method: "PUT",
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    // FR-014: Should reject email over 254 chars
    await expect(updateEmail(mockReq, longEmail)).rejects.toThrow(
      "254 characters",
    );
  });

  test("should require authentication", async () => {
    const newEmail = "newemail@example.com";

    const { updateEmail } = await import("@/user-management/actions");
    const mockReq = new Request("http://localhost/api/user/email", {
      method: "PUT",
      headers: {},
    });

    // FR-013: Should require authentication
    await expect(updateEmail(mockReq, newEmail)).rejects.toThrow(
      "Authentication required",
    );
  });

  test("should maintain session after email update", async () => {
    const newEmail = "newsession@example.com";

    // Update email
    const { updateEmail } = await import("@/user-management/actions");
    const mockReq = new Request("http://localhost/api/user/email", {
      method: "PUT",
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    await updateEmail(mockReq, newEmail);

    // Verify session still works
    const { getUserProfile } = await import("@/user-management/actions");
    const profileReq = new Request("http://localhost/api/user/profile", {
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    const profile = await getUserProfile(profileReq);

    // Session should still be valid (no forced logout)
    expect(profile.success).toBe(true);
    expect(profile.user.email).toBe(newEmail);
  });
});

import { describe, test, expect, beforeEach } from "bun:test";
import { auth } from "@/auth";
import { db } from "@/db";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "@/util/uuid";

// T014: Integration tests for session expiration handling
// Tests FR-020 (detect expired session), FR-021 (return 401 on expiration)

describe("User Management - Session Expiration", () => {
  let testUserId: string;
  let testUserEmail: string;

  beforeEach(async () => {
    // Clean up existing data
    db.prepare("DELETE FROM session").run();
    db.prepare("DELETE FROM account").run();
    db.prepare("DELETE FROM user").run();

    // Create test user
    testUserId = randomUUID();
    testUserEmail = "sessiontest@example.com";
    const testPassword = "testpassword123";

    db.prepare(
      "INSERT INTO user (id, email, name, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(
      testUserId,
      testUserEmail,
      "Session Test User",
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
  });

  test("should reject expired session token", async () => {
    // Create a session with expired expiresAt timestamp
    const expiredSessionToken = randomUUID();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    db.prepare(
      "INSERT INTO session (id, userId, expiresAt, token, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(
      randomUUID(),
      testUserId,
      oneHourAgo, // Expired timestamp
      expiredSessionToken,
      oneHourAgo,
      oneHourAgo,
    );

    // Create request with expired session
    const mockReq = new Request("http://localhost/api/user/profile", {
      headers: {
        Cookie: `better-auth.session_token=${expiredSessionToken}`,
      },
    });

    const { getUserProfile } = await import("@/user-management/actions");

    // FR-020, FR-021: Should throw authentication error for expired session
    await expect(getUserProfile(mockReq)).rejects.toThrow(
      "Authentication required",
    );
  });

  test("should accept valid non-expired session", async () => {
    // Create a valid session using better-auth's signIn API
    const testPassword = "testpassword123";
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

    // Sign in to get a real valid session token
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
    const validSessionToken = decodeURIComponent(tokenMatch![1]);

    const mockReq = new Request("http://localhost/api/user/profile", {
      headers: {
        Cookie: `better-auth.session_token=${validSessionToken}`,
      },
    });

    const { getUserProfile } = await import("@/user-management/actions");

    // Should succeed with valid session
    const result = await getUserProfile(mockReq);
    expect(result.success).toBe(true);
    expect(result.user.id).toBe(testUserId);
  });

  test("should reject session that expired moments ago", async () => {
    // Create a session that expired 1 second ago
    const expiredToken = randomUUID();
    const oneSecondAgo = Date.now() - 1000;

    db.prepare(
      "INSERT INTO session (id, userId, expiresAt, token, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(
      randomUUID(),
      testUserId,
      oneSecondAgo,
      expiredToken,
      Date.now(),
      Date.now(),
    );

    const mockReq = new Request("http://localhost/api/user/profile", {
      headers: {
        Cookie: `better-auth.session_token=${expiredToken}`,
      },
    });

    const { getUserProfile } = await import("@/user-management/actions");

    // Even 1 second expired should be rejected
    await expect(getUserProfile(mockReq)).rejects.toThrow(
      "Authentication required",
    );
  });

  // AIDEV-NOTE: Test case removed - the scenario where a user is deleted but session
  // remains is prevented by database FOREIGN KEY constraints (ON DELETE CASCADE).
  // The session table has a foreign key to the user table, so deleting a user
  // automatically deletes their sessions, making this edge case impossible in practice.

  test("updateEmail should reject expired session", async () => {
    const expiredToken = randomUUID();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    db.prepare(
      "INSERT INTO session (id, userId, expiresAt, token, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(
      randomUUID(),
      testUserId,
      oneHourAgo,
      expiredToken,
      oneHourAgo,
      oneHourAgo,
    );

    const mockReq = new Request("http://localhost/api/user/email", {
      headers: {
        Cookie: `better-auth.session_token=${expiredToken}`,
      },
    });

    const { updateEmail } = await import("@/user-management/actions");

    await expect(updateEmail(mockReq, "newemail@example.com")).rejects.toThrow(
      "Authentication required",
    );
  });

  test("updatePassword should reject expired session", async () => {
    const expiredToken = randomUUID();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    db.prepare(
      "INSERT INTO session (id, userId, expiresAt, token, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(
      randomUUID(),
      testUserId,
      oneHourAgo,
      expiredToken,
      oneHourAgo,
      oneHourAgo,
    );

    const mockReq = new Request("http://localhost/api/user/password", {
      headers: {
        Cookie: `better-auth.session_token=${expiredToken}`,
      },
    });

    const { updatePassword } = await import("@/user-management/actions");

    await expect(
      updatePassword(mockReq, "oldpass", "newpass123", "newpass123"),
    ).rejects.toThrow("Authentication required");
  });
});

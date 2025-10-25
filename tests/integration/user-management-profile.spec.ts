import { describe, test, expect, beforeEach } from "bun:test";
import { auth } from "@/auth";
import { db } from "@/db";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "@/util/uuid";

// T012: Integration tests for GET /api/user/profile endpoint
// Tests FR-001 (retrieve user id), FR-002 (retrieve email/name/createdAt), FR-013 (auth required)

describe("GET /api/user/profile - Contract Test", () => {
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
    testUserEmail = "testuser@example.com";
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

    // Extract session token from Set-Cookie header
    const setCookieHeaders = signInResponse.headers.getSetCookie();
    expect(setCookieHeaders.length).toBeGreaterThan(0);

    // Parse the better-auth.session_token from Set-Cookie
    const sessionCookie = setCookieHeaders.find((cookie) =>
      cookie.startsWith("better-auth.session_token="),
    );
    expect(sessionCookie).toBeTruthy();

    const tokenMatch = sessionCookie!.match(
      /better-auth\.session_token=([^;]+)/,
    );
    expect(tokenMatch).toBeTruthy();
    sessionToken = decodeURIComponent(tokenMatch![1]);
  });

  test("should return user profile with correct structure", async () => {
    // Create mock request with session cookie
    const mockReq = new Request("http://localhost/api/user/profile", {
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    // AIDEV-NOTE: This will fail until T016 implements the endpoint
    // Import the controller once it exists:
    // import { userManagementController } from "@/user-management/controller";
    // const response = userManagementController["/api/user/profile"].GET(mockReq);

    // For now, directly test the action
    const { getUserProfile } = await import("@/user-management/actions");
    const result = await getUserProfile(mockReq);

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();

    // FR-001: Verify user id is returned
    expect(result.user.id).toBe(testUserId);

    // FR-002: Verify email, name, and createdAt are returned
    expect(result.user.email).toBe(testUserEmail);
    expect(result.user.name).toBe("Test User");
    expect(result.user.createdAt).toBeDefined();
    expect(typeof result.user.createdAt).toBe("number");
  });

  test("should return correct data types", async () => {
    const mockReq = new Request("http://localhost/api/user/profile", {
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    const { getUserProfile } = await import("@/user-management/actions");
    const result = await getUserProfile(mockReq);

    // Verify all fields are present with correct types
    expect(typeof result.user.id).toBe("string");
    expect(typeof result.user.email).toBe("string");
    expect(typeof result.user.name).toBe("string");
    expect(typeof result.user.createdAt).toBe("number");
  });

  test("should return the authenticated user's own data", async () => {
    // Create a second user
    const secondUserId = randomUUID();
    db.prepare(
      "INSERT INTO user (id, email, name, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(
      secondUserId,
      "seconduser@example.com",
      "Second User",
      0,
      Date.now(),
      Date.now(),
    );

    // Request profile with first user's session
    const mockReq = new Request("http://localhost/api/user/profile", {
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    const { getUserProfile } = await import("@/user-management/actions");
    const result = await getUserProfile(mockReq);

    // Should return first user's data, not second user's data
    expect(result.user.id).toBe(testUserId);
    expect(result.user.email).toBe(testUserEmail);
    expect(result.user.email).not.toBe("seconduser@example.com");
  });

  test("should not return sensitive fields like password", async () => {
    const mockReq = new Request("http://localhost/api/user/profile", {
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    const { getUserProfile } = await import("@/user-management/actions");
    const result = await getUserProfile(mockReq);

    // Ensure password field is not in the response
    expect(result.user).not.toHaveProperty("password");
    expect(result.user).not.toHaveProperty("passwordHash");
  });
});

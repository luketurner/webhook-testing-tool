import { describe, test, expect, beforeEach } from "bun:test";
import { db } from "@/db";

// T013: Integration tests for authentication requirements
// Tests FR-013 (authentication required for all user management actions)

describe("User Management - Authentication Requirements", () => {
  beforeEach(() => {
    // Clean up existing data
    db.prepare("DELETE FROM session").run();
    db.prepare("DELETE FROM account").run();
    db.prepare("DELETE FROM user").run();
  });

  test("getUserProfile should throw error when not authenticated", async () => {
    // Create mock request without session cookie
    const mockReq = new Request("http://localhost/api/user/profile", {
      headers: {},
    });

    const { getUserProfile } = await import("@/user-management/actions");

    // FR-013: Should throw "Authentication required" error
    await expect(getUserProfile(mockReq)).rejects.toThrow(
      "Authentication required",
    );
  });

  test("getUserProfile should throw error with invalid session token", async () => {
    const mockReq = new Request("http://localhost/api/user/profile", {
      headers: {
        Cookie: "better-auth.session_token=invalid-token-123",
      },
    });

    const { getUserProfile } = await import("@/user-management/actions");

    await expect(getUserProfile(mockReq)).rejects.toThrow(
      "Authentication required",
    );
  });

  test("getUserProfile should throw error with empty session token", async () => {
    const mockReq = new Request("http://localhost/api/user/profile", {
      headers: {
        Cookie: "better-auth.session_token=",
      },
    });

    const { getUserProfile } = await import("@/user-management/actions");

    await expect(getUserProfile(mockReq)).rejects.toThrow(
      "Authentication required",
    );
  });

  test("updateEmail should throw error when not authenticated", async () => {
    const mockReq = new Request("http://localhost/api/user/email", {
      headers: {},
    });

    const { updateEmail } = await import("@/user-management/actions");

    await expect(updateEmail(mockReq, "newemail@example.com")).rejects.toThrow(
      "Authentication required",
    );
  });

  test("updatePassword should throw error when not authenticated", async () => {
    const mockReq = new Request("http://localhost/api/user/password", {
      headers: {},
    });

    const { updatePassword } = await import("@/user-management/actions");

    await expect(
      updatePassword(mockReq, "oldpass", "newpass123", "newpass123"),
    ).rejects.toThrow("Authentication required");
  });

  test("updateEmail should throw error with invalid session", async () => {
    const mockReq = new Request("http://localhost/api/user/email", {
      headers: {
        Cookie: "better-auth.session_token=invalid",
      },
    });

    const { updateEmail } = await import("@/user-management/actions");

    await expect(updateEmail(mockReq, "newemail@example.com")).rejects.toThrow(
      "Authentication required",
    );
  });

  test("updatePassword should throw error with invalid session", async () => {
    const mockReq = new Request("http://localhost/api/user/password", {
      headers: {
        Cookie: "better-auth.session_token=invalid",
      },
    });

    const { updatePassword } = await import("@/user-management/actions");

    await expect(
      updatePassword(mockReq, "oldpass", "newpass123", "newpass123"),
    ).rejects.toThrow("Authentication required");
  });
});

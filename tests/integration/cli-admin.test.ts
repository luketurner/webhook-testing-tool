import "@/server-only";
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { resetDb, db } from "@/db";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { initializeAdminUser } from "@/auth/init-user";
import { Database } from "bun:sqlite";
import { unlink } from "fs/promises";

describe("CLI Admin - Integration Tests", () => {
  beforeEach(async () => {
    resetDb();
    // Seed admin user for tests
    await initializeAdminUser();
  });

  // T025: change-email integration test
  test("change-email updates database", async () => {
    // This test will fail until we implement changeEmail()
    const { changeEmail } = await import("@/cli-admin/change-email");

    // Get current admin email
    const adminBefore = db
      .query("SELECT email FROM user WHERE name = 'Admin'")
      .get() as { email: string } | undefined;
    expect(adminBefore).toBeDefined();
    const oldEmail = adminBefore!.email;

    // Change email
    const newEmail = "newemail@example.com";
    const result = await changeEmail(newEmail);

    // Verify result contains old and new email
    expect(result.oldEmail).toBe(oldEmail);
    expect(result.newEmail).toBe(newEmail);

    // Verify email changed in database
    const adminAfter = db
      .query("SELECT email FROM user WHERE name = 'Admin'")
      .get() as { email: string } | undefined;
    expect(adminAfter).toBeDefined();
    expect(adminAfter!.email).toBe(newEmail);
    expect(adminAfter!.email).not.toBe(oldEmail);
  });

  // T026: change-password integration test with actual password hashing
  test("change-password updates database with hashed password", async () => {
    // This test will fail until we implement changePassword()
    const { changePassword } = await import("@/cli-admin/change-password");

    // Get admin user
    const admin = db.query("SELECT id FROM user WHERE name = 'Admin'").get() as
      | { id: string }
      | undefined;
    expect(admin).toBeDefined();

    // Change password
    const newPassword = "NewPassword123";
    await changePassword(newPassword);

    // Verify password changed in database and is hashed
    const account = db
      .query(
        "SELECT password FROM account WHERE userId = ? AND providerId = 'credential'",
      )
      .get(admin!.id) as { password: string } | undefined;

    expect(account).toBeDefined();
    expect(account!.password).toBeDefined();

    // Verify password is hashed (contains salt:hash format)
    expect(account!.password).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);

    // Verify password hash works with verifyPassword
    const isValid = await verifyPassword({
      hash: account!.password,
      password: newPassword,
    });
    expect(isValid).toBe(true);
  });

  // T027: admin user not found error
  test("admin user not found throws error", async () => {
    // This test verifies error handling when admin doesn't exist
    // First delete the admin user (must delete dependent rows first due to FK constraints)
    const admin = db.query("SELECT id FROM user WHERE name = 'Admin'").get() as
      | { id: string }
      | undefined;
    if (admin) {
      db.run("DELETE FROM session WHERE userId = ?", [admin.id]);
      db.run("DELETE FROM account WHERE userId = ?", [admin.id]);
      db.run("DELETE FROM user WHERE id = ?", [admin.id]);
    }

    const { changeEmail } = await import("@/cli-admin/change-email");

    // Attempt to change email should throw
    await expect(changeEmail("test@example.com")).rejects.toThrow(
      "Admin user not found",
    );
  });

  // T045: export-db integration test with VACUUM INTO
  test("export-db creates valid database file with VACUUM INTO", async () => {
    // This test will fail until we implement exportDatabase()
    const { exportDatabase } = await import("@/cli-admin/export-db");

    const exportPath = "/tmp/test-export-db.db";

    // Clean up any existing file
    try {
      await unlink(exportPath);
    } catch {
      // Ignore if file doesn't exist
    }

    try {
      // Export database
      await exportDatabase(exportPath);

      // Verify file exists and is a valid SQLite database
      const exportedDb = new Database(exportPath);

      // Verify it's a valid database by running a query
      const result = exportedDb
        .query("SELECT name FROM sqlite_master WHERE type='table'")
        .all();
      expect(result.length).toBeGreaterThan(0);

      exportedDb.close();
    } finally {
      // Clean up
      try {
        await unlink(exportPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  // T046: export-db file verification (exported db contains same data)
  test("export-db preserves database data correctly", async () => {
    // This test will fail until we implement exportDatabase()
    const { exportDatabase } = await import("@/cli-admin/export-db");

    const exportPath = "/tmp/test-export-data.db";

    // Clean up any existing file
    try {
      await unlink(exportPath);
    } catch {
      // Ignore if file doesn't exist
    }

    try {
      // Get original data
      const originalUser = db
        .query("SELECT email, name FROM user WHERE name = 'Admin'")
        .get() as { email: string; name: string } | undefined;
      expect(originalUser).toBeDefined();

      // Export database
      await exportDatabase(exportPath);

      // Open exported database and verify data
      const exportedDb = new Database(exportPath);
      const exportedUser = exportedDb
        .query("SELECT email, name FROM user WHERE name = 'Admin'")
        .get() as { email: string; name: string } | undefined;

      expect(exportedUser).toBeDefined();
      expect(exportedUser!.email).toBe(originalUser!.email);
      expect(exportedUser!.name).toBe(originalUser!.name);

      exportedDb.close();
    } finally {
      // Clean up
      try {
        await unlink(exportPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  });
});

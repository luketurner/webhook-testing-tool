import "@/server-only";
import { db } from "@/db";
import { hashPassword } from "better-auth/crypto";
import { passwordSchema } from "@/cli-admin/validation";

// AIDEV-NOTE: Change password implementation - updates admin user's password in database
// Used by CLI command: wtt change-password
// Password is hashed using better-auth's Scrypt algorithm before storage

/**
 * Changes the admin user's password
 * @param newPassword - The new password (will be validated and hashed)
 * @throws Error if admin user not found or validation fails
 */
export async function changePassword(newPassword: string): Promise<void> {
  // Validate password format
  const validatedPassword = passwordSchema.parse(newPassword);

  // Find admin user
  const admin = db.query("SELECT id FROM user WHERE name = 'Admin'").get() as
    | { id: string }
    | undefined;

  if (!admin) {
    throw new Error("Admin user not found");
  }

  // Hash the password using better-auth's Scrypt algorithm
  const hashedPassword = await hashPassword(validatedPassword);

  // Update password in account table for credential provider
  db.run(
    "UPDATE account SET password = ? WHERE userId = ? AND providerId = 'credential'",
    [hashedPassword, admin.id],
  );
}

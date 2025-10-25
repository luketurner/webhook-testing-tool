import "@/server-only";
import { db } from "@/db";
import { emailSchema } from "@/cli-admin/validation";

// AIDEV-NOTE: Change email implementation - updates admin user's email in database
// Used by CLI command: bun run src/server.ts change-email <email>

/**
 * Changes the admin user's email address
 * @param newEmail - The new email address (will be validated)
 * @returns Object with oldEmail and newEmail for confirmation
 * @throws Error if admin user not found or validation fails
 */
export async function changeEmail(
  newEmail: string,
): Promise<{ oldEmail: string; newEmail: string }> {
  // Validate email format
  const validatedEmail = emailSchema.parse(newEmail);

  // Find admin user
  const admin = db
    .query("SELECT id, email FROM user WHERE name = 'Admin'")
    .get() as { id: string; email: string } | undefined;

  if (!admin) {
    throw new Error("Admin user not found");
  }

  const oldEmail = admin.email;

  // Update email in database
  db.run("UPDATE user SET email = ? WHERE id = ?", [validatedEmail, admin.id]);

  // T037: Return old email for success confirmation
  return { oldEmail, newEmail: validatedEmail };
}

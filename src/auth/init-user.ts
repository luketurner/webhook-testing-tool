import "@/server-only";
import { auth } from "./index";
import { ADMIN_USERNAME, ADMIN_PASSWORD } from "@/config";
import { db } from "@/db";
import { hashPassword, verifyPassword } from "better-auth/crypto";

// AIDEV-NOTE: This function ensures admin user exists and updates credentials if env vars changed
export async function initializeAdminUser() {
  try {
    // Check if admin user already exists
    const existingUser = db
      .query("SELECT id, email FROM user WHERE email = ? OR name = 'Admin'")
      .get(ADMIN_USERNAME) as { id: string; email: string } | undefined;

    if (!existingUser) {
      // Create admin user using better-auth's server-side API
      const result = await auth.api.signUpEmail({
        body: {
          email: ADMIN_USERNAME,
          password: ADMIN_PASSWORD,
          name: "Admin",
        },
      });

      console.log("Admin user created successfully");
      return;
    }

    // Check if we need to update the email
    if (existingUser.email !== ADMIN_USERNAME) {
      console.log(
        `Updating admin email from ${existingUser.email} to ${ADMIN_USERNAME}`,
      );
      db.prepare("UPDATE user SET email = ? WHERE id = ?").run(
        ADMIN_USERNAME,
        existingUser.id,
      );
    }

    // Check if we need to update the password
    const account = db
      .query(
        "SELECT password FROM account WHERE userId = ? AND providerId = 'credential'",
      )
      .get(existingUser.id) as { password: string } | undefined;

    if (account?.password) {
      // Verify if the current password matches the env var
      const passwordMatches = await verifyPassword({
        hash: account.password,
        password: ADMIN_PASSWORD,
      });

      if (!passwordMatches) {
        console.log("Admin password has changed, updating...");
        // Hash the new password
        const hash = await hashPassword(ADMIN_PASSWORD);

        // Update the password in the account table
        db.prepare(
          "UPDATE account SET password = ? WHERE userId = ? AND providerId = 'credential'",
        ).run(hash, existingUser.id);

        console.log("Admin password updated successfully");
      }
    }
  } catch (error) {
    console.error("Failed to initialize admin user:", error);
    throw error;
  }
}

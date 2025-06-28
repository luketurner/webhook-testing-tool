import "@/server-only";
import { auth } from "./index";
import { ADMIN_USERNAME, ADMIN_PASSWORD } from "@/config-server";
import { db } from "@/db";

export async function initializeAdminUser() {
  try {
    // Check if admin user already exists
    const existingUser = db
      .query("SELECT * FROM user WHERE email = ?")
      .get(ADMIN_USERNAME);

    if (existingUser) {
      return;
    }

    // Create admin user using better-auth's server-side API
    const result = await auth.api.signUpEmail({
      body: {
        email: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
        name: "Admin",
      },
    });

    console.log("Admin user created successfully");
  } catch (error) {
    console.error("Failed to initialize admin user:", error);
    throw error;
  }
}

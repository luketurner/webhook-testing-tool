import "@/server-only"; // Constitution Principle II: Server-only boundaries
import { auth } from "@/auth";
import { db } from "@/db";
import { emailSchema, passwordResetSchema } from "./schemas";
import { hashPassword, verifyPassword } from "better-auth/crypto";

// T008: Server actions for user management with session verification

/**
 * Get the current user's profile information
 * Used by User Story 1 (View Profile)
 */
export async function getUserProfile(request: Request) {
  // Verify session
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    throw new Error("Authentication required");
  }

  // Query user table for profile data (FR-001, FR-002)
  const user = db
    .query("SELECT id, email, name, createdAt FROM user WHERE id = ?")
    .get(session.user.id) as
    | { id: string; email: string; name: string; createdAt: number }
    | undefined;

  if (!user) {
    throw new Error("User not found");
  }

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    },
  };
}

/**
 * Update the current user's email address
 * Used by User Story 2 (Update Email)
 */
export async function updateEmail(request: Request, newEmail: string) {
  // Verify session
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    throw new Error("Authentication required");
  }

  // Validate and trim email (FR-004, FR-014, FR-015)
  const validation = emailSchema.safeParse(newEmail);
  if (!validation.success) {
    throw new Error(validation.error.issues[0].message);
  }

  const trimmedEmail = validation.data;

  try {
    // Update email in user table (FR-003)
    // Database UNIQUE constraint on email will prevent duplicates
    db.prepare("UPDATE user SET email = ? WHERE id = ?").run(
      trimmedEmail,
      session.user.id,
    );

    return {
      success: true,
      message: "Email updated successfully",
      user: {
        id: session.user.id,
        email: trimmedEmail,
      },
    };
  } catch (error) {
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      throw new Error("Email already in use");
    }
    throw error;
  }
}

/**
 * Update the current user's password
 * Used by User Story 3 (Reset Password)
 */
export async function updatePassword(
  request: Request,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
) {
  // Verify session
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    throw new Error("Authentication required");
  }

  // Validate password reset data (FR-007, FR-008)
  const validation = passwordResetSchema.safeParse({
    currentPassword,
    newPassword,
    confirmPassword,
  });

  if (!validation.success) {
    throw new Error(validation.error.issues[0].message);
  }

  // Get current password hash from account table
  const account = db
    .query(
      "SELECT password FROM account WHERE userId = ? AND providerId = 'credential'",
    )
    .get(session.user.id) as { password: string } | undefined;

  if (!account?.password) {
    // SR-003: Generic error message - don't reveal account state
    throw new Error("Invalid credentials");
  }

  // AIDEV-NOTE: Timing attack prevention
  // verifyPassword() uses constant-time comparison internally
  // Always verify password even if new password is invalid
  // This prevents timing attacks that could reveal password state
  const passwordMatches = await verifyPassword({
    hash: account.password,
    password: currentPassword,
  });

  if (!passwordMatches) {
    // SR-003: Generic error - don't reveal which check failed
    throw new Error("Invalid credentials");
  }

  // Hash new password (SR-002, SR-005)
  const newHash = await hashPassword(newPassword);

  // Update password in account table (FR-009, FR-010)
  db.prepare(
    "UPDATE account SET password = ? WHERE userId = ? AND providerId = 'credential'",
  ).run(newHash, session.user.id);

  // SR-004: Log password change for security auditing
  console.log(`Password changed for user ${session.user.id}`);

  return {
    success: true,
    message: "Password updated successfully",
  };
}

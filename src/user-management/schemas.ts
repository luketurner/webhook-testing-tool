import { z } from "zod";

// T007: Zod validation schemas for user management

// Email validation schema (FR-004, FR-014, FR-015)
// - RFC 5322 format validation
// - Max 254 characters
// - Whitespace trimmed
export const emailSchema = z
  .string()
  .trim() // FR-015: Trim whitespace before validation
  .email("Invalid email format") // FR-004: RFC 5322 format
  .max(254, "Email must be 254 characters or less"); // FR-014: Max length

// Password validation schema (FR-007, FR-007a)
// - Minimum 8 characters
// - Accepts all printable characters including unicode, emoji, spaces
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters"); // FR-007: Min length
// FR-007a: No character type restrictions - accepts unicode, emoji, spaces

// Password confirmation schema (FR-008)
// Used for password reset to ensure new password and confirmation match
export const passwordResetSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"], // Error appears on confirmPassword field
  });

// Email update schema
export const emailUpdateSchema = z.object({
  email: emailSchema,
});

// Export types for TypeScript inference
export type EmailUpdateInput = z.infer<typeof emailUpdateSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

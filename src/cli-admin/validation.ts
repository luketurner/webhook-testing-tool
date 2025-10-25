import "@/server-only";
import { z } from "zod";

/**
 * Email validation schema
 * Validates email format, normalizes to lowercase, and trims whitespace
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, "Email too short (minimum 5 characters)")
  .max(255, "Email too long (maximum 255 characters)")
  .email("Invalid email format. Example: user@example.com");

/**
 * Password validation schema
 * Enforces minimum security requirements:
 * - At least 8 characters
 * - Contains uppercase letter (A-Z)
 * - Contains lowercase letter (a-z)
 * - Contains number (0-9)
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long (maximum 128 characters)")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter (A-Z)")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter (a-z)")
  .regex(/[0-9]/, "Password must contain at least one number (0-9)");

/**
 * File path validation schema for database exports
 * Generates default filename with timestamp if no path provided
 * Validates .db extension
 */
export const filePathSchema = z
  .string()
  .optional()
  .default("")
  .transform((path) => {
    if (!path) {
      // Generate default filename with timestamp: backup-YYYY-MM-DDTHH-MM-SS.db
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19); // YYYY-MM-DDTHH-MM-SS
      return `backup-${timestamp}.db`;
    }
    return path;
  })
  .refine((path) => {
    // Ensure ends with .db extension
    return path.endsWith(".db");
  }, "Output file must have .db extension");

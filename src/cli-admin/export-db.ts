import "@/server-only";
import { db } from "@/db";
import { DB_FILE } from "@/config";
import { filePathSchema } from "@/cli-admin/validation";
import { promptConfirm } from "@/cli-admin/io";
import { stat } from "fs/promises";

// AIDEV-NOTE: Database export implementation - uses VACUUM INTO for atomic export
// Used by CLI command: wtt export-db [path]
// VACUUM INTO creates a new database file with optimized storage (removes deleted rows, defragments)

/**
 * Exports the database to a file
 * @param outputPath - The output file path (optional, generates timestamp-based name if not provided)
 * @returns Object with export details (source, output, size)
 * @throws Error if validation fails or export operation fails
 */
export async function exportDatabase(
  outputPath?: string,
): Promise<{ source: string; output: string; size: number }> {
  // T048, T050: Validate and generate default path if needed
  const validatedPath = filePathSchema.parse(outputPath);

  // T049: Check if file exists and prompt for overwrite
  try {
    await stat(validatedPath);
    // File exists, prompt for overwrite
    const shouldOverwrite = await promptConfirm(
      `\nFile '${validatedPath}' already exists. Overwrite? (y/n): `,
    );

    if (!shouldOverwrite) {
      throw new Error("Export cancelled by user");
    }
  } catch (error) {
    // File doesn't exist, continue with export
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      // Re-throw if it's not a "file not found" error
      throw error;
    }
  }

  // T051: Use VACUUM INTO to export database
  // VACUUM INTO creates a clean copy without deleted rows and with optimized storage
  // T054, T055: Error handling for database locked, permission denied, disk full, invalid path
  try {
    db.run(`VACUUM INTO '${validatedPath}'`);
  } catch (error) {
    const err = error as Error;

    // Handle specific SQLite errors
    if (
      err.message.includes("SQLITE_CANTOPEN") ||
      err.message.includes("unable to open")
    ) {
      throw new Error(
        `Cannot create export file '${validatedPath}'. Check that the directory exists and you have write permissions.`,
      );
    }

    if (
      err.message.includes("SQLITE_FULL") ||
      err.message.includes("disk full")
    ) {
      throw new Error(
        `Insufficient disk space to export database to '${validatedPath}'.`,
      );
    }

    if (
      err.message.includes("SQLITE_PERM") ||
      err.message.includes("access permission")
    ) {
      throw new Error(
        `Permission denied writing to '${validatedPath}'. Check file permissions.`,
      );
    }

    // Re-throw other errors
    throw err;
  }

  // T052: Get file size for reporting
  const stats = await stat(validatedPath);
  const fileSize = stats.size;

  return {
    source: DB_FILE,
    output: validatedPath,
    size: fileSize,
  };
}

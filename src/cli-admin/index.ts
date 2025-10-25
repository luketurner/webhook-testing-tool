import "@/server-only";

// AIDEV-NOTE: CLI command router - routes argv to appropriate command handlers
// This is the main entry point for all CLI commands

/**
 * Main CLI command router
 * Routes command-line arguments to appropriate command handlers
 * @param args - Command-line arguments (process.argv.slice(2))
 */
export async function runCliCommand(args: string[]): Promise<void> {
  const command = args[0];

  try {
    switch (command) {
      case "--help":
      case "help": {
        // T017: Wire help command into router
        const { showHelp } = await import("@/cli-admin/help");
        showHelp();
        break;
      }

      case "change-email": {
        // T032: Wire change-email command into router
        const newEmail = args[1];

        if (!newEmail) {
          console.error("Error: Missing required argument <email>");
          console.error("Usage: wtt change-email <email>");
          console.error("\nExample:");
          console.error("  wtt change-email admin@newdomain.com");
          process.exit(1);
        }

        const { changeEmail } = await import("@/cli-admin/change-email");
        const result = await changeEmail(newEmail);
        console.log(`\n✓ Admin email updated successfully`);
        console.log(`  Old email: ${result.oldEmail}`);
        console.log(`  New email: ${result.newEmail}`);
        break;
      }

      case "change-password": {
        // T033: Wire change-password command into router
        const { promptPassword } = await import("@/cli-admin/io");
        const { changePassword } = await import("@/cli-admin/change-password");

        console.log("Changing admin password...\n");

        const password1 = await promptPassword("Enter new password: ");
        const password2 = await promptPassword("Confirm new password: ");

        if (password1 !== password2) {
          console.error("\nError: Passwords do not match");
          process.exit(1);
        }

        await changePassword(password1);
        console.log("\n✓ Admin password updated successfully");
        break;
      }

      case "export-db": {
        // T053: Wire export-db command into router
        const outputPath = args[1]; // Optional path argument

        const { exportDatabase } = await import("@/cli-admin/export-db");
        const { formatFileSize } = await import("@/cli-admin/io");

        console.log("Exporting database...\n");

        const result = await exportDatabase(outputPath);

        // T056: Success confirmation with source, output, and size details
        console.log("\n✓ Database exported successfully");
        console.log(`  Source: ${result.source}`);
        console.log(`  Output: ${result.output}`);
        console.log(`  Size: ${formatFileSize(result.size)}`);
        break;
      }

      default:
        // Unrecognized command - show brief help
        console.error(`Error: Unrecognized command '${command}'\n`);
        console.error("Available commands:");
        console.error(
          "  change-email <email>  - Change admin user's email address",
        );
        console.error("  change-password       - Change admin user's password");
        console.error("  export-db [path]      - Export database to file");
        console.error("  --help                - Show this help message");
        console.error("");
        console.error("Run 'wtt --help' for more information.");
        process.exit(1);
    }
  } catch (error) {
    // T036: Better error messages for validation and other errors
    if (error instanceof Error) {
      // Check for Zod validation errors
      if (error.constructor.name === "ZodError") {
        const zodError = error as any;
        const firstIssue = zodError.issues?.[0];
        if (firstIssue) {
          console.error(`\nError: ${firstIssue.message}`);
          process.exit(1);
        }
      }

      // Check for database locked error (T034)
      if (
        error.message.includes("database is locked") ||
        error.message.includes("SQLITE_BUSY")
      ) {
        console.error(
          "\nError: Database is currently locked (server may be running)",
        );
        console.error("Please stop the server before running admin commands");
        process.exit(1);
      }

      // T035: Admin user not found - already handled by changeEmail/changePassword
      // Default error message
      console.error(`\nError: ${error.message}`);
    } else {
      console.error("\nError executing command:", error);
    }
    process.exit(1);
  }
}

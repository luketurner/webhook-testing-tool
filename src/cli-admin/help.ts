import "@/server-only";

/**
 * Help text generation for CLI commands
 * Provides comprehensive usage information
 */

/**
 * Display help text for all CLI commands
 * Shows usage, commands, examples, and notes
 */
export function showHelp(): void {
  console.log(`WTT Database Admin CLI

Usage:
  wtt                     (starts WTT server - default behavior)
  wtt [command] [args...]

Commands:
  change-email <email>    Change admin user's email address
                          Updates immediately (no confirmation email)

  change-password         Change admin user's password (interactive prompt)
                          Minimum 8 characters
                          Must contain: uppercase, lowercase, number

  export-db [path]        Export database to file for backup
                          Default filename: backup-YYYY-MM-DDTHH-MM-SS.db

  --help, help            Show this help message

Examples:
  # Change admin email to new address
  wtt change-email admin@newdomain.com

  # Change admin password (will prompt twice for confirmation)
  wtt change-password

  # Export database with automatic timestamp filename
  wtt export-db

  # Export database to specific location
  wtt export-db /backups/wtt-2025-10-25.db
`);
}

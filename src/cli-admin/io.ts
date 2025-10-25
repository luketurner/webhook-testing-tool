import "@/server-only";

/**
 * Console I/O utilities for CLI commands
 * Provides password masking and user prompts
 */

/**
 * Prompt user for password with masking
 * Reads from process.stdin as async iterable with raw mode enabled
 * @param prompt - The prompt message to display
 * @returns The password entered by user
 */
export async function promptPassword(prompt: string): Promise<string> {
  // Write prompt to stdout
  await Bun.write(Bun.stdout, prompt);

  // Set stdin to raw mode to prevent echoing
  process.stdin.setRawMode(true);

  let password = "";

  try {
    // Read from stdin as async iterable
    for await (const chunk of process.stdin.iterator({
      destroyOnReturn: false,
    })) {
      const char = chunk.toString();

      // Check for Enter key (newline)
      if (char === "\n" || char === "\r") {
        break;
      }

      // Check for Ctrl+C
      if (char === "\x03") {
        process.exit(0);
      }

      // Check for backspace/delete
      if (char === "\x7f" || char === "\b") {
        if (password.length > 0) {
          password = password.slice(0, -1);
        }
        continue;
      }

      // Add character to password
      password += char;
    }
  } finally {
    // Always restore normal mode
    process.stdin.setRawMode(false);
  }

  // Write newline after password input
  await Bun.write(Bun.stdout, "\n");

  return password;
}

/**
 * Prompt user for yes/no confirmation
 * @param prompt - The prompt message to display
 * @returns true if user entered 'y' or 'yes', false otherwise
 */
export async function promptConfirm(prompt: string): Promise<boolean> {
  const stdin = Bun.stdin.stream();
  const reader = stdin.getReader();

  // Write prompt to stdout
  await Bun.write(Bun.stdout, prompt);

  // Read user input
  const { value } = await reader.read();
  reader.releaseLock();

  if (!value) return false;

  const input = new TextDecoder().decode(value).trim().toLowerCase();
  return input === "y" || input === "yes";
}

/**
 * Format file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.2 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

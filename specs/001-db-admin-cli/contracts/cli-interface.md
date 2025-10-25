# Contract: CLI Interface

**Version**: 1.0.0
**Date**: 2025-10-25

## Overview

This contract defines the overall CLI interface behavior for the WTT application when executed with command-line arguments.

## Executable

```bash
bun run src/server.ts [command] [arguments...]
```

## Mode Detection

The application MUST detect its operating mode based on `process.argv`:

| Condition | Mode | Behavior |
|-----------|------|----------|
| `process.argv.length <= 2` | Server Mode | Start web servers (default behavior) |
| `process.argv[2]` is recognized command | CLI Mode | Execute CLI command and exit |
| `process.argv[2]` is unrecognized | Error Mode | Show error + help and exit with code 1 |

## Recognized Commands

- `change-email <email>`
- `change-password`
- `export-db [path]`
- `--help` or `help`

## Exit Codes

| Code | Meaning | Scenarios |
|------|---------|-----------|
| 0 | Success | Command completed successfully; or server mode started |
| 1 | Error | Invalid input, command failed, or unrecognized command |

## Error Output Format

All errors MUST be written to stderr with the following format:

```
Error: <Brief description>
<Detailed explanation if needed>

<Actionable guidance>
```

Example:
```
Error: Unrecognized command 'foo'

Run 'bun run src/server.ts --help' to see available commands.
```

## Success Output Format

All success messages MUST be written to stdout with a checkmark prefix:

```
✓ <Success message>
  <Additional details>
```

Example:
```
✓ Admin email updated successfully
  Old email: admin@example.com
  New email: newemail@example.com
```

## Contract Test Cases

### TC-1: Default Behavior (No Arguments)

**Input**:
```bash
bun run src/server.ts
```

**Expected Behavior**:
- Server starts normally
- No CLI handler executed
- Application remains running

### TC-2: Recognized Command

**Input**:
```bash
bun run src/server.ts change-email test@example.com
```

**Expected Behavior**:
- CLI handler executes
- Application exits after command completes
- Exit code indicates success (0) or failure (1)

### TC-3: Unrecognized Command

**Input**:
```bash
bun run src/server.ts invalid-command
```

**Expected Output (stderr)**:
```
Error: Unrecognized command 'invalid-command'

Available commands:
  change-email <email>  - Change admin user's email address
  change-password       - Change admin user's password
  export-db [path]      - Export database to file
  --help                - Show this help message

Run 'bun run src/server.ts --help' for more information.
```

**Expected Exit Code**: 1

### TC-4: Help Command

**Input**:
```bash
bun run src/server.ts --help
```

**Expected Output (stdout)**:
```
WTT Database Admin CLI

Usage: bun run src/server.ts [command] [arguments...]

Commands:
  change-email <email>  - Change admin user's email address
  change-password       - Change admin user's password (interactive)
  export-db [path]      - Export database to file for backup
  --help                - Show this help message

Examples:
  bun run src/server.ts change-email admin@newdomain.com
  bun run src/server.ts change-password
  bun run src/server.ts export-db /backups/wtt-backup.db

For more information, see: specs/001-db-admin-cli/quickstart.md
```

**Expected Exit Code**: 0

## Non-Functional Requirements

### Performance
- CLI mode detection MUST complete in <100ms
- CLI startup overhead (arg parsing, imports) MUST be <100ms

### Compatibility
- MUST work on Linux, macOS, and Windows where Bun is supported
- MUST preserve all existing server functionality when no args provided

### Security
- MUST NOT echo sensitive data (passwords, hashes) to stdout/stderr
- MUST use secure password input methods (Bun.password())

## Implementation Notes

### Early Detection Pattern

CLI mode detection MUST occur before any server initialization:

```typescript
// At the very top of src/server.ts, before other imports
const args = process.argv.slice(2);

if (args.length > 0) {
  // CLI mode - import handler and execute
  const { runCliCommand } = await import("@/cli-admin");
  await runCliCommand(args);
  process.exit(0);  // Exit after CLI command (don't start servers)
}

// Original server startup continues below...
```

This ensures:
1. Server modules aren't loaded unnecessarily
2. No server initialization side effects occur
3. CLI commands execute quickly

### Backward Compatibility

The default behavior (no arguments) MUST remain unchanged:
- Server starts normally
- All existing functionality preserved
- No breaking changes to deployment scripts

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-25 | Initial contract definition |

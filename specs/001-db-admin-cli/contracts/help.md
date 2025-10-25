# Contract: --help Command

**Version**: 1.0.0
**Date**: 2025-10-25

## Command Signature

```bash
bun run src/server.ts --help
# or
bun run src/server.ts help
```

## Arguments

None.

## Success Case

### Input Example
```bash
bun run src/server.ts --help
```

### Expected Output (stdout)
```
WTT Database Admin CLI

Usage:
  bun run src/server.ts [command] [arguments...]

Commands:
  change-email <email>    Change admin user's email address
  change-password         Change admin user's password (interactive)
  export-db [path]        Export database to file for backup
  --help, help            Show this help message

Examples:
  # Change admin email
  bun run src/server.ts change-email admin@newdomain.com

  # Change admin password (prompts for new password)
  bun run src/server.ts change-password

  # Export database with default filename
  bun run src/server.ts export-db

  # Export database to specific path
  bun run src/server.ts export-db /backups/wtt-2025-10-25.db

Notes:
  - Server must be stopped before running admin commands
  - CLI commands require write access to the database
  - Default behavior (no arguments) starts the WTT server

For more information:
  Documentation: specs/001-db-admin-cli/quickstart.md
  Repository: https://github.com/luketurner/wtt
```

### Expected Exit Code
`0`

## Alternative Invocations

Both of these MUST work identically:
- `bun run src/server.ts --help`
- `bun run src/server.ts help`

## Help Output Format Requirements

### Structure
The help output MUST follow this structure:
1. **Title**: Application name and feature
2. **Usage**: Basic command syntax
3. **Commands**: List of all available commands with brief descriptions
4. **Examples**: Practical usage examples for each command
5. **Notes**: Important usage information and constraints
6. **References**: Links to additional documentation

### Formatting Rules
- Use consistent indentation (2 spaces)
- Align command descriptions at a consistent column
- Keep descriptions brief (one line per command)
- Examples should be copy-paste ready
- Use section headers for clarity

## Contract Test Cases

### Test: Help Flag
```typescript
test("help: --help flag", async () => {
  const result = await runCLI(["--help"]);

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("WTT Database Admin CLI");
  expect(result.stdout).toContain("Usage:");
  expect(result.stdout).toContain("Commands:");
  expect(result.stdout).toContain("Examples:");
  expect(result.stdout).toContain("change-email");
  expect(result.stdout).toContain("change-password");
  expect(result.stdout).toContain("export-db");
});
```

### Test: Help Command
```typescript
test("help: help command", async () => {
  const result = await runCLI(["help"]);

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("WTT Database Admin CLI");

  // Should be identical to --help output
  const helpFlagResult = await runCLI(["--help"]);
  expect(result.stdout).toBe(helpFlagResult.stdout);
});
```

### Test: Help Content Completeness
```typescript
test("help: contains all commands", async () => {
  const result = await runCLI(["--help"]);

  // All commands must be documented
  expect(result.stdout).toContain("change-email");
  expect(result.stdout).toContain("change-password");
  expect(result.stdout).toContain("export-db");
  expect(result.stdout).toContain("--help");

  // All commands must have examples
  expect(result.stdout).toContain("bun run src/server.ts change-email");
  expect(result.stdout).toContain("bun run src/server.ts change-password");
  expect(result.stdout).toContain("bun run src/server.ts export-db");
});
```

### Test: Help Output Format
```typescript
test("help: proper formatting", async () => {
  const result = await runCLI(["--help"]);

  // Should have clear sections
  expect(result.stdout).toMatch(/Usage:\s+bun run src\/server\.ts/);
  expect(result.stdout).toMatch(/Commands:\s+change-email/);
  expect(result.stdout).toMatch(/Examples:\s+# /);
  expect(result.stdout).toMatch(/Notes:\s+- /);
});
```

## Dynamic Help Content

If new commands are added to the CLI in the future, the help output MUST be updated to include them. The help text should be generated from command registry, not hardcoded.

**Recommended implementation**:
```typescript
interface CommandInfo {
  name: string;
  description: string;
  usage: string;
  example: string;
}

const commands: CommandInfo[] = [
  {
    name: "change-email",
    description: "Change admin user's email address",
    usage: "change-email <email>",
    example: "bun run src/server.ts change-email admin@newdomain.com"
  },
  // ... other commands
];

function generateHelp(): string {
  // Generate help from command registry
}
```

This ensures help stays in sync with available commands.

## Accessibility Requirements

- Help text MUST be readable in 80-column terminals
- Help text MUST work with screen readers (plain text, no ASCII art)
- Help text MUST use consistent terminology

## Localization Considerations

Currently, help text is English-only. If localization is added in the future:
- Help language should match system locale or environment variable
- All commands remain English (not translated)
- Descriptions and notes should be translated

## Version Information

Help output does NOT include version information currently. If versioning is needed, add:
```
WTT Database Admin CLI v2.6.0
```

at the top of help output.

## Error Output (Unrecognized Command)

When an unrecognized command is provided, a condensed help message should be shown:

### Input Example
```bash
bun run src/server.ts invalid-command
```

### Expected Output (stderr)
```
Error: Unrecognized command 'invalid-command'

Available commands:
  change-email <email>  - Change admin user's email address
  change-password       - Change admin user's password
  export-db [path]      - Export database to file
  --help                - Show this help message

Run 'bun run src/server.ts --help' for more information.
```

### Expected Exit Code
`1`

This provides immediate guidance without overwhelming the user with full help text.

## Content Maintenance

When the CLI evolves, the following help content MUST be updated:

1. **New Commands**: Add to commands list, examples, and command registry
2. **Changed Arguments**: Update usage patterns and examples
3. **New Features**: Add to notes section if user-impacting
4. **Deprecations**: Mark deprecated commands with "(deprecated)" in description
5. **Breaking Changes**: Add warning to notes section

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-25 | Initial contract definition |

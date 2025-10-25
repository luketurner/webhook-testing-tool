# CLI Contracts: Database Admin CLI

**Feature**: Database Admin CLI (001-db-admin-cli)
**Date**: 2025-10-25
**Purpose**: Define executable contracts for all CLI commands

## Overview

This directory contains contract definitions for the Database Admin CLI feature. Each contract specifies:
- Command signature (arguments, flags)
- Expected outputs (stdout, stderr)
- Exit codes
- Behavior under error conditions

## Contract Files

- **[cli-interface.md](./cli-interface.md)**: Overall CLI interface contract
- **[change-email.md](./change-email.md)**: `change-email` command contract
- **[change-password.md](./change-password.md)**: `change-password` command contract
- **[export-db.md](./export-db.md)**: `export-db` command contract
- **[help.md](./help.md)**: `--help` command contract

## Testing Strategy

Contracts are tested using contract tests in `/tests/contract/cli-admin.test.ts`. Each test:

1. **Spawns CLI process**: Executes actual command as subprocess
2. **Captures output**: Records stdout, stderr, and exit code
3. **Validates contract**: Asserts output matches contract specification
4. **Tests edge cases**: Verifies error handling as specified

Example test structure:
```typescript
import { spawnSync } from "bun";

test("change-email contract: success case", () => {
  const result = spawnSync([
    "bun",
    "run",
    "src/server.ts",
    "change-email",
    "new@example.com"
  ]);

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("✓ Admin email updated successfully");
  expect(result.stdout).toContain("New email: new@example.com");
});
```

## Contract Compliance

All implementations MUST strictly adhere to their contracts. Any deviation requires:
1. Contract update (with version bump)
2. Test updates to match new contract
3. Documentation updates (quickstart.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-25 | Initial contract definitions |

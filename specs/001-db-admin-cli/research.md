# Research Findings: Database Admin CLI

**Feature**: Database Admin CLI (001-db-admin-cli)
**Date**: 2025-10-25
**Purpose**: Resolve technical questions and design decisions for CLI implementation

## Research Questions & Answers

### Q1: CLI Argument Parsing

**Question**: How to parse arguments using Bun's built-in capabilities without external libraries?

**Answer**: Use `process.argv` directly with simple pattern matching. Bun's process object is Node.js compatible.

**Implementation Strategy**:
```typescript
const args = process.argv.slice(2); // Skip 'bun' and 'src/server.ts'
const command = args[0]; // e.g., 'change-email', 'change-password', 'export-db', '--help'
const commandArgs = args.slice(1); // Remaining arguments

// Command routing
switch (command) {
  case 'change-email':
    // commandArgs[0] = new email
  case 'change-password':
    // No args, prompt interactively
  case 'export-db':
    // commandArgs[0] = optional output path
  case '--help':
  case 'help':
    // Show help
  default:
    // Unknown command or no args (start server)
}
```

**References**:
- Bun documentation: process.argv is standard Node.js API
- WTT codebase already uses process.env extensively in src/config.ts

**Decision**: No external CLI library needed. Use simple switch statement for command routing.

---

### Q2: Password Hashing Integration

**Question**: How does better-auth hash passwords, and how can we reuse that logic?

**Answer**: Better-auth uses Scrypt algorithm from `@noble/hashes/scrypt` library with well-defined parameters.

**Implementation Details**:
- **Algorithm**: Scrypt key derivation function
- **Library**: `@noble/hashes/scrypt` (via better-auth)
- **Parameters**:
  - N: 16,384 (CPU/memory cost)
  - r: 16 (block size)
  - p: 1 (parallelization)
  - dkLen: 64 (derived key length in bytes)
- **Format**: `hexEncode(salt):hexEncode(derivedKey)` where salt is 16 random bytes

**Direct Import Available**:
```typescript
import { hashPassword, verifyPassword } from "better-auth/crypto";

// Usage
const hash = await hashPassword("newPassword123"); // Returns: "salt:hash"
const isValid = await verifyPassword({
  hash: existingHash,
  password: "userInputPassword"
}); // Returns: boolean
```

**Current Usage in Codebase**:
- `/workspace/src/auth/init-user.ts` (lines 5, 57): Admin user initialization
- `/workspace/src/user-management/actions.ts` (lines 5, 140): Password update action

**Decision**: Import and use `hashPassword` from `better-auth/crypto` directly. This ensures compatibility with existing passwords and maintains security standards.

---

### Q3: Admin User Identification

**Question**: How is the admin user identified in the database (role, flag, or specific record)?

**Answer**: The admin user is identified by `name = 'Admin'` in the `user` table. There is no role-based access control system.

**Database Schema**:
```sql
-- User table (from migration 1748202268143)
CREATE TABLE "user" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,              -- Admin identified here
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" INTEGER NOT NULL,
  "image" TEXT,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL
);

-- Account table (stores credentials)
CREATE TABLE "account" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,        -- Must be 'credential' for email/password
  "userId" TEXT NOT NULL REFERENCES "user" ("id"),
  "password" TEXT,                   -- Hashed password stored here
  -- ... other fields
);
```

**Admin User Query Pattern** (from `/workspace/src/auth/init-user.ts:12`):
```typescript
const existingUser = db
  .query("SELECT id, email FROM user WHERE email = ? OR name = 'Admin'")
  .get(ADMIN_USERNAME);
```

**Key Fields**:
- Admin Email: `user.email` (must be unique)
- Admin Password Hash: `account.password` (where `account.providerId = 'credential'` and `account.userId = admin's user.id`)
- Admin Identifier: `user.name = 'Admin'` (constant string)

**Decision**: Query for admin user using `WHERE name = 'Admin'`. Update email in `user` table and password in `account` table where `providerId = 'credential'`.

---

### Q4: Database File Locking

**Question**: How to detect and handle SQLite database file locks?

**Answer**: SQLite uses file-level locking. Bun's better-sqlite3 binding will throw an error if the database is locked.

**Locking Scenarios**:
1. **Server running**: Database is open with WAL mode (`PRAGMA journal_mode = WAL`)
2. **Another process**: Another instance of WTT or SQLite tool has exclusive lock
3. **Backup in progress**: During `VACUUM INTO` operation

**Error Detection**:
```typescript
try {
  const db = new Database(DB_FILE);
  // Perform operation
} catch (error) {
  if (error.message.includes('database is locked')) {
    console.error('Error: Database is locked by another process.');
    console.error('Please stop the WTT server before running admin commands.');
    process.exit(1);
  }
  throw error;
}
```

**Current Database Configuration** (from `/workspace/src/db/index.ts:48-53`):
```typescript
export const db = new Database(DB_FILE, { create: true, strict: true });
db.run("PRAGMA journal_mode = WAL"); // Write-Ahead Logging mode
db.run("PRAGMA foreign_keys = ON");
```

**WAL Mode Implications**:
- Multiple readers can access database simultaneously
- Only one writer at a time
- CLI operations (updates, exports) need write access
- Server must be stopped for CLI operations to guarantee consistency

**Decision**:
1. Attempt database operation in try-catch
2. If "database is locked" error occurs, show clear message: "Stop the WTT server before running admin commands"
3. Exit with code 1 (error)
4. Document in quickstart.md that server must be stopped

---

### Q5: Password Masking

**Question**: How to mask password input in terminal using Bun APIs?

**Answer**: Use Bun's `Bun.password()` API for secure password input.

**Bun Password API**:
```typescript
// Built-in Bun API for password input
const password = await Bun.password("Enter new password: ", {
  mask: "*", // Optional: character to display (default is to hide completely)
});
```

**Features**:
- Automatically disables echo in terminal
- Cross-platform (Linux, macOS, Windows)
- Returns typed input as string
- No external dependencies needed

**Fallback for Confirmation**:
```typescript
const newPassword = await Bun.password("Enter new password: ");
const confirmPassword = await Bun.password("Confirm new password: ");

if (newPassword !== confirmPassword) {
  console.error("Error: Passwords do not match");
  process.exit(1);
}
```

**Decision**: Use `Bun.password()` for all password inputs. Implement password confirmation prompt for safety.

---

### Q6: File Copy for Export

**Question**: Best practice for copying SQLite database files (simple copy vs. backup API)?

**Answer**: Use SQLite's `VACUUM INTO` command for safe exports. This is better than file copy because it:
1. Creates a compacted copy (removes fragmentation)
2. Ensures consistent snapshot even with concurrent reads
3. Validates database integrity during export
4. Works correctly with WAL mode

**VACUUM INTO Syntax**:
```typescript
import { Database } from "bun:sqlite";

const sourceDb = new Database(DB_FILE, { readonly: true });
sourceDb.run(`VACUUM INTO '${outputPath}'`);
sourceDb.close();
```

**Advantages over File Copy**:
- **Consistency**: VACUUM INTO creates a consistent snapshot (important with WAL mode)
- **Compaction**: Removes deleted data and fragmentation (smaller export file)
- **Integrity**: SQLite validates database structure during VACUUM
- **Safety**: Can export while readers are active (though we'll require server stop)

**Timestamp Format** (from spec: `backup-YYYY-MM-DD-HH-MM-SS.db`):
```typescript
const timestamp = new Date().toISOString()
  .replace(/[:.]/g, '-')  // Replace colons and periods
  .slice(0, 19);          // Keep up to seconds: YYYY-MM-DDTHH-MM-SS
const defaultFilename = `backup-${timestamp}.db`;
```

**Decision**: Use `VACUUM INTO` for exports. Add file existence check before export. Prompt for overwrite confirmation if file exists.

---

## Technology Stack Summary

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **CLI Parsing** | Bun `process.argv` | No external dependencies, sufficient for simple commands |
| **Password Hashing** | better-auth/crypto | Already used in codebase, maintains compatibility |
| **Password Input** | `Bun.password()` | Built-in, secure, cross-platform |
| **Database Export** | SQLite `VACUUM INTO` | Safe, consistent, compacts database |
| **Input Validation** | Zod schemas | Project standard for all validation |
| **Error Handling** | Try-catch with exit codes | Standard CLI pattern |
| **Database Access** | better-sqlite3 via Bun | Already configured in project |

---

## Key Design Decisions

### 1. Command Interface Pattern

**Chosen**: Subcommand pattern with imperative verbs
```bash
wtt change-email <email>
wtt change-password
wtt export-db [path]
wtt --help
```

**Rationale**:
- Clear, self-documenting commands
- Follows Unix convention (git, docker, etc.)
- Easy to extend with new commands
- No ambiguity in parsing

### 2. Server vs CLI Mode Detection

**Chosen**: Check `process.argv.length` in src/server.ts before starting servers

```typescript
// At top of src/server.ts (before imports that start servers)
if (process.argv.length > 2) {
  // CLI mode - import and run CLI handler
  const { runCliCommand } = await import("@/cli-admin");
  await runCliCommand(process.argv.slice(2));
  process.exit(0);
}

// Original server startup code continues...
```

**Rationale**:
- Minimal change to existing entrypoint
- Preserves default server behavior (no args = start server)
- Prevents accidental server startup during CLI operations
- Early exit avoids loading unnecessary server modules

### 3. Database Operation Strategy

**Chosen**: Open dedicated database connection for CLI operations (separate from server's `db` export)

```typescript
import { Database } from "bun:sqlite";
import { DB_FILE } from "@/config";

// Don't import `db` from "@/db" - that triggers all server initialization
const cliDb = new Database(DB_FILE, { strict: true });
```

**Rationale**:
- Avoids importing server initialization code
- Faster startup (doesn't load server modules)
- Cleaner separation of concerns
- Easier to handle database locking errors

### 4. Error Message Strategy

**Chosen**: User-friendly errors with actionable guidance

Example error formats:
```
Error: Invalid email format: 'notanemail'
Valid format: user@example.com

Error: Password must meet requirements:
  - At least 8 characters
  - Contains uppercase letter (A-Z)
  - Contains lowercase letter (a-z)
  - Contains number (0-9)

Error: Database is locked by another process
Action: Stop the WTT server before running admin commands
  $ kill <server-pid>
```

**Rationale**: Meets SC-004 (actionable error messages), reduces support burden

---

## Integration Points Reference

### Files to Import From

1. **Password Hashing**: `better-auth/crypto`
   - `hashPassword(password: string): Promise<string>`
   - `verifyPassword({ hash, password }): Promise<boolean>`

2. **Database Access**: Direct SQLite connection
   - Don't use `@/db` export (triggers server init)
   - Use `new Database(DB_FILE)` directly

3. **Configuration**: `@/config`
   - `DB_FILE` constant (database file path)

4. **Validation**: Create new Zod schemas in `src/cli-admin/validation.ts`
   - Email validation schema
   - Password validation schema
   - File path validation schema

### Files to Modify

1. **src/server.ts**: Add CLI mode detection at top (before server imports)
2. **tests/**: Add new test files for CLI functionality

### Files to Create

All new files in `src/cli-admin/` directory (see plan.md Project Structure)

---

## Security Considerations

1. **Password Storage**: Always use `hashPassword()` before storing - never store plaintext
2. **Password Input**: Always use `Bun.password()` to prevent terminal history logging
3. **Database Locking**: Require server stop to prevent race conditions
4. **Email Validation**: Validate format before database update
5. **Error Messages**: Never include sensitive data (passwords, hashes) in error output
6. **Exit Codes**: Use standard codes (0=success, 1=error) for scripting compatibility

---

## Testing Strategy

### Contract Tests
- Input: command line args
- Output: stdout/stderr messages
- Exit codes: 0 (success) or 1 (error)

### Integration Tests
- Use test database (NODE_ENV=test)
- Verify actual database changes
- Test with real better-auth password hashing
- Verify password login after change

### Unit Tests
- Validation schemas (Zod)
- Help text generation
- File path utilities
- Error message formatting

---

## Performance Estimates

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| Change email | <1 second | Single UPDATE query |
| Change password | 1-2 seconds | Includes Scrypt hashing (~1s) + UPDATE |
| Export 100MB DB | ~5 seconds | VACUUM INTO with SSD |
| Export 1GB DB | ~60 seconds | VACUUM INTO with SSD (meets SC-002 <5min) |
| CLI startup | <100ms | Minimal imports, no server startup |

All times meet or exceed success criteria from spec.md.

---

## Open Questions / Assumptions

✅ **Resolved**: All research questions answered

**Assumptions documented**:
1. Server will be stopped during CLI operations (user responsibility)
2. File system permissions are adequate (user's environment)
3. Database is not corrupted (SQLite integrity assumed)
4. One admin user per instance (current WTT behavior)

---

## Next Steps

1. ✅ Research complete - all questions answered
2. → Generate data-model.md (Phase 1)
3. → Generate contracts/ (Phase 1)
4. → Generate quickstart.md (Phase 1)
5. → Update agent context (Phase 1)
6. → Generate tasks.md (Phase 2 - separate command)

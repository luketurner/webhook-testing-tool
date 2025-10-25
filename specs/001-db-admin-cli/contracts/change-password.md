# Contract: change-password Command

**Version**: 1.0.0
**Date**: 2025-10-25

## Command Signature

```bash
bun run src/server.ts change-password
```

## Arguments

None. This command is fully interactive with password prompts.

## Success Case

### Input Example
```bash
bun run src/server.ts change-password
```

### Interactive Prompts
```
Enter new password: **********
Confirm new password: **********
```

**Note**: Password input MUST be masked using `Bun.password()` API.

### Expected Output (stdout)
```
✓ Admin password updated successfully
  You can now log in with your new password.
```

### Expected Exit Code
`0`

### Database State Changes
- `account.password` updated to new hash (format: `salt:hash`)
- `account.updatedAt` updated to current timestamp
- Existing sessions remain valid (users are NOT logged out)

## Error Cases

### EC-1: Passwords Don't Match

**Input**:
```bash
bun run src/server.ts change-password
```

**Interactive Input**:
```
Enter new password: MyPassword123
Confirm new password: DifferentPassword
```

**Expected Output (stderr)**:
```
Error: Passwords do not match

Please try again and ensure both passwords are identical.
```

**Expected Exit Code**: `1`

**No Database Changes**: Password is NOT updated

---

### EC-2: Password Too Short

**Input**:
```bash
bun run src/server.ts change-password
```

**Interactive Input**:
```
Enter new password: Short1
Confirm new password: Short1
```

**Expected Output (stderr)**:
```
Error: Password does not meet security requirements

Password must:
  • Be at least 8 characters long
  • Contain at least one uppercase letter (A-Z)
  • Contain at least one lowercase letter (a-z)
  • Contain at least one number (0-9)

Your password failed: Be at least 8 characters long
```

**Expected Exit Code**: `1`

---

### EC-3: Password Missing Uppercase

**Input**:
```bash
bun run src/server.ts change-password
```

**Interactive Input**:
```
Enter new password: lowercase123
Confirm new password: lowercase123
```

**Expected Output (stderr)**:
```
Error: Password does not meet security requirements

Password must:
  • Be at least 8 characters long
  • Contain at least one uppercase letter (A-Z)
  • Contain at least one lowercase letter (a-z)
  • Contain at least one number (0-9)

Your password failed: Contain at least one uppercase letter (A-Z)
```

**Expected Exit Code**: `1`

---

### EC-4: Password Missing Lowercase

**Input**:
```bash
bun run src/server.ts change-password
```

**Interactive Input**:
```
Enter new password: UPPERCASE123
Confirm new password: UPPERCASE123
```

**Expected Output (stderr)**:
```
Error: Password does not meet security requirements

Password must:
  • Be at least 8 characters long
  • Contain at least one uppercase letter (A-Z)
  • Contain at least one lowercase letter (a-z)
  • Contain at least one number (0-9)

Your password failed: Contain at least one lowercase letter (a-z)
```

**Expected Exit Code**: `1`

---

### EC-5: Password Missing Number

**Input**:
```bash
bun run src/server.ts change-password
```

**Interactive Input**:
```
Enter new password: NoNumbers
Confirm new password: NoNumbers
```

**Expected Output (stderr)**:
```
Error: Password does not meet security requirements

Password must:
  • Be at least 8 characters long
  • Contain at least one uppercase letter (A-Z)
  • Contain at least one lowercase letter (a-z)
  • Contain at least one number (0-9)

Your password failed: Contain at least one number (0-9)
```

**Expected Exit Code**: `1`

---

### EC-6: Admin User Not Found

**Input**:
```bash
bun run src/server.ts change-password
```

**Expected Output (stderr)**:
```
Error: Admin user not found

The admin user could not be found in the database.
This may indicate database corruption or misconfiguration.

Please contact support or check database integrity.
```

**Expected Exit Code**: `1`

**Note**: This error occurs before password prompts if admin is missing.

---

### EC-7: Database Locked

**Input**:
```bash
bun run src/server.ts change-password
# While WTT server is running
```

**Expected Output (stderr)**:
```
Error: Database is locked

The database is currently locked by another process (likely the WTT server).

Action required:
  1. Stop the WTT server:
     - Find process: ps aux | grep 'src/server.ts'
     - Kill process: kill <pid>
  2. Run the command again

Alternatively, run CLI commands during planned downtime.
```

**Expected Exit Code**: `1`

---

### EC-8: Database Error (General)

**Input**:
```bash
bun run src/server.ts change-password
# After successful password input
```

**Expected Output (stderr)**:
```
Error: Database operation failed

Unable to update admin password due to a database error:
<error details>

Please check:
  - Database file permissions
  - Database file integrity
  - Available disk space

If the problem persists, contact support.
```

**Expected Exit Code**: `1`

## Validation Rules

The following validations MUST be performed:

1. **Admin Exists**: Query for admin user before prompting
2. **Password Length**: Minimum 8 characters, maximum 128 characters
3. **Password Uppercase**: At least one character in [A-Z]
4. **Password Lowercase**: At least one character in [a-z]
5. **Password Number**: At least one character in [0-9]
6. **Password Match**: Confirmation must exactly match original

## Password Security Requirements

### Input Security
- MUST use `Bun.password()` API for all password input
- MUST NOT echo passwords to terminal
- MUST NOT log passwords in any form
- MUST mask password with asterisks or hide completely

### Storage Security
- MUST hash password using `hashPassword()` from better-auth/crypto
- MUST NEVER store plaintext passwords
- Hash format MUST be: `hexEncode(salt):hexEncode(derivedKey)`
- MUST use Scrypt algorithm (via better-auth)

### Hashing Parameters
- Algorithm: Scrypt
- N: 16,384 (CPU/memory cost)
- r: 16 (block size)
- p: 1 (parallelization)
- dkLen: 64 (derived key length)
- Salt: 16 random bytes

## Performance Requirements

- Command execution MUST complete in <30 seconds (SC-001)
- Typical execution time: 1-2 seconds (including Scrypt hashing ~1s)
- Password hashing time: ~1 second (acceptable for security)

## Database Operations

### Query Sequence

1. **Find Admin User**:
   ```sql
   SELECT id FROM user WHERE name = 'Admin' LIMIT 1;
   ```

2. **Find Admin Account**:
   ```sql
   SELECT id FROM account
   WHERE userId = ? AND providerId = 'credential'
   LIMIT 1;
   ```

3. **Update Password**:
   ```sql
   UPDATE account
   SET password = ?,
       updatedAt = CURRENT_TIMESTAMP
   WHERE userId = ? AND providerId = 'credential'
   RETURNING id;
   ```

## Contract Test Cases

### Test: Success Case
```typescript
test("change-password: success", async () => {
  const result = await runCLIWithInput(["change-password"], {
    inputs: ["NewPassword123", "NewPassword123"]  // Simulated input
  });

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("✓ Admin password updated successfully");

  // Verify password was hashed correctly
  const account = getAdminAccount();
  expect(account.password).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);

  // Verify new password works for login
  const canLogin = await verifyPassword({
    hash: account.password,
    password: "NewPassword123"
  });
  expect(canLogin).toBe(true);
});
```

### Test: Passwords Don't Match
```typescript
test("change-password: mismatch", async () => {
  const result = await runCLIWithInput(["change-password"], {
    inputs: ["Password123", "DifferentPassword"]
  });

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("Error: Passwords do not match");

  // Verify password was NOT changed
  const account = getAdminAccount();
  expect(account.password).toBe(originalPasswordHash);
});
```

### Test: Weak Password (Too Short)
```typescript
test("change-password: too short", async () => {
  const result = await runCLIWithInput(["change-password"], {
    inputs: ["Short1", "Short1"]
  });

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("Error: Password does not meet security requirements");
  expect(result.stderr).toContain("at least 8 characters");
});
```

### Test: Missing Character Types
```typescript
test("change-password: missing uppercase", async () => {
  const result = await runCLIWithInput(["change-password"], {
    inputs: ["lowercase123", "lowercase123"]
  });

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("uppercase letter");
});

test("change-password: missing lowercase", async () => {
  const result = await runCLIWithInput(["change-password"], {
    inputs: ["UPPERCASE123", "UPPERCASE123"]
  });

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("lowercase letter");
});

test("change-password: missing number", async () => {
  const result = await runCLIWithInput(["change-password"], {
    inputs: ["NoNumbers", "NoNumbers"]
  });

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("number");
});
```

## User Experience Requirements

### Prompt Behavior
- First prompt MUST display: `Enter new password: `
- Second prompt MUST display: `Confirm new password: `
- Both prompts MUST mask input (using Bun.password())
- Cursor should remain on same line during input

### Error Feedback
- Validation errors MUST list ALL requirements
- Validation errors MUST highlight which requirement(s) failed
- Errors MUST be actionable (tell user what to fix)

## Edge Cases

1. **Empty Password**: Pressing enter without input should fail validation (length check)
2. **Very Long Password**: 128+ characters should fail validation
3. **Special Characters**: Passwords with `!@#$%^&*()` are allowed (no specific requirement but not forbidden)
4. **Unicode Characters**: Unicode characters are allowed but don't count toward character type requirements
5. **Whitespace**: Leading/trailing spaces are NOT trimmed (part of password)

## Session Handling

**Important**: Password changes DO NOT invalidate existing sessions. Users remain logged in after password change. This is intentional to avoid locking out the admin who changes their own password.

If session invalidation is desired, it must be a separate feature.

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-25 | Initial contract definition |

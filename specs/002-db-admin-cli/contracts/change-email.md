# Contract: change-email Command

**Version**: 1.0.0
**Date**: 2025-10-25

## Command Signature

```bash
wtt change-email <new-email>
```

## Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `new-email` | string | Yes | New email address for admin user |

## Success Case

### Input Example
```bash
wtt change-email newemail@example.com
```

### Expected Output (stdout)
```
✓ Admin email updated successfully
  Old email: admin@example.com
  New email: newemail@example.com
```

### Expected Exit Code
`0`

### Database State Changes
- `user.email` updated to new email
- `user.updatedAt` updated to current timestamp
- Admin remains logged in with existing sessions

## Error Cases

### EC-1: Missing Email Argument

**Input**:
```bash
wtt change-email
```

**Expected Output (stderr)**:
```
Error: Missing required argument: <new-email>

Usage: wtt change-email <new-email>

Example:
  wtt change-email admin@newdomain.com
```

**Expected Exit Code**: `1`

---

### EC-2: Invalid Email Format

**Input**:
```bash
wtt change-email notanemail
```

**Expected Output (stderr)**:
```
Error: Invalid email format: 'notanemail'

Email must be a valid email address.
Example: user@example.com
```

**Expected Exit Code**: `1`

**Additional Invalid Examples**:
- `user@` (missing domain)
- `@domain.com` (missing local part)
- `user name@domain.com` (spaces not allowed)
- `user..name@domain.com` (consecutive dots)

---

### EC-3: Email Already in Use

**Input**:
```bash
wtt change-email existing@example.com
```

**Expected Output (stderr)**:
```
Error: Email already in use

The email 'existing@example.com' is already associated with another user account.
Please choose a different email address.
```

**Expected Exit Code**: `1`

---

### EC-4: Admin User Not Found

**Input**:
```bash
wtt change-email new@example.com
```

**Expected Output (stderr)**:
```
Error: Admin user not found

The admin user could not be found in the database.
This may indicate database corruption or misconfiguration.

Please contact support or check database integrity.
```

**Expected Exit Code**: `1`

**Note**: This scenario should be extremely rare in production.

---

### EC-5: Database Locked

**Input**:
```bash
wtt change-email new@example.com
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

### EC-6: Database Error (General)

**Input**:
```bash
wtt change-email new@example.com
# Database file permissions issue, corrupted database, etc.
```

**Expected Output (stderr)**:
```
Error: Database operation failed

Unable to update admin email due to a database error:
<error details>

Please check:
  - Database file permissions
  - Database file integrity
  - Available disk space

If the problem persists, contact support.
```

**Expected Exit Code**: `1`

## Validation Rules

The following validations MUST be performed before database operations:

1. **Argument Presence**: Exactly one argument provided after `change-email`
2. **Email Format**: Valid email format per RFC 5322 (basic validation)
3. **Email Length**: 5-255 characters
4. **Email Characters**: Allowed characters per email standards
5. **Email Normalization**: Convert to lowercase, trim whitespace

## Performance Requirements

- Command execution MUST complete in <30 seconds (SC-001)
- Typical execution time: <2 seconds (mostly validation + single UPDATE query)

## Security Requirements

- Email validation MUST prevent SQL injection
- Email validation MUST use parameterized queries
- Old email MUST be displayed in success message (for audit trail)

## Database Operations

### Query Sequence

1. **Find Admin User**:
   ```sql
   SELECT id, email FROM user WHERE name = 'Admin' LIMIT 1;
   ```

2. **Check Email Uniqueness** (if different from current):
   ```sql
   SELECT id FROM user WHERE email = ? AND id != ? LIMIT 1;
   ```

3. **Update Email**:
   ```sql
   UPDATE user
   SET email = ?,
       updatedAt = CURRENT_TIMESTAMP
   WHERE id = ?
   RETURNING email;
   ```

## Contract Test Cases

### Test: Success Case
```typescript
test("change-email: success", async () => {
  const result = await runCLI(["change-email", "new@example.com"]);

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("✓ Admin email updated successfully");
  expect(result.stdout).toContain("new@example.com");

  // Verify database change
  const admin = getAdminUser();
  expect(admin.email).toBe("new@example.com");
});
```

### Test: Invalid Email
```typescript
test("change-email: invalid format", async () => {
  const result = await runCLI(["change-email", "notanemail"]);

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("Error: Invalid email format");
  expect(result.stderr).toContain("notanemail");
});
```

### Test: Missing Argument
```typescript
test("change-email: missing argument", async () => {
  const result = await runCLI(["change-email"]);

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("Error: Missing required argument");
});
```

### Test: Email Already in Use
```typescript
test("change-email: duplicate email", async () => {
  // Setup: Create another user with the email
  await createUser({ email: "taken@example.com" });

  const result = await runCLI(["change-email", "taken@example.com"]);

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("Error: Email already in use");
});
```

## Edge Cases

1. **Same Email**: Updating to current email should succeed (idempotent)
2. **Case Variation**: `Admin@Example.com` → `admin@example.com` (normalized to lowercase)
3. **Whitespace**: ` admin@example.com ` → `admin@example.com` (trimmed)
4. **Unicode**: Email with unicode characters should be validated according to RFC 6531 (if supported)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-25 | Initial contract definition |

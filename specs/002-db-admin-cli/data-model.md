# Data Model: Database Admin CLI

**Feature**: Database Admin CLI (001-db-admin-cli)
**Date**: 2025-10-25
**Purpose**: Define data structures, entities, and validation rules for CLI operations

## Overview

This document defines the data model for the Database Admin CLI feature, including:
- Existing database entities (admin user)
- CLI command input/output structures
- Validation rules and constraints
- Data transformations

---

## Database Entities

### User Entity (Existing)

**Table**: `user`
**Purpose**: Stores user account information

```sql
CREATE TABLE "user" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,              -- Admin identified by 'Admin'
  "email" TEXT NOT NULL UNIQUE,      -- Admin email (updateable)
  "emailVerified" INTEGER NOT NULL,
  "image" TEXT,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL
);
```

**Admin User Constraints**:
- `name = 'Admin'` (constant, used to identify admin)
- `email` must be unique across all users
- `email` must be valid email format
- Only one admin user exists per WTT instance

### Account Entity (Existing)

**Table**: `account`
**Purpose**: Stores authentication credentials

```sql
CREATE TABLE "account" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,        -- Must be 'credential' for admin
  "userId" TEXT NOT NULL REFERENCES "user" ("id"),
  "password" TEXT,                   -- Hashed password (updateable)
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" DATE,
  "refreshTokenExpiresAt" DATE,
  "scope" TEXT,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL
);
```

**Admin Account Constraints**:
- `providerId = 'credential'` (email/password authentication)
- `userId` references admin user's `user.id`
- `password` stores hashed password in format `salt:hash`
- Only one account record per admin user with `providerId = 'credential'`

---

## CLI Command Structures

### Command: change-email

**Purpose**: Update admin user's email address

**Input Structure**:
```typescript
interface ChangeEmailInput {
  newEmail: string;  // New email address
}
```

**Validation Rules**:
```typescript
import { z } from "zod";

const ChangeEmailSchema = z.object({
  newEmail: z.string()
    .email("Invalid email format")
    .toLowerCase()
    .trim()
    .min(5, "Email too short")
    .max(255, "Email too long"),
});
```

**Output Structure**:
```typescript
interface ChangeEmailOutput {
  success: boolean;
  oldEmail: string;
  newEmail: string;
  message: string;
}
```

**Database Operations**:
1. SELECT admin user: `SELECT id, email FROM user WHERE name = 'Admin'`
2. UPDATE email: `UPDATE user SET email = ?, updatedAt = ? WHERE id = ?`

**Success Output Example**:
```
✓ Admin email updated successfully
  Old email: admin@example.com
  New email: newemail@example.com
```

**Error Scenarios**:
- Invalid email format
- Admin user not found
- Email already in use by another user
- Database error

---

### Command: change-password

**Purpose**: Update admin user's password

**Input Structure** (interactive prompts):
```typescript
interface ChangePasswordInput {
  newPassword: string;       // From Bun.password() prompt
  confirmPassword: string;   // From Bun.password() confirmation
}
```

**Validation Rules**:
```typescript
const PasswordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain uppercase letter")
  .regex(/[a-z]/, "Password must contain lowercase letter")
  .regex(/[0-9]/, "Password must contain number");

const ChangePasswordSchema = z.object({
  newPassword: PasswordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
```

**Output Structure**:
```typescript
interface ChangePasswordOutput {
  success: boolean;
  message: string;
}
```

**Database Operations**:
1. SELECT admin user: `SELECT id FROM user WHERE name = 'Admin'`
2. SELECT admin account: `SELECT id, password FROM account WHERE userId = ? AND providerId = 'credential'`
3. Hash new password: `await hashPassword(newPassword)`
4. UPDATE password: `UPDATE account SET password = ?, updatedAt = ? WHERE userId = ? AND providerId = 'credential'`

**Success Output Example**:
```
✓ Admin password updated successfully
  You can now log in with your new password.
```

**Error Scenarios**:
- Password too short (<8 characters)
- Password missing uppercase letter
- Password missing lowercase letter
- Password missing number
- Passwords don't match (confirmation)
- Admin user not found
- Admin account not found
- Database error

---

### Command: export-db

**Purpose**: Export database to file for backup

**Input Structure**:
```typescript
interface ExportDbInput {
  outputPath?: string;  // Optional custom path
}
```

**Validation Rules**:
```typescript
const ExportDbSchema = z.object({
  outputPath: z.string()
    .optional()
    .transform((path) => {
      if (!path) {
        // Generate default filename with timestamp
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, '-')
          .slice(0, 19);
        return `backup-${timestamp}.db`;
      }
      return path;
    })
    .refine((path) => {
      // Validate path doesn't exist or prompt for overwrite
      return true; // Will be checked at runtime
    }, "File already exists"),
});
```

**Output Structure**:
```typescript
interface ExportDbOutput {
  success: boolean;
  sourcePath: string;
  outputPath: string;
  fileSizeBytes: number;
  message: string;
}
```

**Database Operations**:
1. Open readonly connection: `new Database(DB_FILE, { readonly: true })`
2. Execute export: `VACUUM INTO '${outputPath}'`
3. Close connection
4. Verify export file exists

**Success Output Example**:
```
✓ Database exported successfully
  Source: /app/data/wtt.db
  Output: /app/backups/backup-2025-10-25T14-30-00.db
  Size: 2.4 MB
```

**Error Scenarios**:
- Database locked by server
- Insufficient disk space
- Invalid output path
- File already exists (without confirmation)
- Permission denied (directory not writable)
- Database error during VACUUM

---

## Validation Schemas Reference

### Email Validation

```typescript
export const emailSchema = z.string()
  .email("Invalid email format. Example: user@example.com")
  .toLowerCase()
  .trim()
  .min(5, "Email too short (minimum 5 characters)")
  .max(255, "Email too long (maximum 255 characters)");
```

**Valid Examples**:
- `admin@example.com`
- `john.doe+admin@company.co.uk`
- `user_name@sub.domain.com`

**Invalid Examples**:
- `notanemail` (missing @ and domain)
- `user@` (missing domain)
- `@domain.com` (missing local part)
- `user name@domain.com` (spaces not allowed)

### Password Validation

```typescript
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long (maximum 128 characters)")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter (A-Z)")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter (a-z)")
  .regex(/[0-9]/, "Password must contain at least one number (0-9)");
```

**Valid Examples**:
- `Admin123`
- `SecureP@ss1`
- `MyPassword99`

**Invalid Examples**:
- `admin123` (no uppercase)
- `ADMIN123` (no lowercase)
- `AdminPass` (no number)
- `Admin1` (too short)

### File Path Validation

```typescript
export const filePathSchema = z.string()
  .optional()
  .default("")
  .transform((path) => {
    if (!path) {
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, 19);  // YYYY-MM-DDTHH-MM-SS
      return `backup-${timestamp}.db`;
    }
    return path;
  })
  .refine((path) => {
    // Ensure ends with .db extension
    return path.endsWith('.db');
  }, "Output file must have .db extension");
```

---

## Data Transformations

### Password Hashing

**Input**: Plain text password string
**Process**: Scrypt key derivation via better-auth
**Output**: `salt:hash` string

```typescript
import { hashPassword } from "better-auth/crypto";

// Transformation
const plainPassword = "Admin123";
const hashedPassword = await hashPassword(plainPassword);
// Result: "a1b2c3d4e5f6...1234:9876f5e4d3c2b1a0..."
//         [16-byte hex salt]:[64-byte hex derived key]
```

**Constraints**:
- Input: 8-128 characters (enforced by schema)
- Salt: 16 random bytes, hex-encoded (32 chars)
- Hash: 64-byte derived key, hex-encoded (128 chars)
- Total length: ~161 characters

### Timestamp Generation

**Format**: `YYYY-MM-DDTHH-MM-SS`
**Purpose**: Default export filename timestamps

```typescript
const timestamp = new Date()
  .toISOString()              // "2025-10-25T14:30:00.123Z"
  .replace(/[:.]/g, '-')      // "2025-10-25T14-30-00-123Z"
  .slice(0, 19);              // "2025-10-25T14-30-00"

const filename = `backup-${timestamp}.db`;
// Result: "backup-2025-10-25T14-30-00.db"
```

---

## Entity Relationships

```
┌─────────────────┐
│      user       │
│─────────────────│
│ id (PK)         │◄──────┐
│ name='Admin'    │       │
│ email (UNIQUE)  │       │ Foreign Key
│ emailVerified   │       │
│ createdAt       │       │
│ updatedAt       │       │
└─────────────────┘       │
                          │
                          │
┌─────────────────────────┴──┐
│        account             │
│────────────────────────────│
│ id (PK)                    │
│ userId (FK) ───────────────┘
│ providerId='credential'    │
│ password (hashed)          │
│ accountId                  │
│ createdAt                  │
│ updatedAt                  │
└────────────────────────────┘
```

**Key Relationships**:
- One user (admin) has exactly one account with `providerId='credential'`
- Email changes affect `user` table only
- Password changes affect `account` table only
- Both tables have `updatedAt` timestamp that must be updated

---

## Database Query Patterns

### Find Admin User

```sql
SELECT id, email, name, createdAt, updatedAt
FROM user
WHERE name = 'Admin'
LIMIT 1;
```

**Expected Result**: Exactly one row or zero rows (error)

### Find Admin Account

```sql
SELECT id, password, userId, createdAt, updatedAt
FROM account
WHERE userId = ? AND providerId = 'credential'
LIMIT 1;
```

**Parameters**: `userId` from admin user query

### Update Admin Email

```sql
UPDATE user
SET email = ?,
    updatedAt = CURRENT_TIMESTAMP
WHERE id = ?
RETURNING email;
```

**Parameters**:
1. `newEmail` (validated)
2. `userId` (from admin user query)

### Update Admin Password

```sql
UPDATE account
SET password = ?,
    updatedAt = CURRENT_TIMESTAMP
WHERE userId = ? AND providerId = 'credential'
RETURNING id;
```

**Parameters**:
1. `hashedPassword` (from hashPassword())
2. `userId` (from admin user query)

### Export Database

```sql
VACUUM INTO '/path/to/backup.db';
```

**Note**: This creates a compacted copy of the entire database

---

## Error Codes

| Exit Code | Meaning | Example Scenarios |
|-----------|---------|-------------------|
| 0 | Success | Command completed successfully |
| 1 | Validation Error | Invalid email, weak password, bad file path |
| 1 | Database Error | Admin not found, database locked, query failed |
| 1 | File System Error | Permission denied, disk full, path doesn't exist |
| 1 | Unknown Command | User provided unrecognized command |

**Note**: All errors use exit code 1 (standard CLI convention). Specific error type is determined by message content.

---

## State Transitions

### Change Email State Machine

```
[Start] → Validate Input → Query Admin → Check Uniqueness → Update DB → [Success]
              ↓                ↓              ↓                 ↓
          [Invalid]      [Not Found]     [Duplicate]       [DB Error]
              ↓                ↓              ↓                 ↓
            [Exit 1]        [Exit 1]       [Exit 1]         [Exit 1]
```

### Change Password State Machine

```
[Start] → Prompt Password → Confirm Password → Validate → Hash → Query Admin → Update DB → [Success]
              ↓                   ↓                ↓        ↓         ↓             ↓
          [Invalid]          [Mismatch]      [Weak]   [Error]  [Not Found]   [DB Error]
              ↓                   ↓                ↓        ↓         ↓             ↓
            [Exit 1]           [Exit 1]        [Exit 1]  [Exit 1]  [Exit 1]     [Exit 1]
```

### Export Database State Machine

```
[Start] → Parse Path → Check Exists → Confirm/Skip → Open DB → VACUUM INTO → Verify → [Success]
              ↓            ↓              ↓              ↓            ↓          ↓
          [Invalid]    [Exists] ────► [Abort]      [Locked]     [Error]    [Missing]
              ↓            │              ↓              ↓            ↓          ↓
            [Exit 1]       └──► Overwrite?          [Exit 1]     [Exit 1]   [Exit 1]
                                    ↓
                                [Continue]
```

---

## Constraints Summary

### Business Rules

1. **Single Admin**: Only one admin user exists (enforced by `name='Admin'` uniqueness)
2. **Email Uniqueness**: Admin email must be unique across all users
3. **Password Security**: Passwords must meet minimum security requirements
4. **Credential Provider**: Admin must use email/password authentication (`providerId='credential'`)

### Technical Constraints

1. **Database Locking**: Operations require exclusive write access (server must be stopped)
2. **Atomic Updates**: Each command performs updates in a single transaction
3. **Timestamp Updates**: `updatedAt` must be updated on every change
4. **File System**: Export requires write permissions to output directory
5. **Cross-Platform**: All operations must work on Linux, macOS, and Windows

---

## Success Metrics Data Points

The following data can be collected to verify success criteria:

| Metric | Data Point | Collection Method |
|--------|-----------|-------------------|
| SC-001: <30s for credential change | Execution time | Measure from command start to DB commit |
| SC-002: <5min for 1GB export | VACUUM duration | Measure VACUUM INTO execution time |
| SC-003: 100% password hashing | Hash format check | Verify all passwords match `^[0-9a-f]+:[0-9a-f]+$` |
| SC-004: Actionable errors | Error message quality | Manual review of error outputs |
| SC-005: Zero plaintext passwords | Database scan | Query all passwords, verify none are plaintext |
| SC-006: 99% success rate | Success/failure ratio | Log command outcomes (success vs error) |

---

## Next Steps

1. ✅ Data model defined
2. → Generate CLI command contracts (Phase 1 continued)
3. → Generate quickstart.md (Phase 1 continued)
4. → Update agent context (Phase 1 continued)

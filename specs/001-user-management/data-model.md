# Data Model: User Management & Password Reset

**Date**: 2025-10-25
**Feature**: User Management & Password Reset
**Source**: Better-auth schema (existing tables)

## Overview

This feature uses existing better-auth database schema. No new tables required. Updates are made to the `user` and `account` tables that better-auth manages.

## Entities

### User (Existing - Better-Auth)

Represents the admin user profile.

**Table**: `user`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique user identifier (UUID) |
| email | TEXT | UNIQUE, NOT NULL | User's email address (used for login) |
| name | TEXT | | User's display name (always "Admin" for WTT) |
| createdAt | INTEGER | | Unix timestamp of account creation |
| emailVerified | BOOLEAN | DEFAULT false | Email verification status (always false per FR-022) |

**Validation Rules**:
- Email must be valid RFC 5322 format (per FR-004)
- Email max length 254 characters (per FR-014)
- Whitespace trimmed before storage (per FR-015)

**State Transitions**:
- Email can be updated at any time by authenticated admin user
- No state machine - direct updates allowed

**Relationships**:
- One-to-many with `account` table (via `account.userId → user.id`)
- One-to-many with `session` table (via `session.userId → user.id`)

---

### Account (Existing - Better-Auth)

Stores authentication credentials for the user.

**Table**: `account`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique account identifier |
| userId | TEXT | FOREIGN KEY → user.id | Reference to user |
| providerId | TEXT | NOT NULL | Auth provider type ("credential" for email/password) |
| password | TEXT | | Hashed password (bcrypt hash from better-auth) |
| accountId | TEXT | | Provider-specific account ID |

**Validation Rules**:
- Password minimum 8 characters before hashing (per FR-007)
- Password accepts all printable characters including unicode (per FR-007a)
- Password stored as bcrypt hash, never plain text (per SR-002)
- Current password must be verified before updates (per SR-001)

**State Transitions**:
- Password can be updated after verifying current password
- Old password immediately invalid after update (per FR-010)

**Security Constraints**:
- Only `providerId = 'credential'` rows are relevant for this feature
- Password hash uses better-auth's `hashPassword()` function
- Password verification uses better-auth's `verifyPassword()` function

---

### Session (Existing - Better-Auth)

Manages user authentication sessions. Not directly modified by this feature but relevant for understanding authentication flow.

**Table**: `session`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique session identifier |
| userId | TEXT | FOREIGN KEY → user.id | Reference to user |
| expiresAt | INTEGER | | Unix timestamp when session expires |
| token | TEXT | | Session token (stored in cookie) |

**Behavior**:
- Sessions expire after 7 days of inactivity
- Sessions refresh after 1 day of activity (updateAge)
- Email updates do NOT invalidate sessions (user ID unchanged)
- Password updates do NOT invalidate sessions (current password verified)
- Session expiration redirects to login (per FR-020, FR-021)

---

## Database Operations

### Read Operations

**Get Current User**:
```sql
SELECT id, email, name, createdAt
FROM user
WHERE id = ?
```

Used by: User management page to display current email and creation date

---

### Update Operations

**Update Email**:
```sql
-- Step 1: Update email in user table
UPDATE user
SET email = ?
WHERE id = ?

-- Step 2: Verify email uniqueness (better-auth handles this via schema)
-- Email has UNIQUE constraint, will fail if duplicate
```

Validation Before Update:
- Client-side: Zod schema validates format, max length, trims whitespace
- Server-side: Database UNIQUE constraint prevents duplicates

**Update Password**:
```sql
-- Step 1: Get current password hash for verification
SELECT password
FROM account
WHERE userId = ? AND providerId = 'credential'

-- Step 2: Verify current password (using better-auth/crypto)
-- Done in application code: verifyPassword({ hash, password: currentPassword })

-- Step 3: Hash new password (using better-auth/crypto)
-- Done in application code: hashPassword(newPassword)

-- Step 4: Update password in account table
UPDATE account
SET password = ?
WHERE userId = ? AND providerId = 'credential'
```

Validation Before Update:
- Client-side: Zod schema validates min length, confirmation match
- Server-side: Verify current password matches database hash

---

## Data Flow

### Email Update Flow

```
User Input (email)
    ↓
Client Validation (onBlur)
  - Zod: email format, max 254 chars, trim whitespace
    ↓
Server Action
  - Get session → userId
  - Validate format again (never trust client)
  - UPDATE user SET email = ? WHERE id = userId
  - Database enforces UNIQUE constraint
    ↓
Success Response
  - Session cookie unchanged (user ID same)
  - User immediately uses new email for next login
```

### Password Update Flow

```
User Input (currentPassword, newPassword, confirmPassword)
    ↓
Client Validation (onBlur)
  - Zod: newPassword min 8 chars, confirmation matches
    ↓
Server Action (on submit)
  - Get session → userId
  - SELECT password FROM account WHERE userId = ? AND providerId = 'credential'
  - verifyPassword({ hash, password: currentPassword })
  - If incorrect → ERROR (per SR-003: don't reveal which check failed)
  - hashPassword(newPassword)
  - UPDATE account SET password = ? WHERE userId = ? AND providerId = 'credential'
  - Log password change event (per SR-004)
    ↓
Success Response
  - Session cookie unchanged (current password verified)
  - Old password immediately invalid
  - New password active for next login
```

---

## Indexes and Performance

Better-auth manages indexes. Relevant existing indexes:
- `user.email`: UNIQUE index (ensures no duplicate emails)
- `account.userId`: Foreign key index (fast lookups)
- `session.userId`: Foreign key index (fast session lookups)

No additional indexes needed for this feature.

---

## Data Integrity

**Constraints Enforced by Better-Auth Schema**:
- `user.email`: UNIQUE (prevents duplicate emails)
- `account.userId`: FOREIGN KEY to `user.id` (referential integrity)
- `session.userId`: FOREIGN KEY to `user.id` (referential integrity)

**Application-Level Constraints**:
- Email format validation (RFC 5322)
- Password minimum length (8 characters)
- Password verification before updates
- Session-based authentication required for all operations

---

## Migration Requirements

**No database migrations needed**. All required tables and columns exist in the current better-auth schema.

Verification:
- ✅ `user` table exists (created by better-auth)
- ✅ `account` table exists (created by better-auth)
- ✅ `session` table exists (created by better-auth)
- ✅ All required columns present

---

## Testing Considerations

**Data Setup for Tests**:
1. Create test user with known email/password
2. Authenticate to get valid session
3. Run update operations
4. Verify database changes
5. Verify authentication with new credentials

**Test Data**:
```typescript
const testUser = {
  email: "test@example.com",
  password: "testpassword123",
  newEmail: "newemail@example.com",
  newPassword: "newpassword456",
};
```

**Assertions**:
- Email update: Verify `user.email` changed, session still valid
- Password update: Verify `account.password` changed (hash), old password rejected, new password accepted
- Session persistence: Verify session cookie unchanged after updates

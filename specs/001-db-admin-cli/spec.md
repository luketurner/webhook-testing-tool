# Feature Specification: Database Admin CLI

**Feature Branch**: `001-db-admin-cli`
**Created**: 2025-10-25
**Status**: Draft
**Input**: User description: "A CLI interface that allows users to run database admin tasks, specifically exporting the DB and changing the admin user's email or password. The CLI interface must be part of the same single-file executable as the rest of the app. When run with no arguments, the current behavior (starting the server) is the default."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Change Admin Credentials (Priority: P1)

As a system administrator, I need to update the admin user's email or password so that I can maintain secure access to the system when credentials are compromised or need to be rotated for security compliance.

**Why this priority**: Core security capability that must be available immediately. Without this, administrators cannot respond to security incidents or perform routine credential rotation, which is a critical operational requirement.

**Independent Test**: Can be fully tested by running the CLI command to change admin email, verifying the change in the database, attempting login with new credentials, and confirming successful authentication. Delivers immediate value as a standalone security maintenance tool.

**Acceptance Scenarios**:

1. **Given** the admin user exists in the database, **When** I run the command to change the admin email with a valid new email address, **Then** the admin user's email is updated in the database and I can log in with the new email.
2. **Given** the admin user exists in the database, **When** I run the command to change the admin password with a valid new password, **Then** the admin user's password is updated (hashed) in the database and I can log in with the new password.
3. **Given** I attempt to change the admin email, **When** I provide an invalid email format, **Then** the system rejects the change with a clear validation error message.
4. **Given** I attempt to change the admin password, **When** I provide a password that doesn't meet security requirements, **Then** the system rejects the change with a clear error explaining the password requirements.
5. **Given** the admin user does not exist in the database, **When** I run the command to change admin credentials, **Then** the system displays an error indicating the admin user was not found.

---

### User Story 2 - Export Database (Priority: P2)

As a system administrator, I need to export the entire database to a file so that I can create backups, migrate data to another system, or analyze data offline.

**Why this priority**: Essential for data protection and operational flexibility, but less urgent than security credential management. Supports business continuity but isn't needed for immediate security response.

**Independent Test**: Can be fully tested by running the CLI export command, verifying the exported file exists at the specified location, checking the file is not empty, and optionally importing it into a test database to verify data integrity. Delivers value as a standalone backup tool.

**Acceptance Scenarios**:

1. **Given** the database contains data, **When** I run the export command with a valid output file path, **Then** a database export file is created at the specified location containing all database data.
2. **Given** the database contains data, **When** I run the export command without specifying an output path, **Then** an export file is created with a default name in the current directory (e.g., `backup-YYYY-MM-DD-HH-MM-SS.db`).
3. **Given** I specify an output directory that doesn't exist, **When** I run the export command, **Then** the system either creates the directory and exports successfully, or displays a clear error message.
4. **Given** the export file already exists at the target path, **When** I run the export command, **Then** the system prompts me to confirm overwrite or specify a different path.
5. **Given** the database is empty, **When** I run the export command, **Then** an export file is still created successfully (empty database structure).

---

### User Story 3 - Interactive CLI Experience (Priority: P3)

As a system administrator, I want clear feedback and guidance when using the CLI so that I can perform admin tasks confidently without referring to external documentation.

**Why this priority**: Improves usability and reduces errors, but the core functionality can work without these enhancements. This is about refining the user experience rather than enabling core capabilities.

**Independent Test**: Can be fully tested by running various CLI commands, observing help text, error messages, and success confirmations. Delivers value by making the CLI more accessible and reducing the learning curve.

**Acceptance Scenarios**:

1. **Given** I run the executable with a `--help` flag, **When** the command executes, **Then** I see a help message listing all available commands with brief descriptions.
2. **Given** I run the executable with no arguments, **When** the command executes, **Then** the server starts normally (preserving existing default behavior).
3. **Given** I run any admin command successfully, **When** the operation completes, **Then** I see a clear success message confirming what action was performed.
4. **Given** I run any admin command that requires user input (like new password), **When** prompted, **Then** sensitive inputs (passwords) are masked/hidden during entry.
5. **Given** I run a command with incorrect arguments, **When** the command fails, **Then** I see a clear error message explaining what went wrong and how to correct it.

---

### Edge Cases

- What happens when the database file is locked by another process during export?
- How does the system handle very large databases (>1GB) during export?
- What happens if the disk is full when attempting to export?
- How does the system handle special characters or Unicode in the new admin email/password?
- What happens if the database schema doesn't match expected structure (e.g., no admin user table)?
- What happens if the CLI is run with insufficient file system permissions?
- How does the system handle concurrent CLI operations on the same database?
- What happens if a user tries to run CLI commands while the server is already running?
- How does the system handle conflicting command-line arguments (e.g., arguments that could apply to both server and CLI modes)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a command to change the admin user's email address
- **FR-002**: System MUST provide a command to change the admin user's password
- **FR-003**: System MUST validate email addresses before updating (valid email format)
- **FR-004**: System MUST validate passwords before updating (minimum security requirements: at least 8 characters, containing uppercase, lowercase, and numbers)
- **FR-005**: System MUST hash passwords before storing them in the database (never store plaintext passwords)
- **FR-006**: System MUST provide a command to export the entire database to a file
- **FR-007**: System MUST allow users to specify the output path for database exports
- **FR-008**: System MUST create a default export filename with timestamp if no path is specified
- **FR-009**: System MUST display clear error messages when operations fail
- **FR-010**: System MUST display success confirmations when operations complete
- **FR-011**: System MUST provide help text/usage instructions accessible via `--help` or similar flag
- **FR-012**: System MUST mask password input when prompting users to enter passwords
- **FR-013**: System MUST verify the admin user exists before attempting to update credentials
- **FR-014**: System MUST handle file system errors gracefully (permission denied, disk full, etc.)
- **FR-015**: System MUST prevent overwriting existing export files without user confirmation
- **FR-016**: System MUST be invoked through the same executable used to start the server
- **FR-017**: System MUST preserve default behavior (starting server) when executable is run with no arguments
- **FR-018**: System MUST distinguish between server mode and CLI mode based on command-line arguments provided

### Key Entities

- **Admin User**: Represents the administrative user account with email and password credentials stored in the database. This is the primary entity modified by credential change operations.
- **Database Export**: Represents a complete snapshot of the database at a point in time, including all tables, data, and schema information, saved to a file for backup or migration purposes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Administrators can change admin email or password in under 30 seconds from command execution to confirmation
- **SC-002**: Database exports complete successfully for databases up to 1GB in size within 5 minutes
- **SC-003**: 100% of password updates are stored with proper cryptographic hashing (verifiable through database inspection)
- **SC-004**: All error messages provide actionable guidance (user can understand what went wrong and how to fix it without external documentation)
- **SC-005**: Zero incidents of plaintext passwords stored in the database
- **SC-006**: CLI operations complete successfully 99% of the time under normal conditions (valid inputs, adequate permissions, sufficient disk space)

## Assumptions

- The database uses SQLite format (based on project context using better-sqlite3)
- Admin user is stored in a users table with identifiable admin role or credentials
- The system has an existing authentication mechanism (better-auth) that will work with updated credentials
- The CLI will be run on the same machine where the database is hosted (local file system access)
- Users running the CLI have appropriate file system permissions to read/write the database
- Password hashing will use the same mechanism as the existing authentication system
- Export format will be SQLite database format (compatible with source database)
- The application currently starts the server as default behavior when run without arguments
- The same executable binary is used for both server and CLI operations

## Dependencies

- Existing database schema and admin user structure from the 001-user-management feature
- better-auth authentication system for password hashing compatibility
- File system access for reading database and writing exports
- SQLite database driver (better-sqlite3) for database operations

## Constraints

- CLI must be integrated into the existing application executable (single binary)
- CLI must work without starting the web server or application instance
- Operations must be synchronous and complete before returning control to the user
- Must maintain compatibility with existing database schema
- Cannot modify database schema or structure, only data
- Must work across different operating systems (Linux, macOS, Windows) where Bun runtime is supported
- Must preserve existing default behavior (server start) when executable is run with no arguments
- Command-line argument parsing must reliably distinguish between server mode and CLI admin mode

## Out of Scope

- Creating new admin users (only modifying existing admin)
- Deleting or disabling admin users
- Managing non-admin users via CLI
- Importing database from file (only export is included)
- Scheduled or automated database exports
- Incremental or differential backups
- Database migration or schema changes
- Remote database access (only local database files)
- Multi-user admin management
- Audit logging of CLI operations
- Database repair or optimization operations

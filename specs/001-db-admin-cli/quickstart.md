# Quick Start Guide: Database Admin CLI

**Feature**: Database Admin CLI (001-db-admin-cli)
**Date**: 2025-10-25
**For**: System Administrators

## Overview

The WTT Database Admin CLI provides command-line tools for managing the admin user account and backing up the database. All commands are accessed through the main WTT executable.

## Prerequisites

- WTT installed and configured
- Access to the server where WTT is running
- Write permissions to the database file
- **Important**: Server must be stopped before running CLI commands

## Quick Reference

```bash
# Change admin email
bun run src/server.ts change-email <new-email>

# Change admin password (interactive)
bun run src/server.ts change-password

# Export database (default filename)
bun run src/server.ts export-db

# Export database (custom path)
bun run src/server.ts export-db /path/to/backup.db

# Show help
bun run src/server.ts --help
```

---

## Getting Started

### Step 1: Stop the Server

Before running any CLI commands, stop the WTT server:

```bash
# Find the server process
ps aux | grep 'src/server.ts'

# Stop the server (replace <pid> with actual process ID)
kill <pid>

# Or if running in foreground, press Ctrl+C
```

**Why?** CLI commands need exclusive write access to the database.

### Step 2: Run Your Command

Execute the desired CLI command (see examples below).

### Step 3: Restart the Server

After completing CLI operations, restart the server:

```bash
bun run src/server.ts
```

---

## Command Examples

### Change Admin Email

**Basic Usage**:
```bash
bun run src/server.ts change-email newemail@example.com
```

**Example Output**:
```
✓ Admin email updated successfully
  Old email: admin@example.com
  New email: newemail@example.com
```

**What it does**:
- Updates the admin user's email address in the database
- New email must be unique (not used by another user)
- Email must be valid format (user@domain.com)

**Common Errors**:
- "Invalid email format" → Check email syntax
- "Email already in use" → Another user has this email
- "Database is locked" → Server is still running (stop it first)

---

### Change Admin Password

**Basic Usage**:
```bash
bun run src/server.ts change-password
```

**Interactive Prompts**:
```
Enter new password: ********** (input masked)
Confirm new password: ********** (input masked)
```

**Example Output**:
```
✓ Admin password updated successfully
  You can now log in with your new password.
```

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)

**What it does**:
- Prompts you to enter a new password (input is masked)
- Asks for confirmation to prevent typos
- Hashes the password securely (Scrypt algorithm)
- Updates the admin account in the database

**Common Errors**:
- "Passwords do not match" → Confirmation didn't match, try again
- "Password does not meet security requirements" → Check requirements above
- "Database is locked" → Server is still running (stop it first)

**Security Notes**:
- Passwords are never stored in plaintext
- Old passwords are not recoverable
- Existing login sessions remain valid after password change

---

### Export Database

**Basic Usage (Default Filename)**:
```bash
bun run src/server.ts export-db
```

**Example Output**:
```
✓ Database exported successfully
  Source: /app/data/wtt.db
  Output: backup-2025-10-25T14-30-00.db
  Size: 2.4 MB
```

**Custom Path**:
```bash
bun run src/server.ts export-db /backups/wtt-backup.db
```

**Example Output**:
```
✓ Database exported successfully
  Source: /app/data/wtt.db
  Output: /backups/wtt-backup.db
  Size: 2.4 MB
```

**What it does**:
- Creates a complete copy of the database
- Uses SQLite's VACUUM command to compact the export (smaller file size)
- Validates database integrity during export
- Default filename includes timestamp for easy organization

**File Naming**:
- Default format: `backup-YYYY-MM-DDTHH-MM-SS.db`
- Example: `backup-2025-10-25T14-30-00.db`
- Custom paths must end with `.db` extension

**Overwrite Behavior**:
If output file already exists, you'll be prompted:
```
Warning: File already exists: backup.db

Overwrite? (y/N): _
```
- Enter `y` to overwrite
- Enter `n` or press Enter to cancel

**Common Errors**:
- "Invalid output path" → Directory doesn't exist (create it first)
- "Permission denied" → No write access to directory
- "Insufficient disk space" → Free up space or export to different volume
- "Database is locked" → Server is still running (stop it first)

**Performance**:
- Small databases (<100MB): ~1 second
- Medium databases (100MB-1GB): ~5-60 seconds
- Large databases (>1GB): Up to 5 minutes

---

## Troubleshooting

### Error: "Database is locked"

**Problem**: Another process (usually the WTT server) has the database open.

**Solution**:
1. Stop the WTT server:
   ```bash
   ps aux | grep 'src/server.ts'
   kill <pid>
   ```
2. Wait a few seconds for the server to fully shut down
3. Run your CLI command again

**Prevention**: Always stop the server before running CLI commands.

---

### Error: "Admin user not found"

**Problem**: The admin user doesn't exist in the database.

**Solution**:
1. Check if database file exists and is accessible
2. Verify database isn't corrupted (try opening with SQLite tools)
3. If database is corrupted, restore from backup
4. If no backup exists, reinitialize database with migrations

**This should be extremely rare in normal operation.**

---

### Error: "Invalid email format"

**Problem**: Email address doesn't meet format requirements.

**Solution**: Ensure email follows standard format: `user@domain.com`

**Valid examples**:
- `admin@example.com`
- `john.doe@company.co.uk`
- `user+tag@subdomain.domain.com`

**Invalid examples**:
- `notanemail` (missing @ and domain)
- `user@` (missing domain)
- `@domain.com` (missing local part)

---

### Error: "Email already in use"

**Problem**: Another user account is using the email you're trying to set.

**Solution**:
1. Choose a different email address, or
2. If the other account shouldn't exist, delete it first (requires database access)

---

### Error: "Password does not meet security requirements"

**Problem**: New password doesn't meet minimum security standards.

**Solution**: Ensure password has:
- At least 8 characters
- One uppercase letter (A-Z)
- One lowercase letter (a-z)
- One number (0-9)

**Valid examples**:
- `Admin123`
- `SecureP@ss1`
- `MyPassword99`

**Invalid examples**:
- `admin123` (no uppercase)
- `ADMIN123` (no lowercase)
- `AdminPass` (no number)
- `Admin1` (too short)

---

### Error: "Permission denied"

**Problem**: You don't have write permissions to the database or export directory.

**Solution**:
1. Check file permissions:
   ```bash
   ls -la /path/to/wtt.db
   ls -la /path/to/export/directory
   ```
2. Run CLI with appropriate user account (same user as WTT server)
3. For exports, use a directory where you have write access:
   ```bash
   bun run src/server.ts export-db ~/backups/wtt-backup.db
   ```

---

### Error: "Insufficient disk space"

**Problem**: Not enough disk space to export database.

**Solution**:
1. Check available disk space:
   ```bash
   df -h
   ```
2. Free up space by removing old files
3. Or export to a different volume with more space:
   ```bash
   bun run src/server.ts export-db /mnt/external/backup.db
   ```

---

## Best Practices

### Backup Strategy

1. **Regular Exports**: Schedule regular database exports (e.g., daily, weekly)
2. **Retention Policy**: Keep multiple backup versions (not just one)
3. **Off-Site Storage**: Store exports on a different server or external storage
4. **Test Restores**: Periodically test that backups can be restored
5. **Automated Scripts**: Create scripts to automate backup process

**Example backup script**:
```bash
#!/bin/bash
# backup-wtt.sh

# Configuration
BACKUP_DIR="/backups/wtt"
WTT_DIR="/app/wtt"

# Create backup directory if needed
mkdir -p "$BACKUP_DIR"

# Stop server
echo "Stopping WTT server..."
pkill -f "src/server.ts"
sleep 2

# Export database
echo "Exporting database..."
cd "$WTT_DIR"
bun run src/server.ts export-db "$BACKUP_DIR/wtt-$(date +%Y-%m-%d).db"

# Restart server
echo "Restarting WTT server..."
bun run src/server.ts &

echo "Backup complete!"

# Clean up old backups (keep last 7 days)
find "$BACKUP_DIR" -name "wtt-*.db" -mtime +7 -delete
```

Make it executable:
```bash
chmod +x backup-wtt.sh
```

Run with cron (daily at 2 AM):
```bash
0 2 * * * /path/to/backup-wtt.sh
```

---

### Password Management

1. **Strong Passwords**: Use a password manager to generate strong passwords
2. **Regular Rotation**: Change admin password periodically (e.g., every 90 days)
3. **After Access**: Change password if anyone unauthorized may have accessed it
4. **Document Changes**: Keep a log of when passwords were changed (not the passwords themselves)
5. **Secure Storage**: Store admin credentials in a password manager, not plain text

---

### Email Updates

1. **Current Email**: Ensure current email is monitored before changing
2. **Notifications**: Check if any automated notifications go to admin email
3. **Documentation**: Update documentation with new admin email
4. **Access Recovery**: Ensure you have alternative access methods in case of email issues

---

## Advanced Usage

### Scripted Operations

CLI commands can be scripted for automation:

```bash
#!/bin/bash
# Update admin email and password

# Stop server
pkill -f "src/server.ts"
sleep 2

# Change email
bun run src/server.ts change-email new-admin@example.com

# Change password (requires interactive input)
# Note: For non-interactive password changes, modify database directly
# or use a tool like 'expect' to automate input

# Restart server
bun run src/server.ts &
```

**Caution**: Be careful with automated password changes. They require interactive input by design (for security).

---

### Database Restore

To restore from a backup:

1. **Stop the server**:
   ```bash
   pkill -f "src/server.ts"
   ```

2. **Backup current database** (just in case):
   ```bash
   cp /app/data/wtt.db /app/data/wtt.db.pre-restore
   ```

3. **Replace with backup**:
   ```bash
   cp /backups/wtt-2025-10-25.db /app/data/wtt.db
   ```

4. **Restart server**:
   ```bash
   bun run src/server.ts
   ```

5. **Verify** that application works and data is correct

---

### Multiple Environments

If managing multiple WTT instances:

```bash
# Development
cd /app/wtt-dev
bun run src/server.ts change-email dev-admin@example.com

# Staging
cd /app/wtt-staging
bun run src/server.ts change-email staging-admin@example.com

# Production
cd /app/wtt-prod
bun run src/server.ts change-email prod-admin@example.com
```

**Tip**: Use different email addresses for each environment to avoid confusion.

---

## Security Considerations

### Access Control

- **CLI Access**: Only trusted administrators should have server access
- **Database File**: Restrict read/write permissions to WTT user only
- **Exports**: Store in secure location with restricted access
- **Scripts**: Secure any automation scripts (remove execute permissions for others)

### Audit Trail

- **Log Changes**: Keep logs of when CLI commands are run
- **Track Exports**: Document when backups are created and where they're stored
- **Password Changes**: Log when passwords are changed (not the passwords themselves)

**Example logging**:
```bash
# Log to syslog
logger "WTT admin email changed to new-admin@example.com by $USER"

# Or append to file
echo "$(date): Admin email changed by $USER" >> /var/log/wtt-admin.log
```

---

## Support & Resources

### Documentation
- Feature specification: `specs/001-db-admin-cli/spec.md`
- Implementation plan: `specs/001-db-admin-cli/plan.md`
- API contracts: `specs/001-db-admin-cli/contracts/`
- Data model: `specs/001-db-admin-cli/data-model.md`

### Getting Help
- Check this guide first for common issues
- Review error messages carefully (they include actionable guidance)
- Run `--help` for command syntax reminders
- Contact support if problems persist

### Reporting Issues
When reporting issues, include:
- Exact command you ran
- Complete error message
- WTT version
- Operating system
- Database size (approximate)

---

## Appendix: Command Reference

### change-email

| Aspect | Details |
|--------|---------|
| **Syntax** | `bun run src/server.ts change-email <new-email>` |
| **Arguments** | `<new-email>`: New email address (required) |
| **Interactive** | No |
| **Typical Duration** | <2 seconds |
| **Prerequisites** | Server stopped, write access to database |
| **Side Effects** | Updates user.email and user.updatedAt |
| **Reversible** | Yes (run command again with old email) |

### change-password

| Aspect | Details |
|--------|---------|
| **Syntax** | `bun run src/server.ts change-password` |
| **Arguments** | None |
| **Interactive** | Yes (prompts for password twice) |
| **Typical Duration** | 1-2 seconds (after input) |
| **Prerequisites** | Server stopped, write access to database |
| **Side Effects** | Updates account.password and account.updatedAt |
| **Reversible** | No (old password is not recoverable) |

### export-db

| Aspect | Details |
|--------|---------|
| **Syntax** | `bun run src/server.ts export-db [output-path]` |
| **Arguments** | `[output-path]`: Export path (optional, defaults to timestamped name) |
| **Interactive** | Optional (prompts if file exists) |
| **Typical Duration** | Depends on database size (5s for 1GB on SSD) |
| **Prerequisites** | Server stopped, write access to output directory |
| **Side Effects** | Creates new database file |
| **Reversible** | Yes (delete export file) |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-25 | Initial quickstart guide |

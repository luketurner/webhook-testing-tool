# Contract: export-db Command

**Version**: 1.0.0
**Date**: 2025-10-25

## Command Signature

```bash
bun run src/server.ts export-db [output-path]
```

## Arguments

| Argument | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `output-path` | string | No | `backup-YYYY-MM-DDTHH-MM-SS.db` | Path to output database file |

## Success Case

### Input Example (With Path)
```bash
bun run src/server.ts export-db /backups/wtt-backup.db
```

### Expected Output (stdout)
```
✓ Database exported successfully
  Source: /app/data/wtt.db
  Output: /backups/wtt-backup.db
  Size: 2.4 MB
```

### Expected Exit Code
`0`

### File System Changes
- New database file created at specified path
- File contains complete copy of source database (compacted via VACUUM)
- File size may be smaller than source due to VACUUM compaction

---

### Input Example (Default Path)
```bash
bun run src/server.ts export-db
```

### Expected Output (stdout)
```
✓ Database exported successfully
  Source: /app/data/wtt.db
  Output: backup-2025-10-25T14-30-00.db
  Size: 2.4 MB
```

**Note**: Timestamp in filename reflects export time (YYYY-MM-DDTHH-MM-SS format)

### Expected Exit Code
`0`

## Error Cases

### EC-1: File Already Exists (Without Confirmation)

**Input**:
```bash
bun run src/server.ts export-db existing-file.db
```

**Expected Output (stderr + prompt)**:
```
Warning: File already exists: existing-file.db

Overwrite? (y/N): _
```

**User enters 'n' or presses Enter**:
```
Export cancelled.
```

**Expected Exit Code**: `1`

**User enters 'y'**:
```
✓ Database exported successfully
  Source: /app/data/wtt.db
  Output: existing-file.db
  Size: 2.4 MB
```

**Expected Exit Code**: `0`

---

### EC-2: Invalid Output Path

**Input**:
```bash
bun run src/server.ts export-db /nonexistent/directory/backup.db
```

**Expected Output (stderr)**:
```
Error: Invalid output path

The directory '/nonexistent/directory' does not exist.

Action required:
  1. Create the directory first:
     mkdir -p /nonexistent/directory
  2. Run the command again

Or specify a different output path.
```

**Expected Exit Code**: `1`

---

### EC-3: Permission Denied

**Input**:
```bash
bun run src/server.ts export-db /root/backup.db
# User doesn't have write permission to /root/
```

**Expected Output (stderr)**:
```
Error: Permission denied

You don't have permission to write to: /root/backup.db

Action required:
  - Use a different output path where you have write permissions
  - Or run the command with appropriate permissions

Example alternative:
  bun run src/server.ts export-db ~/backups/wtt-backup.db
```

**Expected Exit Code**: `1`

---

### EC-4: Disk Full

**Input**:
```bash
bun run src/server.ts export-db /backup.db
# Not enough disk space
```

**Expected Output (stderr)**:
```
Error: Insufficient disk space

Not enough disk space available to export database.

Current database size: 1.2 GB
Available disk space: 0.5 GB

Action required:
  - Free up disk space
  - Or export to a different volume with more space
```

**Expected Exit Code**: `1`

---

### EC-5: Database Locked

**Input**:
```bash
bun run src/server.ts export-db backup.db
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

### EC-6: Database Read Error

**Input**:
```bash
bun run src/server.ts export-db backup.db
# Database file is corrupted or inaccessible
```

**Expected Output (stderr)**:
```
Error: Database operation failed

Unable to export database due to an error:
<error details>

Possible causes:
  - Database file is corrupted
  - Database file permissions are incorrect
  - Database file doesn't exist

Action required:
  - Check database file integrity
  - Verify database file path in configuration
  - Run database repair if necessary

If the problem persists, contact support.
```

**Expected Exit Code**: `1`

---

### EC-7: Invalid File Extension

**Input**:
```bash
bun run src/server.ts export-db backup.txt
```

**Expected Output (stderr)**:
```
Error: Invalid file extension

Output file must have .db extension.

You provided: backup.txt
Correct format: backup.db

Example:
  bun run src/server.ts export-db backup.db
```

**Expected Exit Code**: `1`

## Validation Rules

The following validations MUST be performed:

1. **File Extension**: Output path must end with `.db`
2. **Path Validity**: Directory portion of path must exist (or can be created)
3. **Write Permissions**: User must have write permission to output directory
4. **File Existence**: If file exists, prompt for confirmation before overwriting
5. **Disk Space**: Sufficient disk space must be available (approximate check)

## Performance Requirements

- Export of 1GB database MUST complete in <5 minutes (SC-002)
- Typical performance: ~200MB/s on SSD (1GB in ~5 seconds)
- Larger databases may take longer but should stay under SC-002 threshold

## Default Filename Format

When no path is specified, the default filename MUST follow this format:

```
backup-YYYY-MM-DDTHH-MM-SS.db
```

Examples:
- `backup-2025-10-25T14-30-00.db`
- `backup-2025-12-31T23-59-59.db`

**Implementation**:
```typescript
const timestamp = new Date()
  .toISOString()              // "2025-10-25T14:30:00.123Z"
  .replace(/[:.]/g, '-')      // "2025-10-25T14-30-00-123Z"
  .slice(0, 19);              // "2025-10-25T14-30-00"

const defaultPath = `backup-${timestamp}.db`;
```

## Database Export Method

MUST use SQLite's `VACUUM INTO` command for exports:

```sql
VACUUM INTO '/path/to/output.db';
```

**Advantages over file copy**:
- Creates consistent snapshot (safe with WAL mode)
- Compacts database (removes fragmentation and deleted data)
- Validates database integrity during export
- Results in smaller output file

**Process**:
1. Open source database in readonly mode
2. Execute `VACUUM INTO` with target path
3. Close database connection
4. Verify output file exists
5. Report file size

## Contract Test Cases

### Test: Success with Default Path
```typescript
test("export-db: success with default path", async () => {
  const result = await runCLI(["export-db"]);

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("✓ Database exported successfully");
  expect(result.stdout).toMatch(/backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.db/);

  // Verify file exists
  const match = result.stdout.match(/Output: (.+\.db)/);
  const outputPath = match[1];
  expect(await fileExists(outputPath)).toBe(true);
});
```

### Test: Success with Custom Path
```typescript
test("export-db: success with custom path", async () => {
  const outputPath = "/tmp/test-backup.db";
  const result = await runCLI(["export-db", outputPath]);

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("✓ Database exported successfully");
  expect(result.stdout).toContain(outputPath);

  // Verify file exists
  expect(await fileExists(outputPath)).toBe(true);

  // Verify file is valid SQLite database
  const db = new Database(outputPath);
  expect(() => db.query("SELECT 1").get()).not.toThrow();
  db.close();
});
```

### Test: File Already Exists (Decline Overwrite)
```typescript
test("export-db: decline overwrite", async () => {
  const outputPath = "/tmp/existing.db";
  await createFile(outputPath, "existing content");

  const result = await runCLIWithInput(["export-db", outputPath], {
    inputs: ["n"]  // Decline overwrite
  });

  expect(result.exitCode).toBe(1);
  expect(result.stdout).toContain("Overwrite? (y/N):");
  expect(result.stdout).toContain("Export cancelled");

  // Verify file was NOT overwritten
  const content = await readFile(outputPath);
  expect(content).toBe("existing content");
});
```

### Test: File Already Exists (Accept Overwrite)
```typescript
test("export-db: accept overwrite", async () => {
  const outputPath = "/tmp/existing.db";
  await createFile(outputPath, "old content");

  const result = await runCLIWithInput(["export-db", outputPath], {
    inputs: ["y"]  // Accept overwrite
  });

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("✓ Database exported successfully");

  // Verify file was overwritten with database
  const db = new Database(outputPath);
  expect(() => db.query("SELECT 1").get()).not.toThrow();
  db.close();
});
```

### Test: Invalid Extension
```typescript
test("export-db: invalid extension", async () => {
  const result = await runCLI(["export-db", "backup.txt"]);

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("Error: Invalid file extension");
  expect(result.stderr).toContain(".db");
});
```

### Test: Directory Doesn't Exist
```typescript
test("export-db: directory not found", async () => {
  const result = await runCLI(["export-db", "/nonexistent/backup.db"]);

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("Error: Invalid output path");
  expect(result.stderr).toContain("does not exist");
});
```

## Output Format Requirements

### Success Output Format
```
✓ Database exported successfully
  Source: <absolute-path-to-source-db>
  Output: <absolute-path-to-output-file>
  Size: <formatted-file-size>
```

### Size Formatting
File size MUST be formatted in human-readable units:
- Bytes: "123 B"
- Kilobytes: "456 KB"
- Megabytes: "1.2 MB"
- Gigabytes: "2.3 GB"

Round to 1 decimal place for KB, MB, GB.

## Security Considerations

1. **Path Validation**: Prevent path traversal attacks (e.g., `../../etc/passwd`)
2. **File Overwrite**: Always prompt before overwriting existing files
3. **Permissions**: Check write permissions before attempting export
4. **Database Integrity**: VACUUM INTO validates database structure during export

## Edge Cases

1. **Relative Paths**: Should be resolved to absolute paths for clarity in output
2. **Home Directory**: `~/backup.db` should expand to full path
3. **Current Directory**: `./backup.db` should work and display absolute path
4. **Symlinks**: Should follow symlinks to actual directory
5. **Network Paths**: Network-mounted paths should work if accessible
6. **Large Databases**: >1GB databases may take several minutes but must complete within SC-002 (5 min)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-25 | Initial contract definition |

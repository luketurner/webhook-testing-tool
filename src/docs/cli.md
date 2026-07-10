# Admin CLI

The `wtt` executable doubles as a database administration tool. Run it with no arguments and it starts the servers; run it with a command and it performs that command and exits.

These commands are the way back in when you have forgotten the dashboard login, since the admin user lives in the database rather than in [configuration](./configuration.md) once it has been created.

```
wtt                     Start the WTT server (default)
wtt [command] [args...]
```

Stop the server before running any command. SQLite locks the database file, and a running server will make the command fail with `Database is currently locked`.

## `wtt change-email <email>`

Changes the admin user's email address, which is also the dashboard login. The change applies immediately; no confirmation email is sent.

The address is trimmed, lowercased, and must be between 5 and 255 characters and look like an email address.

```bash
wtt change-email admin@newdomain.com
```

## `wtt change-password`

Changes the admin user's password. The command prompts twice and compares the two entries; it takes no password argument, so the password never reaches your shell history.

A password must be 8 to 128 characters and contain an uppercase letter, a lowercase letter, and a number.

```bash
wtt change-password
```

## `wtt export-db [path]`

Exports the database to a file for backup, using SQLite's `VACUUM INTO`. The copy is atomic and defragmented, so it is safe to take while the data directory is otherwise idle.

The path must end in `.db`. Omit it and `wtt` writes `backup-YYYY-MM-DDTHH-MM-SS.db` in the working directory. If the target file already exists, the command asks before overwriting it.

```bash
# timestamped filename in the current directory
wtt export-db

# explicit destination
wtt export-db /backups/wtt-2026-07-09.db
```

The dashboard offers the same export under **Download database** in the sidebar.

## `wtt --help`

Prints the command summary. `wtt help` does the same.

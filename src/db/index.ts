import "@/server-only";
import { Glob } from "bun";
import { Database } from "bun:sqlite";
import path, { join } from "path";
import { DB_FILE } from "../config";
import { clearHandlerExecutions } from "@/handler-executions/model";
import { clearRequestEvents } from "@/request-events/model";
import { clearHandlers } from "@/handlers/model";
import { updateSharedState } from "@/shared-state/model";
import { clearTcpConnections } from "@/tcp-connections/model";

export const db = new Database(DB_FILE, { create: true, strict: true });

// Enable WAL mode for better performance
db.run("PRAGMA journal_mode = WAL");
// Enable foreign key constraints
db.run("PRAGMA foreign_keys = ON");

export interface MigrationDefn {
  name: string;
  up: string;
  down: string;
}

interface MigrationRow {
  id: number;
  name: string;
}

async function loadMigrations() {
  const migrations: MigrationDefn[] = [];
  for await (const file of new Glob("*.ts").scan({
    cwd: join(import.meta.dir, "migrations"),
  })) {
    const name = path.basename(file, path.extname(file));
    migrations.push({
      ...(await import(`./migrations/${name}`)),
      name,
    });
  }
  return migrations.toSorted((a, b) => a.name.localeCompare(b.name));
}

function getExistingMigrations() {
  return db
    .query<MigrationRow, []>(`SELECT id, name FROM migrations ORDER BY id ASC`)
    .all();
}

const runMigrations = db.transaction((migrations: MigrationDefn[]) => {
  db.run(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE
    );
  `);
  const existingMigrations = new Set(
    getExistingMigrations().map((s) => s.name),
  );
  for (const migration of migrations) {
    console.write(`Running ${migration.name.substring(0, 30).padEnd(30)} `);
    const stmts = migration.up;
    if (existingMigrations.has(migration.name) || !stmts) {
      console.log("✔");
      continue;
    }
    try {
      db.run(stmts);
      db.run(`INSERT INTO migrations (name) VALUES (?)`, [migration.name]);
      console.log("✨");
    } catch (e) {
      console.log("❌");
      console.log(e);
      break;
    }
  }
});

export const migrateDb = async () => {
  const migrations = await loadMigrations();
  runMigrations(migrations);
};

export const resetDb = () => {
  // AIDEV-NOTE: When adding a new model, update this function
  updateSharedState({});
  clearHandlerExecutions();
  clearRequestEvents();
  clearHandlers();
  clearTcpConnections();
};

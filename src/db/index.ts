import "@/server-only";
import { Database } from "bun:sqlite";
import { DB_FILE } from "../config";
import { clearHandlerExecutions } from "@/handler-executions/model";
import { clearRequestEvents } from "@/request-events/model";
import { clearHandlers } from "@/handlers/model";
import { updateSharedState } from "@/shared-state/model";
import { clearTcpConnections } from "@/tcp-connections/model";
import { mkdir } from "fs/promises";
import { dirname } from "path";

// Import all migrations statically
// We need to do this because `bun build` does not yet support resolving dynamic imports that can't be statically analyzed
import * as migration1 from "./migrations/1748202268140_add_handler_and_request_tables";
import * as migration2 from "./migrations/1748202268141_add_handler_executions_table";
import * as migration3 from "./migrations/1748202268142_add_handler_execution_data_columns";
import * as migration4 from "./migrations/1748202268143_add_better_auth_tables";
import * as migration5 from "./migrations/1748202268144_add_console_output_column";
import * as migration6 from "./migrations/1748202268145_add_jwt_fields_to_handlers";
import * as migration7 from "./migrations/1748202268146_add_request_query_params_column";
import * as migration8 from "./migrations/1748202268147_add_tls_info_column";
import * as migration9 from "./migrations/1751506075000_add_shared_id_column";
import * as migration10 from "./migrations/1751651182763_create_shared_state";
import * as migration11 from "./migrations/1751905200000_add_tcp_connections_table";

// Load all migrations
const migrations: MigrationDefn[] = [
  { name: "1748202268140_add_handler_and_request_tables", ...migration1 },
  { name: "1748202268141_add_handler_executions_table", ...migration2 },
  { name: "1748202268142_add_handler_execution_data_columns", ...migration3 },
  { name: "1748202268143_add_better_auth_tables", ...migration4 },
  { name: "1748202268144_add_console_output_column", ...migration5 },
  { name: "1748202268145_add_jwt_fields_to_handlers", ...migration6 },
  { name: "1748202268146_add_request_query_params_column", ...migration7 },
  { name: "1748202268147_add_tls_info_column", ...migration8 },
  { name: "1751506075000_add_shared_id_column", ...migration9 },
  { name: "1751651182763_create_shared_state", ...migration10 },
  { name: "1751905200000_add_tcp_connections_table", ...migration11 },
];

await mkdir(dirname(DB_FILE), { recursive: true });
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
    const stmts = migration.up;
    if (existingMigrations.has(migration.name) || !stmts) {
      continue;
    }
    console.write(`Running ${migration.name.substring(0, 30).padEnd(30)} `);
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

export const migrateDb = () => {
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

import { DB_FILE } from "../config";
import { Database } from "bun:sqlite";
import { runAllMigrations } from "./migrate";

export const db = new Database(DB_FILE, { create: true, strict: true });

export const migrateDb = async () => {
  await runAllMigrations();
};

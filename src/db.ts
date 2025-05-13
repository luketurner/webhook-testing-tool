import { DB_FILE } from "./config";
import { Database } from "bun:sqlite";

export const db = new Database(DB_FILE, { create: true });

export const migrateDb = () =>
  db.run(`
  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    req_method TEXT,
    req_url TEXT,
    req_headers TEXT,
    req_body BLOB,
    req_timestamp INTEGER NOT NULL,
    resp_status TEXT,
    resp_statusmessage TEXT,
    resp_headers TEXT,
    resp_body BLOB,
    resp_timestamp INTEGER
  ) WITHOUT ROWID;

  CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY,
    method TEXT,
    path TEXT,
    code TEXT
  ) WITHOUT ROWID;
`);

export interface WttScript {
  id: string;
  method: string;
  path: string;
  code: string;
}

export interface WttRequest {
  id: string;
  req_method: string;
  req_url: string;
  req_headers: string;
  req_body: Uint8Array | null;
  req_timestamp: number;
  resp_status: string;
  resp_statusmessage: string;
  resp_headers: string;
  resp_body: Uint8Array | null;
  resp_timestamp: number;
}

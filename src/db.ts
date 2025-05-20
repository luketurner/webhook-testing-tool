import { DB_FILE } from "./config";
import { Database } from "bun:sqlite";
import { requestTableSchema } from "./models/request";
import { handlerTableSchema } from "./models/handler";

export const db = new Database(DB_FILE, { create: true, strict: true });

export const migrateDb = () => {
  db.run(requestTableSchema());
  db.run(handlerTableSchema());
};

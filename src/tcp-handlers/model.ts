import "@/server-only";

import { db } from "../db";
import {
  tcpHandlerSchema,
  tcpHandlerMetaSchema,
  type TcpHandler,
  type TcpHandlerId,
  type TcpHandlerMeta,
} from "./schema";
import {
  keysForSelect,
  keysForInsertFields,
  keysForInsertValues,
  keysForUpdate,
} from "@/util/sql";

const tableName = "tcp_handlers";

export function getTcpHandler(id: TcpHandlerId): TcpHandler | null {
  const result = db
    .query(
      `select ${keysForSelect(
        tcpHandlerSchema,
      )} from ${tableName} where id = $id;`,
    )
    .get({ id });

  return result ? tcpHandlerSchema.parse(result) : null;
}

export function getTcpHandlerMetadata(id: TcpHandlerId): TcpHandlerMeta | null {
  const result = db
    .query(
      `select ${keysForSelect(
        tcpHandlerMetaSchema,
      )} from ${tableName} where id = $id;`,
    )
    .get({ id });

  return result ? tcpHandlerMetaSchema.parse(result) : null;
}

// AIDEV-NOTE: Only one TCP handler is allowed at most, so this returns the single handler if it exists
export function getActiveTcpHandler(): TcpHandler | null {
  const result = db
    .query(
      `select ${keysForSelect(
        tcpHandlerSchema,
      )} from ${tableName} where enabled = 1 limit 1;`,
    )
    .get();

  return result ? tcpHandlerSchema.parse(result) : null;
}

export function getAllTcpHandlers(): TcpHandler[] {
  return db
    .query(`select ${keysForSelect(tcpHandlerSchema)} from ${tableName};`)
    .all()
    .map((v) => tcpHandlerSchema.parse(v));
}

export function getAllTcpHandlersMeta(): TcpHandlerMeta[] {
  return db
    .query(`select ${keysForSelect(tcpHandlerMetaSchema)} from ${tableName};`)
    .all()
    .map((v) => tcpHandlerMetaSchema.parse(v));
}

export function createTcpHandler(handler: TcpHandler): TcpHandler {
  return tcpHandlerSchema.parse(
    db
      .query(
        `insert into ${tableName} (${keysForInsertFields(
          tcpHandlerSchema,
          handler,
        )}) values (${keysForInsertValues(
          tcpHandlerSchema,
          handler,
        )}) returning *;`,
      )
      .get(handler),
  );
}

export function updateTcpHandler(
  handler: Partial<TcpHandler> & { id: TcpHandlerId },
): TcpHandler {
  return tcpHandlerSchema.parse(
    db
      .query(
        `update ${tableName} set ${keysForUpdate(
          tcpHandlerSchema,
          handler,
        )} where id = $id returning *;`,
      )
      .get(handler),
  );
}

export function deleteTcpHandler(id: TcpHandlerId) {
  return db.query(`delete from ${tableName} where id = ?`).run(id);
}

export function clearTcpHandlers() {
  return db.query(`delete from ${tableName}`).run();
}

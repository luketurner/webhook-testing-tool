import "@/server-only";

import { db } from "../db";
import {
  handlerSchema,
  handlerMetaSchema,
  type Handler,
  type HandlerId,
  type HandlerMeta,
} from "./schema";
import {
  keysForSelect,
  keysForInsertFields,
  keysForInsertValues,
  keysForUpdate,
} from "@/util/sql";

const tableName = "handlers";

export function getHandler(id: HandlerId): Handler {
  return handlerSchema.parse(
    db
      .query(
        `select ${keysForSelect(
          handlerSchema,
        )} from ${tableName} where id = $id;`,
      )
      .get({ id }),
  );
}

export function getHandlerMetadata(id: HandlerId): HandlerMeta {
  return handlerMetaSchema.parse(
    db
      .query(
        `select ${keysForSelect(
          handlerMetaSchema,
        )} from ${tableName} where id = $id;`,
      )
      .get({ id }),
  );
}

export function getAllHandlers(): Handler[] {
  return db
    .query(
      `select ${keysForSelect(
        handlerSchema,
      )} from ${tableName} order by "order" asc;`,
    )
    .all()
    .map((v) => handlerSchema.parse(v));
}

export function getAllHandlersMeta(): HandlerMeta[] {
  return db
    .query(
      `select ${keysForSelect(
        handlerMetaSchema,
      )} from ${tableName} order by order asc;`,
    )
    .all()
    .map((v) => handlerMetaSchema.parse(v));
}

export function createHandler(handler: Handler): Handler {
  return handlerSchema.parse(
    db
      .query(
        `insert into ${tableName} (${keysForInsertFields(
          handlerSchema,
          handler,
        )}) values (${keysForInsertValues(
          handlerSchema,
          handler,
        )}) returning *;`,
      )
      .get(handler),
  );
}

export function updateHandler(handler: Handler): Handler {
  return handlerSchema.parse(
    db
      .query(
        `update ${tableName} set ${keysForUpdate(
          handlerSchema,
          handler,
        )} where id = $id returning *;`,
      )
      .get(handler),
  );
}

export function deleteHandler(id: HandlerId) {
  return db.query(`delete from ${tableName} where id = ?`).run(id);
}

export function clearHandlers() {
  return db.query(`delete from ${tableName}`).run();
}

export function getNextHandlerOrder(): number {
  const result = db
    .query(`SELECT MAX("order") as max_order FROM ${tableName}`)
    .get() as { max_order: number | null } | undefined;

  return (result?.max_order || 0) + 1;
}

export function reorderHandlers(
  updates: { id: HandlerId; order: number }[],
): void {
  // Use a transaction to ensure all updates succeed or fail together
  const transaction = db.transaction(() => {
    for (const update of updates) {
      db.query(`UPDATE ${tableName} SET "order" = ? WHERE id = ?`).run(
        update.order,
        update.id,
      );
    }
  });

  transaction();
}

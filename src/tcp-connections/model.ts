import "@/server-only";

import {
  keysForInsertFields,
  keysForInsertValues,
  keysForSelect,
  keysForUpdate,
} from "@/util/sql";
import { db } from "../db";
import {
  tcpConnectionMetaSchema,
  tcpConnectionSchema,
  type TcpConnection,
  type TcpConnectionMeta,
  type TcpConnectionId,
} from "./schema";
import { base64FieldToSql } from "@/util/base64";
import { broadcastEvent } from "@/db/events";
import { now } from "@/util/datetime";

const tableName = "tcp_connections";

export function tcpConnectionToSql(
  connection: Partial<TcpConnection>,
): Record<string, any> {
  return {
    ...connection,
    ...base64FieldToSql(connection, "received_data"),
    ...base64FieldToSql(connection, "sent_data"),
  };
}

export function getTcpConnection(id: TcpConnectionId): TcpConnection | null {
  const result = db
    .query(
      `select ${keysForSelect(
        tcpConnectionSchema,
      )} from "${tableName}" where id = $id;`,
    )
    .get({ id });

  if (!result) {
    return null;
  }

  return tcpConnectionSchema.parse(result);
}

export function getTcpConnectionMeta(id: TcpConnectionId): TcpConnectionMeta {
  return tcpConnectionMetaSchema.parse(
    db
      .query(
        `select ${keysForSelect(
          tcpConnectionMetaSchema,
        )} from "${tableName}" where id = $id;`,
      )
      .get({ id }),
  );
}

export function getAllTcpConnections(): TcpConnection[] {
  return db
    .query(
      `select ${keysForSelect(
        tcpConnectionSchema,
      )} from "${tableName}" order by open_timestamp desc;`,
    )
    .all()
    .map((v) => tcpConnectionSchema.parse(v));
}

export function getAllTcpConnectionsMeta(
  includeArchived = false,
): TcpConnectionMeta[] {
  const filter = includeArchived ? "" : "WHERE archived_timestamp IS NULL";
  return db
    .query(
      `select ${keysForSelect(
        tcpConnectionMetaSchema,
      )} from "${tableName}" ${filter} order by open_timestamp desc;`,
    )
    .all()
    .map((v) => tcpConnectionMetaSchema.parse(v));
}

export function createTcpConnection(connection: TcpConnection): TcpConnection {
  return tcpConnectionSchema.parse(
    db
      .query(
        `insert into "${tableName}" (${keysForInsertFields(
          tcpConnectionSchema,
          connection,
        )}) values (${keysForInsertValues(
          tcpConnectionSchema,
          connection,
        )}) returning *;`,
      )
      .get(tcpConnectionToSql(connection)),
  );
}

export function updateTcpConnection(
  connection: Partial<TcpConnection>,
): TcpConnection {
  return tcpConnectionSchema.parse(
    db
      .query(
        `update "${tableName}" set ${keysForUpdate(
          tcpConnectionSchema,
          connection,
        )} where id = $id returning *;`,
      )
      .get(tcpConnectionToSql(connection) as Record<string, any>),
  );
}

export function deleteTcpConnection(id: TcpConnectionId): void {
  db.query(`delete from "${tableName}" where id = ?`).run(id);
  broadcastEvent("tcp_connection:deleted", id);
}

export function clearTcpConnections(): number {
  const result = db
    .query(`delete from ${tableName} WHERE archived_timestamp IS NULL`)
    .run();
  return result.changes;
}

export function bulkDeleteTcpConnections(ids?: TcpConnectionId[]): number {
  return db.transaction(() => {
    let result;

    if (!ids || ids.length === 0) {
      // Delete all active items only
      result = db.run(
        "DELETE FROM tcp_connections WHERE archived_timestamp IS NULL",
      );
    } else {
      // Delete specific IDs
      const placeholders = ids.map(() => "?").join(",");
      result = db.run(
        `DELETE FROM tcp_connections WHERE id IN (${placeholders})`,
        ids,
      );
    }

    return result.changes;
  })();
}

export function archiveTcpConnection(id: TcpConnectionId): TcpConnection {
  const archived_timestamp = now();
  const updated = updateTcpConnection({ id, archived_timestamp });
  broadcastEvent(
    "tcp_connection:archived",
    tcpConnectionMetaSchema.parse(updated),
  );
  return updated;
}

export function unarchiveTcpConnection(id: TcpConnectionId): TcpConnection {
  const updated = updateTcpConnection({ id, archived_timestamp: null });
  broadcastEvent(
    "tcp_connection:unarchived",
    tcpConnectionMetaSchema.parse(updated),
  );
  return updated;
}

export function bulkArchiveTcpConnections(ids?: TcpConnectionId[]): number {
  return db.transaction(() => {
    const archived_timestamp = now();
    let result;

    if (!ids || ids.length === 0) {
      // Archive all active items
      result = db.run(
        "UPDATE tcp_connections SET archived_timestamp = ? WHERE archived_timestamp IS NULL",
        [archived_timestamp],
      );
    } else {
      // Archive specific IDs
      const placeholders = ids.map(() => "?").join(",");
      result = db.run(
        `UPDATE tcp_connections SET archived_timestamp = ? WHERE id IN (${placeholders})`,
        [archived_timestamp, ...ids],
      );
    }

    return result.changes;
  })();
}

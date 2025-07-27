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

export function getAllTcpConnectionsMeta(): TcpConnectionMeta[] {
  return db
    .query(
      `select ${keysForSelect(
        tcpConnectionMetaSchema,
      )} from "${tableName}" order by open_timestamp desc;`,
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

export function deleteTcpConnection(id: TcpConnectionId) {
  return db.query(`delete from "${tableName}" where id = ?`).run(id);
}

export function clearTcpConnections() {
  return db.query(`delete from ${tableName}`).run();
}

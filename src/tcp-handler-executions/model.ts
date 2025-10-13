import "@/server-only";

import { db } from "../db";
import {
  tcpHandlerExecutionSchema,
  tcpHandlerExecutionMetaSchema,
  type TcpHandlerExecution,
  type TcpHandlerExecutionId,
  type TcpHandlerExecutionMeta,
} from "./schema";
import {
  keysForSelect,
  keysForInsertFields,
  keysForInsertValues,
  keysForUpdate,
} from "@/util/sql";
import type { TcpConnectionId } from "@/tcp-connections/schema";

const tableName = "tcp_handler_executions";

export function getTcpHandlerExecution(
  id: TcpHandlerExecutionId,
): TcpHandlerExecution {
  return tcpHandlerExecutionSchema.parse(
    db
      .query(
        `select ${keysForSelect(
          tcpHandlerExecutionSchema,
        )} from ${tableName} where id = $id;`,
      )
      .get({ id }),
  );
}

export function getTcpHandlerExecutionsByConnectionId(
  connectionId: TcpConnectionId,
): TcpHandlerExecution[] {
  return db
    .query(
      `select ${keysForSelect(
        tcpHandlerExecutionSchema,
      )} from ${tableName} where tcp_connection_id = $connectionId order by "order" asc;`,
    )
    .all({ connectionId })
    .map((v) => tcpHandlerExecutionSchema.parse(v));
}

export function getTcpHandlerExecutionsByHandlerId(
  handlerId: string,
): TcpHandlerExecution[] {
  return db
    .query(
      `select ${keysForSelect(
        tcpHandlerExecutionSchema,
      )} from ${tableName} where handler_id = $handlerId order by timestamp desc;`,
    )
    .all({ handlerId })
    .map((v) => tcpHandlerExecutionSchema.parse(v));
}

export function getAllTcpHandlerExecutions(): TcpHandlerExecution[] {
  return db
    .query(
      `select ${keysForSelect(
        tcpHandlerExecutionSchema,
      )} from ${tableName} order by timestamp desc;`,
    )
    .all()
    .map((v) => tcpHandlerExecutionSchema.parse(v));
}

export function getAllTcpHandlerExecutionsMeta(): TcpHandlerExecutionMeta[] {
  return db
    .query(
      `select ${keysForSelect(
        tcpHandlerExecutionMetaSchema,
      )} from ${tableName} order by timestamp desc;`,
    )
    .all()
    .map((v) => tcpHandlerExecutionMetaSchema.parse(v));
}

export function createTcpHandlerExecution(
  execution: TcpHandlerExecution,
): TcpHandlerExecution {
  return tcpHandlerExecutionSchema.parse(
    db
      .query(
        `insert into ${tableName} (${keysForInsertFields(
          tcpHandlerExecutionSchema,
          execution,
        )}) values (${keysForInsertValues(
          tcpHandlerExecutionSchema,
          execution,
        )}) returning *;`,
      )
      .get(execution),
  );
}

export function updateTcpHandlerExecution(
  execution: Partial<TcpHandlerExecution> & { id: TcpHandlerExecutionId },
): TcpHandlerExecution {
  return tcpHandlerExecutionSchema.parse(
    db
      .query(
        `update ${tableName} set ${keysForUpdate(
          tcpHandlerExecutionSchema,
          execution,
        )} where id = $id returning *;`,
      )
      .get(execution),
  );
}

export function deleteTcpHandlerExecution(id: TcpHandlerExecutionId) {
  return db.query(`delete from ${tableName} where id = ?`).run(id);
}

export function deleteTcpHandlerExecutionsByConnectionId(
  connectionId: TcpConnectionId,
) {
  return db
    .query(`delete from ${tableName} where tcp_connection_id = ?`)
    .run(connectionId);
}

export function clearTcpHandlerExecutions() {
  return db.query(`delete from ${tableName}`).run();
}

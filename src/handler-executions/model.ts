import "@/server-only";

import { db } from "../db";
import {
  handlerExecutionSchema,
  handlerExecutionMetaSchema,
  type HandlerExecution,
  type HandlerExecutionId,
  type HandlerExecutionMeta,
} from "./schema";
import {
  keysForSelect,
  keysForInsertFields,
  keysForInsertValues,
  keysForUpdate,
} from "@/util/sql";
import type { RequestId } from "@/request-events/schema";

const tableName = "handler_executions";

export function getHandlerExecution(id: HandlerExecutionId): HandlerExecution {
  return handlerExecutionSchema.parse(
    db
      .query(
        `select ${keysForSelect(
          handlerExecutionSchema
        )} from ${tableName} where id = $id;`
      )
      .get({ id })
  );
}

export function getHandlerExecutionsByRequestId(requestId: RequestId): HandlerExecution[] {
  return db
    .query(
      `select ${keysForSelect(
        handlerExecutionSchema
      )} from ${tableName} where request_event_id = $requestId order by "order" asc;`
    )
    .all({ requestId })
    .map((v) => handlerExecutionSchema.parse(v));
}

export function getHandlerExecutionsByHandlerId(handlerId: string): HandlerExecution[] {
  return db
    .query(
      `select ${keysForSelect(
        handlerExecutionSchema
      )} from ${tableName} where handler_id = $handlerId order by timestamp desc;`
    )
    .all({ handlerId })
    .map((v) => handlerExecutionSchema.parse(v));
}

export function getAllHandlerExecutions(): HandlerExecution[] {
  return db
    .query(
      `select ${keysForSelect(
        handlerExecutionSchema
      )} from ${tableName} order by timestamp desc;`
    )
    .all()
    .map((v) => handlerExecutionSchema.parse(v));
}

export function getAllHandlerExecutionsMeta(): HandlerExecutionMeta[] {
  return db
    .query(
      `select ${keysForSelect(
        handlerExecutionMetaSchema
      )} from ${tableName} order by timestamp desc;`
    )
    .all()
    .map((v) => handlerExecutionMetaSchema.parse(v));
}

export function createHandlerExecution(execution: HandlerExecution): HandlerExecution {
  return handlerExecutionSchema.parse(
    db
      .query(
        `insert into ${tableName} (${keysForInsertFields(
          handlerExecutionSchema,
          execution
        )}) values (${keysForInsertValues(
          handlerExecutionSchema,
          execution
        )}) returning *;`
      )
      .get(execution)
  );
}

export function updateHandlerExecution(
  execution: Partial<HandlerExecution> & { id: HandlerExecutionId }
): HandlerExecution {
  return handlerExecutionSchema.parse(
    db
      .query(
        `update ${tableName} set ${keysForUpdate(
          handlerExecutionSchema,
          execution
        )} where id = $id returning *;`
      )
      .get(execution)
  );
}

export function deleteHandlerExecution(id: HandlerExecutionId) {
  return db.query(`delete from ${tableName} where id = ?`).run(id);
}

export function deleteHandlerExecutionsByRequestId(requestId: RequestId) {
  return db.query(`delete from ${tableName} where request_event_id = ?`).run(requestId);
}
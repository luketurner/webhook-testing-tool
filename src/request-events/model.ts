import "@/server-only";

import {
  keysForInsertFields,
  keysForInsertValues,
  keysForSelect,
  keysForUpdate,
} from "@/util/sql";
import { db } from "../db";
import {
  requestEventMetaSchema,
  requestEventSchema,
  type RequestEvent,
  type RequestEventMeta,
  type RequestId,
} from "./schema";
import { jsonFieldToSql } from "@/util/json";
import { base64FieldToSql } from "@/util/base64";

const tableName = "requests";

export function requestEventToSql(
  event: Partial<RequestEvent>,
): Record<string, any> {
  return {
    ...event,
    ...jsonFieldToSql(event, "request_headers"),
    ...jsonFieldToSql(event, "response_headers"),
    ...base64FieldToSql(event, "request_body"),
    ...base64FieldToSql(event, "response_body"),
  };
}

export function getRequestEvent(id: RequestId): RequestEvent {
  return requestEventSchema.parse(
    db
      .query(
        `select ${keysForSelect(
          requestEventSchema,
        )} from "${tableName}" where id = $id;`,
      )
      .get({ id }),
  );
}

export function getRequestEventMeta(id: RequestId): RequestEventMeta {
  return requestEventMetaSchema.parse(
    db
      .query(
        `select ${keysForSelect(
          requestEventMetaSchema,
        )} from "${tableName}" where id = $id;`,
      )
      .get({ id }),
  );
}

export function getAllRequestEvents(): RequestEvent[] {
  return db
    .query(
      `select ${keysForSelect(
        requestEventSchema,
      )} from "${tableName}" order by request_timestamp desc;`,
    )
    .all()
    .map((v) => requestEventSchema.parse(v));
}

export function getAllRequestEventsMeta(): RequestEventMeta[] {
  return db
    .query(
      `select ${keysForSelect(
        requestEventMetaSchema,
      )} from "${tableName}" order by request_timestamp desc;`,
    )
    .all()
    .map((v) => requestEventMetaSchema.parse(v));
}

export function createRequestEvent(request: RequestEvent): RequestEvent {
  return requestEventSchema.parse(
    db
      .query(
        `insert into "${tableName}" (${keysForInsertFields(
          requestEventSchema,
          request,
        )}) values (${keysForInsertValues(
          requestEventSchema,
          request,
        )}) returning *;`,
      )
      .get(requestEventToSql(request)),
  );
}

export function updateRequestEvent(
  request: Partial<RequestEvent>,
): RequestEvent {
  return requestEventSchema.parse(
    db
      .query(
        `update "${tableName}" set ${keysForUpdate(
          requestEventSchema,
          request,
        )} where id = $id returning *;`,
      )
      .get(requestEventToSql(request) as Record<string, any>),
  );
}

export function deleteRequestEvent(id: RequestId) {
  return db.query(`delete from "${tableName}" where id = ?`).run(id);
}

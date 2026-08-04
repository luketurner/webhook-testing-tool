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
import { broadcastEvent } from "@/db/events";
import { now } from "@/util/datetime";
import { decodeRequestCursor, encodeRequestCursor } from "./cursor";

const tableName = "requests";

export function requestEventToSql(
  event: Partial<RequestEvent>,
): Record<string, any> {
  return {
    ...event,
    ...jsonFieldToSql(event, "request_headers"),
    ...jsonFieldToSql(event, "request_query_params"),
    ...jsonFieldToSql(event, "response_headers"),
    ...jsonFieldToSql(event, "tls_info"),
    ...jsonFieldToSql(event, "http2_info"),
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
  ) as RequestEvent;
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
    .map((v) => requestEventSchema.parse(v) as RequestEvent);
}

export function getAllRequestEventsMeta(
  includeArchived = false,
): RequestEventMeta[] {
  const filter = includeArchived ? "" : "WHERE archived_timestamp IS NULL";
  return db
    .query(
      `select ${keysForSelect(
        requestEventMetaSchema,
      )} from "${tableName}" ${filter} order by request_timestamp desc;`,
    )
    .all()
    .map((v) => requestEventMetaSchema.parse(v));
}

export interface RequestEventPage {
  events: RequestEventMeta[];
  nextCursor: string | null;
  total: number;
}

export interface GetRequestEventsPageOptions {
  limit: number;
  cursor?: string | null;
  includeArchived?: boolean;
  search?: string | null;
}

export function getRequestEventsPage(
  options: GetRequestEventsPageOptions,
): RequestEventPage {
  const { limit, cursor, includeArchived = false, search } = options;

  // Filter conditions (archived scope + search) are shared by the page query
  // and the total count. The cursor predicate applies ONLY to the page query.
  const filterConditions: string[] = [];
  const filterParams: Record<string, any> = {};

  if (!includeArchived) {
    filterConditions.push("archived_timestamp IS NULL");
  }

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    filterConditions.push(
      "(request_method LIKE $search OR request_url LIKE $search OR status LIKE $search OR CAST(response_status AS TEXT) LIKE $search)",
    );
    filterParams.search = `%${trimmedSearch}%`;
  }

  const pageConditions = [...filterConditions];
  const pageParams: Record<string, any> = { ...filterParams };

  if (cursor) {
    const decoded = decodeRequestCursor(cursor);
    pageConditions.push(
      "(request_timestamp < $cursorTs OR (request_timestamp = $cursorTs AND id < $cursorId))",
    );
    pageParams.cursorTs = decoded.request_timestamp;
    pageParams.cursorId = decoded.id;
  }

  const filterWhere = filterConditions.length
    ? `WHERE ${filterConditions.join(" AND ")}`
    : "";
  const pageWhere = pageConditions.length
    ? `WHERE ${pageConditions.join(" AND ")}`
    : "";

  const events = db
    .query(
      `select ${keysForSelect(
        requestEventMetaSchema,
      )} from "${tableName}" ${pageWhere} order by request_timestamp desc, id desc limit $limit;`,
    )
    .all({ ...pageParams, limit })
    .map((v) => requestEventMetaSchema.parse(v));

  const totalRow = db
    .query(`select count(*) as count from "${tableName}" ${filterWhere};`)
    .get({ ...filterParams }) as { count: number };

  const last = events[events.length - 1];
  const nextCursor =
    events.length === limit && last
      ? encodeRequestCursor({
          request_timestamp: last.request_timestamp,
          id: last.id,
        })
      : null;

  return { events, nextCursor, total: totalRow.count };
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
  ) as RequestEvent;
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
  ) as RequestEvent;
}

// AIDEV-NOTE: Archive and delete operations emit SSE events for real-time UI updates
// Archive operations set archived_timestamp to current Date.now(), unarchive sets it to null
// Delete operations permanently remove records and emit request:deleted with ID
// Bulk operations use transactions to ensure atomicity
export function deleteRequestEvent(id: RequestId): void {
  db.query(`delete from "${tableName}" where id = ?`).run(id);
  broadcastEvent("request:deleted", id);
}

export function clearRequestEvents(): number {
  const result = db
    .query(`delete from ${tableName} WHERE archived_timestamp IS NULL`)
    .run();
  return result.changes;
}

export function bulkDeleteRequestEvents(ids?: RequestId[]): number {
  return db.transaction(() => {
    let result;

    if (!ids || ids.length === 0) {
      // Delete all active items only
      result = db.run("DELETE FROM requests WHERE archived_timestamp IS NULL");
    } else {
      // Delete specific IDs
      const placeholders = ids.map(() => "?").join(",");
      result = db.run(
        `DELETE FROM requests WHERE id IN (${placeholders})`,
        ids,
      );
    }

    return result.changes;
  })();
}

export function archiveRequestEvent(id: RequestId): RequestEvent {
  const archived_timestamp = now();
  const updated = updateRequestEvent({ id, archived_timestamp });
  broadcastEvent("request:archived", requestEventMetaSchema.parse(updated));
  return updated;
}

export function unarchiveRequestEvent(id: RequestId): RequestEvent {
  const updated = updateRequestEvent({ id, archived_timestamp: null });
  broadcastEvent("request:unarchived", requestEventMetaSchema.parse(updated));
  return updated;
}

export function bulkArchiveRequestEvents(ids?: RequestId[]): number {
  return db.transaction(() => {
    const archived_timestamp = now();
    let result;

    if (!ids || ids.length === 0) {
      // Archive all active items
      result = db.run(
        "UPDATE requests SET archived_timestamp = ? WHERE archived_timestamp IS NULL",
        [archived_timestamp],
      );
    } else {
      // Archive specific IDs
      const placeholders = ids.map(() => "?").join(",");
      result = db.run(
        `UPDATE requests SET archived_timestamp = ? WHERE id IN (${placeholders})`,
        [archived_timestamp, ...ids],
      );
    }

    return result.changes;
  })();
}

export function getRequestEventBySharedId(
  sharedId: string,
): RequestEvent | null {
  const result = db
    .query(
      `select ${keysForSelect(
        requestEventSchema,
      )} from "${tableName}" where shared_id = $sharedId;`,
    )
    .get({ sharedId });

  if (!result) {
    return null;
  }

  return requestEventSchema.parse(result) as RequestEvent;
}

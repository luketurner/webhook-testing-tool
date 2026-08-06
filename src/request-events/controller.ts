import "@/server-only";
import {
  getRequestEventsPage,
  getRequestEvent,
  updateRequestEvent,
  getRequestEventBySharedId,
  deleteRequestEvent,
  clearRequestEvents,
  bulkDeleteRequestEvents,
  archiveRequestEvent,
  unarchiveRequestEvent,
  bulkArchiveRequestEvents,
} from "./model";
import { decodeRequestCursor } from "./cursor";
import { sendWebhookRequest } from "@/webhook-server/send-request";
import { captureOutboundRequest } from "@/webhook-server/capture-outbound-request";
import { requestSchema, type HandlerRequest } from "@/webhook-server/schema";
import { z } from "zod/v4";
import { uuidSchema } from "@/util/uuid";
import { timestampSchema } from "@/util/datetime";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// Parse a positive integer, defaulting to DEFAULT_LIMIT for missing/invalid
// input. The caller clamps the result to MAX_LIMIT so oversized values scale
// down monotonically rather than snapping back to the default.
const limitSchema = z.coerce.number().int().positive().catch(DEFAULT_LIMIT);

const bulkDeleteBodySchema = z.object({
  ids: z.array(uuidSchema).optional().default([]),
});

const archiveBodySchema = z.object({
  archived_timestamp: timestampSchema.nullish(),
});

const bulkArchiveBodySchema = z.object({
  ids: z.array(uuidSchema).optional().default([]),
  archived_timestamp: timestampSchema,
});

export const requestEventController = {
  "/api/requests": {
    GET: (req) => {
      const url = new URL(req.url);
      const includeArchived =
        url.searchParams.get("includeArchived") === "true";
      const search = url.searchParams.get("search") ?? undefined;
      const cursor = url.searchParams.get("cursor") ?? undefined;

      // Reject a malformed cursor with a 400 rather than letting the decode
      // throw bubble up to a 500.
      if (cursor !== undefined) {
        try {
          decodeRequestCursor(cursor);
        } catch {
          return Response.json({ error: "Invalid cursor" }, { status: 400 });
        }
      }

      const limit = Math.min(
        limitSchema.parse(url.searchParams.get("limit") ?? DEFAULT_LIMIT),
        MAX_LIMIT,
      );
      return Response.json(
        getRequestEventsPage({ limit, cursor, includeArchived, search }),
      );
    },
    DELETE: (req) => {
      const count = clearRequestEvents();
      return Response.json({ status: "ok", deleted_count: count });
    },
  },
  "/api/requests/send": {
    POST: async (req) => {
      const request = requestSchema.parse(await req.json()) as HandlerRequest;
      if (request.external) {
        const { event, response } = await captureOutboundRequest(request);
        if (!response) {
          return Response.json(
            {
              status: "error",
              external: true,
              event_id: event.id,
              message: "External request failed",
            },
            { status: 502 },
          );
        }
        return Response.json({
          status: "ok",
          external: true,
          event_id: event.id,
          response: {
            status: response.status,
            statusText: response.statusText,
          },
        });
      }
      const response = await sendWebhookRequest(request);
      void response.body?.cancel();
      return Response.json({
        status: "ok",
        external: false,
        response: { status: response.status, statusText: response.statusText },
      });
    },
  },
  "/api/requests/bulk-delete": {
    DELETE: async (req) => {
      const body = bulkDeleteBodySchema.parse(await req.json());
      const count = bulkDeleteRequestEvents(
        body.ids.length > 0 ? body.ids : undefined,
      );
      return Response.json({ status: "ok", deleted_count: count });
    },
  },
  "/api/requests/bulk-archive": {
    PATCH: async (req) => {
      const body = bulkArchiveBodySchema.parse(await req.json());
      const count = bulkArchiveRequestEvents(
        body.ids.length > 0 ? body.ids : undefined,
      );
      return Response.json({ status: "ok", archived_count: count });
    },
  },
  "/api/requests/:id": {
    GET: (req) => {
      const request = getRequestEvent(req.params.id);

      if (!request) {
        return new Response(null, { status: 404 });
      }

      return Response.json(request);
    },
    PATCH: async (req) => {
      const body = archiveBodySchema.parse(await req.json());

      if (body.archived_timestamp === null) {
        const result = unarchiveRequestEvent(req.params.id);
        return Response.json(result);
      } else {
        const result = archiveRequestEvent(req.params.id);
        return Response.json(result);
      }
    },
    DELETE: (req) => {
      deleteRequestEvent(req.params.id);
      return Response.json({ status: "ok" });
    },
  },
  "/api/requests/:id/share": {
    POST: async (req) => {
      const request = getRequestEvent(req.params.id);

      if (!request) {
        return new Response(null, { status: 404 });
      }

      const body = await req.json();
      const enable = body.enable ?? true;

      let sharedId: string | null = null;
      if (enable) {
        // Generate a secure random ID for sharing
        const crypto = await import("crypto");
        sharedId = crypto.randomBytes(16).toString("hex");
      }

      const updatedRequest = updateRequestEvent({
        id: req.params.id,
        shared_id: sharedId,
      });

      return Response.json({
        shared: !!sharedId,
        sharedId,
        shareUrl: sharedId ? `/shared/${sharedId}` : null,
      });
    },
  },
};

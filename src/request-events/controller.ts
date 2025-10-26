import "@/server-only";
import {
  getAllRequestEventsMeta,
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
import { sendWebhookRequest } from "@/webhook-server/send-request";
import { z } from "zod/v4";
import { uuidSchema } from "@/util/uuid";
import { timestampSchema } from "@/util/datetime";

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
      return Response.json(getAllRequestEventsMeta(includeArchived));
    },
    DELETE: (req) => {
      const count = clearRequestEvents();
      return Response.json({ status: "ok", deleted_count: count });
    },
  },
  "/api/requests/send": {
    POST: async (req) => {
      const response = await sendWebhookRequest(await req.json());
      return Response.json({
        status: "ok",
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

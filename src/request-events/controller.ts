import "@/server-only";
import {
  getAllRequestEventsMeta,
  getRequestEvent,
  updateRequestEvent,
  getRequestEventBySharedId,
} from "./model";
import { sendWebhookRequest } from "@/webhook-server/send-request";

export const requestEventController = {
  "/api/requests": {
    GET: (req) => {
      return Response.json(getAllRequestEventsMeta());
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
  "/api/requests/:id": {
    GET: (req) => {
      const request = getRequestEvent(req.params.id);

      if (!request) {
        return new Response(null, { status: 404 });
      }

      return Response.json(request);
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

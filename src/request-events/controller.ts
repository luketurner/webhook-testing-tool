import "@/server-only";
import { seedRequestData } from "@/util/seed";
import { getAllRequestEventsMeta, getRequestEvent } from "./model";
import { sendWebhookRequest } from "@/webhook-server/send-request";

export const requestEventController = {
  "/api/requests": {
    GET: (req) => {
      return Response.json(getAllRequestEventsMeta());
    },
  },
  "/api/requests/seed": {
    POST: async (req) => {
      await seedRequestData();
      return Response.json({ status: "ok" });
    },
  },
  "/api/requests/send": {
    POST: async (req) => {
      await sendWebhookRequest(await req.json());
      return Response.json({ status: "ok" });
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
};

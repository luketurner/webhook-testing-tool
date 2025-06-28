import "@/server-only";
import { seedRequestData } from "@/util/seed";
import { getAllRequestEventsMeta, getRequestEvent } from "./model";
import { sendWebhookRequest } from "@/webhook-server/send-request";
import { createApiResponse } from "@/shared/controller-utils";

export const requestEventController = {
  "/api/requests": {
    GET: (req) => {
      return createApiResponse.success(getAllRequestEventsMeta());
    },
  },
  "/api/requests/seed": {
    POST: async (req) => {
      await seedRequestData();
      return createApiResponse.ok();
    },
  },
  "/api/requests/send": {
    POST: async (req) => {
      await sendWebhookRequest(await req.json());
      return createApiResponse.ok();
    },
  },
  "/api/requests/:id": {
    GET: (req) => {
      const request = getRequestEvent(req.params.id);

      if (!request) {
        return createApiResponse.notFound();
      }

      return createApiResponse.success(request);
    },
  },
};

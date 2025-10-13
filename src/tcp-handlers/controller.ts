import "@/server-only";

import { apiResponse } from "@/util/api-response";
import {
  createTcpHandler,
  deleteTcpHandler,
  getAllTcpHandlers,
  getTcpHandler,
  updateTcpHandler,
} from "./model";

export const tcpHandlerController = {
  "/api/tcp-handlers": {
    GET: (_req: Request) => {
      return apiResponse.success(getAllTcpHandlers());
    },
    POST: async (req: Request) => {
      const handlerData = await req.json();
      createTcpHandler(handlerData);
      return apiResponse.ok();
    },
  },
  "/api/tcp-handlers/:id": {
    GET: (req: Request) => {
      const handler = getTcpHandler((req as any).params.id);
      if (!handler) {
        return apiResponse.notFound();
      }
      return apiResponse.success(handler);
    },
    PUT: async (req: Request) => {
      updateTcpHandler(await req.json());
      return apiResponse.ok();
    },
    DELETE: async (req: Request) => {
      deleteTcpHandler((req as any).params.id);
      return apiResponse.deleted();
    },
  },
};

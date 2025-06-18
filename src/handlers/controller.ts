import "@/server-only";

import {
  createHandler,
  deleteHandler,
  getAllHandlers,
  getHandler,
  getNextHandlerOrder,
  reorderHandlers,
  updateHandler,
} from "./model";
import { bulkReorderSchema } from "./schema";
import { z } from "zod/v4";

export const handlerController = {
  "/api/handlers": {
    GET: (req) => {
      return Response.json(getAllHandlers());
    },
    POST: async (req) => {
      const handlerData = await req.json();

      // Auto-assign order if not provided
      if (handlerData.order === undefined || handlerData.order === null) {
        handlerData.order = getNextHandlerOrder();
      }

      createHandler(handlerData);
      return Response.json({ status: "ok" });
    },
  },
  "/api/handlers/:id": {
    GET: (req) => {
      return Response.json(getHandler(req.params.id));
    },
    PUT: async (req) => {
      updateHandler(await req.json());
      return Response.json({ status: "ok" });
    },
    DELETE: async (req) => {
      deleteHandler(req.params.id);
      return Response.json({ status: "deleted" });
    },
  },
  "/api/handlers/reorder": {
    POST: async (req) => {
      const body = await req.json();
      const validatedData = bulkReorderSchema.parse(body);
      reorderHandlers(validatedData.updates);
      return Response.json({ status: "ok" });
    },
  },
};

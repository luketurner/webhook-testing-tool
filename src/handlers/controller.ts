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
import { createApiResponse } from "@/shared/controller-utils";
import { z } from "zod/v4";

export const handlerController = {
  "/api/handlers": {
    GET: (req) => {
      return createApiResponse.success(getAllHandlers());
    },
    POST: async (req) => {
      const handlerData = await req.json();

      // Auto-assign order if not provided
      if (handlerData.order === undefined || handlerData.order === null) {
        handlerData.order = getNextHandlerOrder();
      }

      createHandler(handlerData);
      return createApiResponse.ok();
    },
  },
  "/api/handlers/:id": {
    GET: (req) => {
      const handler = getHandler(req.params.id);
      if (!handler) {
        return createApiResponse.notFound();
      }
      return createApiResponse.success(handler);
    },
    PUT: async (req) => {
      updateHandler(await req.json());
      return createApiResponse.ok();
    },
    DELETE: async (req) => {
      deleteHandler(req.params.id);
      return createApiResponse.deleted();
    },
  },
  "/api/handlers/reorder": {
    POST: async (req) => {
      const body = await req.json();
      const validatedData = bulkReorderSchema.parse(body);
      reorderHandlers(validatedData.updates);
      return createApiResponse.ok();
    },
  },
};

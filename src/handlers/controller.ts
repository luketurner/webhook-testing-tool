import "@/server-only";

import { apiResponse } from "@/util/api-response";
import { parseRequestBody } from "@/util/request-helpers";
import {
  createHandler,
  deleteHandler,
  getAllHandlers,
  getHandler,
  getNextHandlerOrder,
  reorderHandlers,
  updateHandler,
} from "./model";
import { bulkReorderSchema, type BulkReorderRequest } from "./schema";

export const handlerController = {
  "/api/handlers": {
    GET: (req) => {
      return apiResponse.success(getAllHandlers());
    },
    POST: async (req) => {
      const handlerData = await req.json();

      // Auto-assign order if not provided
      if (handlerData.order === undefined || handlerData.order === null) {
        handlerData.order = getNextHandlerOrder();
      }

      createHandler(handlerData);
      return apiResponse.ok();
    },
  },
  "/api/handlers/:id": {
    GET: (req) => {
      return apiResponse.success(getHandler(req.params.id));
    },
    PUT: async (req) => {
      updateHandler(await req.json());
      return apiResponse.ok();
    },
    DELETE: async (req) => {
      deleteHandler(req.params.id);
      return apiResponse.deleted();
    },
  },
  "/api/handlers/reorder": {
    POST: async (req) => {
      const validatedData = await parseRequestBody<BulkReorderRequest>(
        req,
        bulkReorderSchema,
      );
      reorderHandlers(validatedData.updates);
      return apiResponse.ok();
    },
  },
};

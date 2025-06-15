import "@/server-only";

import {
  createHandler,
  deleteHandler,
  getAllHandlers,
  getHandler,
  updateHandler,
} from "./model";

export const handlerController = {
  "/api/handlers": {
    GET: (req) => {
      return Response.json(getAllHandlers());
    },
    POST: async (req) => {
      createHandler(await req.json());
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
};

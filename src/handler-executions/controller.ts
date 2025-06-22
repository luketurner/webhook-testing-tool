import "@/server-only";
import { getHandlerExecutionsByRequestId } from "./model";

export const handlerExecutionController = {
  "/api/requests/:requestId/handler-executions": {
    GET: (req) => {
      const executions = getHandlerExecutionsByRequestId(req.params.requestId);
      return Response.json(executions);
    },
  },
};

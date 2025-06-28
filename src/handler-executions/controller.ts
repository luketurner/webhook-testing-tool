import "@/server-only";
import { getHandlerExecutionsByRequestId } from "./model";
import { createApiResponse } from "@/shared/controller-utils";

export const handlerExecutionController = {
  "/api/requests/:requestId/handler-executions": {
    GET: (req) => {
      const executions = getHandlerExecutionsByRequestId(req.params.requestId);
      return createApiResponse.success(executions);
    },
  },
};

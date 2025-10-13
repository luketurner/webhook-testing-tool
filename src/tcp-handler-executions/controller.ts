import "@/server-only";
import { getTcpHandlerExecutionsByConnectionId } from "./model";

export const tcpHandlerExecutionController = {
  "/api/tcp-connections/:connectionId/handler-executions": {
    GET: (req) => {
      const executions = getTcpHandlerExecutionsByConnectionId(
        req.params.connectionId,
      );
      return Response.json(executions);
    },
  },
};

import "@/server-only";
import {
  getAllTcpConnectionsMeta,
  getTcpConnection,
  deleteTcpConnection,
  clearTcpConnections,
} from "./model";

export const tcpConnectionController = {
  "/api/tcp-connections": {
    GET: (req) => {
      return Response.json(getAllTcpConnectionsMeta());
    },
    DELETE: (req) => {
      clearTcpConnections();
      return Response.json({ status: "ok" });
    },
  },
  "/api/tcp-connections/:id": {
    GET: (req) => {
      const connection = getTcpConnection(req.params.id);

      if (!connection) {
        return new Response(null, { status: 404 });
      }

      return Response.json(connection);
    },
    DELETE: (req) => {
      deleteTcpConnection(req.params.id);
      return Response.json({ status: "ok" });
    },
  },
};

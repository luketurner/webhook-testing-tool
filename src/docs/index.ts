import cli from "./cli.md" with { type: "file" };
import configuration from "./configuration.md" with { type: "file" };
import handlers from "./handlers.md" with { type: "file" };
import home from "./home.md" with { type: "file" };
import http2 from "./http2.md" with { type: "file" };
import inspectingRequests from "./inspecting-requests.md" with { type: "file" };
import mcp from "./mcp.md" with { type: "file" };
import sendingRequests from "./sending-requests.md" with { type: "file" };
import tcpConnections from "./tcp-connections.md" with { type: "file" };
import tcpHandlers from "./tcp-handlers.md" with { type: "file" };
import tls from "./tls.md" with { type: "file" };
import webhookServer from "./webhook-server.md" with { type: "file" };

export const manualPages = {
  cli,
  configuration,
  handlers,
  home,
  http2,
  "inspecting-requests": inspectingRequests,
  mcp,
  "sending-requests": sendingRequests,
  "tcp-connections": tcpConnections,
  "tcp-handlers": tcpHandlers,
  tls,
  "webhook-server": webhookServer,
};

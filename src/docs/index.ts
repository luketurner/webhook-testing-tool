import handlers from "./handlers.md" with { type: "file" };
import home from "./home.md" with { type: "file" };
import mcp from "./mcp.md" with { type: "file" };
import tcpHandlers from "./tcp-handlers.md" with { type: "file" };

export const manualPages = {
  handlers,
  home,
  mcp,
  "tcp-handlers": tcpHandlers,
};

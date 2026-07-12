import "@/server-only";
import type { RequestEvent } from "@/request-events/schema";
import { createRequestEvent, updateRequestEvent } from "@/request-events/model";
import { appEvents } from "@/db/events";
import { requestSchema, type HandlerRequest } from "./schema";
import { sendWebhookRequest } from "./send-request";
import { randomUUID } from "@/util/uuid";
import { now } from "@/util/datetime";
import { parseBase64 } from "@/util/base64";

// Sends an external request and records it as an "outbound" RequestEvent,
// mirroring the create->update lifecycle that processRequest uses for inbound
// requests. Only external requests go through here; internal sends loop back
// through the local webhook server and are captured as "inbound".
export async function captureOutboundRequest(request: HandlerRequest): Promise<{
  event: RequestEvent;
  response: Response | null;
  body: string | null;
}> {
  // Validate before persisting so an invalid request (e.g. external:true with a
  // path from the MCP tool, whose flat inputSchema has no cross-field refine)
  // fails fast rather than creating a bogus "error" event.
  const req = requestSchema.parse(request) as HandlerRequest;

  const event: RequestEvent = {
    id: randomUUID(),
    type: "outbound",
    status: "running",
    request_method: req.method,
    request_url: req.url,
    request_query_params: req.query,
    request_headers: req.headers,
    request_body: req.body ? parseBase64(req.body) : null,
    request_timestamp: now(),
  };
  const created = createRequestEvent(event);
  appEvents.emit("request:created", created);

  try {
    const response = await sendWebhookRequest(req);
    const body = Buffer.from(await response.arrayBuffer()).toString("base64");
    const updated = updateRequestEvent({
      id: event.id,
      status: "complete",
      response_status: response.status,
      response_status_message: response.statusText || null,
      response_headers: [...response.headers.entries()],
      response_body: parseBase64(body),
      response_timestamp: now(),
    });
    appEvents.emit("request:updated", updated);
    return { event: updated, response, body };
  } catch {
    const updated = updateRequestEvent({
      id: event.id,
      status: "error",
      response_timestamp: now(),
    });
    appEvents.emit("request:updated", updated);
    return { event: updated, response: null, body: null };
  }
}

import "@/server-only";
import { WEBHOOK_PORT } from "@/config-shared";
import { requestSchema, type HandlerRequest } from "./schema";

export const LOCAL_WEBHOOK_URL = `http://localhost:${WEBHOOK_PORT}`;

export async function sendWebhookRequest(opts: HandlerRequest) {
  const { url, method, body, headers } = requestSchema.parse(
    opts,
  ) as HandlerRequest;
  const absoluteUrl = new URL(url, LOCAL_WEBHOOK_URL);
  return await fetch(absoluteUrl, {
    method,
    body,
    headers,
  });
}

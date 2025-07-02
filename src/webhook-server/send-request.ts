import "@/server-only";
import { WEBHOOK_PORT } from "@/config-shared";
import { requestSchema, type HandlerRequest } from "./schema";

export const LOCAL_WEBHOOK_URL = `http://localhost:${WEBHOOK_PORT}`;

export async function sendWebhookRequest(opts: HandlerRequest) {
  const { url, method, body, headers, query } = requestSchema.parse(
    opts,
  ) as HandlerRequest;
  const absoluteUrl = new URL(url, LOCAL_WEBHOOK_URL);

  // Add query parameters to URL
  if (query && query.length > 0) {
    for (const [key, value] of query) {
      absoluteUrl.searchParams.append(key, value);
    }
  }

  return await fetch(absoluteUrl, {
    method,
    body,
    headers,
  });
}

import "@/server-only";
import { WEBHOOK_PORT } from "@/config";
import { requestSchema, type HandlerRequest } from "./schema";

export const LOCAL_WEBHOOK_URL = `http://localhost:${WEBHOOK_PORT}`;

export function resolveTargetUrl(url: string, external: boolean): URL {
  if (external) {
    return new URL(url);
  }
  const target = new URL(url, LOCAL_WEBHOOK_URL);
  if (target.origin !== new URL(LOCAL_WEBHOOK_URL).origin) {
    throw new Error(
      `Internal request escaped the local webhook origin: ${url}`,
    );
  }
  return target;
}

export async function sendWebhookRequest(opts: HandlerRequest) {
  const { url, method, body, headers, query, external } = requestSchema.parse(
    opts,
  ) as HandlerRequest;
  const absoluteUrl = resolveTargetUrl(url, external);

  // Add query parameters to URL
  if (query && query.length > 0) {
    for (const [key, value] of query) {
      absoluteUrl.searchParams.append(key, value);
    }
  }

  // Convert base64 body to binary data if present
  let requestBody: BodyInit | null = null;
  if (body !== null && body !== undefined) {
    if (typeof body === "string") {
      // Assume base64-encoded body, decode to binary
      requestBody = Uint8Array.fromBase64(body);
    } else {
      // Fallback for other types (shouldn't happen with new design)
      requestBody = body;
    }
  }

  return await fetch(absoluteUrl, {
    method,
    body: requestBody,
    headers,
  });
}

import "@/server-only";
import { WEBHOOK_PORT } from "@/config-shared";
import {
  SEND_REQUEST_SCHEMA,
  type SendRequestOptions,
} from "./sendRequestClient";

export const LOCAL_WEBHOOK_URL = `http://localhost:${WEBHOOK_PORT}`;

export async function sendWebhookRequest(opts: SendRequestOptions) {
  const { path, method, body, headers } = SEND_REQUEST_SCHEMA.parse(
    opts
  ) as SendRequestOptions;
  const url = new URL(path, LOCAL_WEBHOOK_URL);
  return await fetch(url, {
    method,
    body,
    headers,
  });
}

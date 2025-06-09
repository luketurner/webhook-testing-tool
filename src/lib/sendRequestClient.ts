import { kvListSchema, type KVList } from "./kvList";
import { z } from "zod";

export interface SendRequestOptions {
  method: string;
  path: string;
  headers?: KVList<string>; // TODO
  body?: string;
}

export const SENDABLE_HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "OPTIONS",
  "HEAD",
  "PATCH",
] as const;

export const SEND_REQUEST_SCHEMA = z.object({
  method: z.enum(SENDABLE_HTTP_METHODS),
  path: z.string(),
  body: z.string().optional(),
  headers: kvListSchema(z.string()).optional().default([]),
});

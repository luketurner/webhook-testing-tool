import type { HTTP_METHODS } from "@/lib/utils";

export type HandlerMethod = (typeof HTTP_METHODS)[number];

export interface Handler {
  id: string;
  versionId: string;
  name: string;
  code: string;
  path: string;
  method: HandlerMethod;
  order: number;
}

export type HandlerMetadata = Pick<
  Handler,
  "id" | "versionId" | "name" | "path" | "method" | "order"
>;

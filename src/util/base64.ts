import { z } from "zod/v4";

export const base64Schema = z.base64().brand<"b64">();
export type Base64 = z.infer<typeof base64Schema>;

export const parseBase64 = (v: unknown): Base64 => base64Schema.parse(v);
export const fromBufferLike = (s: Uint8Array | Buffer | string | null) => {
  if (!s) return null;
  if (typeof s === "string") return base64Schema.parse(s);
  return base64Schema.parse(Buffer.from(s as any).toString("base64"));
};

export function base64FieldToSql<T>(obj: T, k: keyof T) {
  return typeof obj[k] === "string"
    ? { [k]: Uint8Array.fromBase64(obj[k] as string) }
    : null;
}

import { z } from "zod/v4";

export const uuidSchema = z.uuid().brand<"uuid">();
export type UUID = z.infer<typeof uuidSchema>;

export const parseUUID = (v: unknown): UUID => uuidSchema.parse(v);

/**
 * `crypto.randomUUID` is only exposed in a secure context (HTTPS, `localhost`,
 * or `127.0.0.1`), so it is missing when the dashboard is served over plain
 * HTTP on a LAN or tailnet hostname. `crypto.getRandomValues` carries no such
 * restriction, so the fallback assembles a v4 UUID from it directly.
 */
export const randomUUID = (): UUID =>
  parseUUID(
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : randomUUIDFromRandomValues(),
  );

function randomUUIDFromRandomValues(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  // Version 4 in the high nibble of byte 6, RFC 4122 variant in byte 8.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

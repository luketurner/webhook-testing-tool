import type { KVList } from "@/util/kv-list";

export type RawHeaders = Record<string, string | string[] | number | undefined>;

// AIDEV-NOTE: RFC 9113 section 8.2.2 -- connection-specific header fields are
// forbidden in HTTP/2. Node throws ERR_HTTP2_INVALID_CONNECTION_HEADERS on these;
// Bun silently forwards them, which produces a protocol-illegal response.
// Strip them so behavior is correct and identical on both runtimes.
export const FORBIDDEN_RESPONSE_HEADERS: ReadonlySet<string> = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-connection",
]);

export function normalizeHeaderValue(
  value: string | string[] | number | undefined,
): string | null {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return String(value);
  return value;
}

/**
 * Splits an HTTP/2 header object into pseudo-headers (`:method`, `:path`,
 * `:scheme`, `:authority`) and ordinary headers. Pseudo-headers are kept out of
 * `request_headers` so consumers (copy-as-curl, resend, user handlers) never see
 * `:method` as though it were an ordinary header.
 */
export function splitPseudoHeaders(headers: RawHeaders): {
  pseudo: KVList<string>;
  regular: KVList<string>;
} {
  const pseudo: KVList<string> = [];
  const regular: KVList<string> = [];

  // NOTE: Object.entries skips the `http2.sensitiveHeaders` symbol key.
  for (const [key, rawValue] of Object.entries(headers)) {
    const value = normalizeHeaderValue(rawValue);
    if (value === null) continue;
    if (key.startsWith(":")) {
      pseudo.push([key, value]);
    } else {
      regular.push([key, value]);
    }
  }

  return { pseudo, regular };
}

export function stripForbiddenResponseHeaders(
  headers: KVList<string>,
): KVList<string> {
  return headers.filter(
    ([key]) => !FORBIDDEN_RESPONSE_HEADERS.has(key.toLowerCase()),
  );
}

// NGHTTP2_FLAG_END_STREAM = 0x1, NGHTTP2_FLAG_END_HEADERS = 0x4
export function parseHeadersFrameFlags(flags: number): {
  end_stream: boolean;
  end_headers: boolean;
} {
  return {
    end_stream: (flags & 0x1) !== 0,
    end_headers: (flags & 0x4) !== 0,
  };
}

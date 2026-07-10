import "@/server-only";
import http2, {
  type ServerHttp2Stream,
  type IncomingHttpHeaders,
} from "node:http2";
import { EXCLUDE_HEADER_MAP } from "@/config";
import { fromBufferLike } from "@/util/base64";
import type { HttpMethod } from "@/util/http";
import { extractTlsInfo } from "../tls-info";
import {
  processRequest,
  EMPTY_SENT,
  type NormalizedRequest,
  type Responder,
} from "../process-request";
import { extractHttp2Info } from "./metadata";
import { splitPseudoHeaders, stripForbiddenResponseHeaders } from "./headers";

function createHttp2Responder(stream: ServerHttp2Stream): Responder {
  return {
    send(outcome) {
      return new Promise((resolve) => {
        if (stream.destroyed) {
          resolve(EMPTY_SENT);
          return;
        }

        // The "abort" and "raw" outcomes are implemented in Task 5, test-first.
        // Until then they surface as an error rather than silently doing nothing;
        // handleHttp2Stream's .catch resets the stream.
        if (outcome.kind !== "http") {
          throw new Error(
            `Unsupported HTTP/2 response outcome: ${outcome.kind}`,
          );
        }

        const headers = stripForbiddenResponseHeaders(outcome.headers);
        const body =
          outcome.body === null
            ? Buffer.from(JSON.stringify({ status: outcome.status }))
            : outcome.body;

        const responseHeaders: Record<string, string> = {};
        for (const [key, value] of headers) {
          responseHeaders[key] = value.toString();
        }
        if (outcome.body === null && !hasContentType(headers)) {
          responseHeaders["content-type"] = "application/json";
        }

        stream.respond({ ":status": outcome.status, ...responseHeaders });
        stream.end(body, () => {
          resolve({
            status: outcome.status,
            // HTTP/2 carries no status reason phrase.
            statusMessage: null,
            // Record what was ACTUALLY sent (including any content-type we added),
            // mirroring the fidelity the Express adapter gets from its res.end hook.
            headers: Object.entries(responseHeaders),
            body,
          });
        });
      });
    },
  };
}

function hasContentType(headers: [string, string][]): boolean {
  return headers.some(([key]) => key.toLowerCase() === "content-type");
}

function normalizeHttp2Request(
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders,
  flags: number,
  body: Buffer,
): NormalizedRequest {
  const { pseudo, regular } = splitPseudoHeaders(headers);

  const filtered = regular.filter(([key]) => !EXCLUDE_HEADER_MAP[key]);

  const rawPath = pseudo.find(([key]) => key === ":path")?.[1] ?? "/";
  const authority =
    pseudo.find(([key]) => key === ":authority")?.[1] ?? "localhost";
  const method = (pseudo.find(([key]) => key === ":method")?.[1] ??
    "GET") as HttpMethod;

  const url = new URL(rawPath, `https://${authority}`);

  return {
    method,
    url: url.pathname,
    headers: filtered,
    queryParams: [...url.searchParams.entries()],
    body: body.length > 0 ? fromBufferLike(body) : null,
    httpVersion: "2.0",
    tlsInfo: extractTlsInfo(stream.session?.socket),
    http2Info: extractHttp2Info(stream, pseudo, flags),
  };
}

export function handleHttp2Stream(
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders,
  flags: number,
): void {
  const chunks: Buffer[] = [];

  stream.on("error", (err) => {
    console.error("HTTP/2 stream error:", err);
  });

  stream.on("data", (chunk: Buffer) => {
    chunks.push(Buffer.from(chunk));
  });

  // AIDEV-NOTE: 'end' fires for GET/HEAD/empty-POST too (END_STREAM on HEADERS),
  // so it is always safe to wait for it before processing.
  stream.on("end", () => {
    const body = Buffer.concat(chunks);
    const normalized = normalizeHttp2Request(stream, headers, flags, body);

    processRequest(normalized, createHttp2Responder(stream)).catch((err) => {
      console.error("Error processing HTTP/2 request:", err);
      if (!stream.destroyed) {
        stream.close(http2.constants.NGHTTP2_INTERNAL_ERROR);
      }
    });
  });
}

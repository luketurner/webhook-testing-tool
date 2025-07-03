/**
 * Implementation of the Web server that receives arbitrary HTTP requests, runs a Handler chain for the requests, and returns a response.
 * The execution of each request is tracked as a RequestEvent.
 * This file supports both HTTP and HTTPS connections with TLS info capture.
 */
import "@/server-only";
import express from "express";
import morgan from "morgan";
import bodyParser from "body-parser";
import https from "https";
import fs from "fs";
import type { TLSSocket } from "tls";
import {
  EXCLUDE_HEADER_MAP,
  WEBHOOK_PORT,
  WEBHOOK_SSL_ENABLED,
  WEBHOOK_SSL_PORT,
  WEBHOOK_SSL_CERT_PATH,
  WEBHOOK_SSL_KEY_PATH,
} from "../config-shared";
import type { RequestEvent } from "@/request-events/schema";
import { randomUUID } from "@/util/uuid";
import { now } from "@/util/timestamp";
import { fromObject } from "@/util/kv-list";
import type { HttpMethod } from "@/util/http";
import { fromBufferLike } from "@/util/base64";
import { createRequestEvent, updateRequestEvent } from "@/request-events/model";
import { appEvents } from "@/db/events";
import { handleRequest } from "./handle-request";

// NOTE: Express is used for the webhook server instead of Bun.serve() because we want to
// be able to inspect the final HTTP response sent to the client (including content-length, etc.)
// which isn't possible with Bun.serve().
const app = express();

app.use(morgan("combined"));
app.use(bodyParser.raw({ type: (_req) => true }));

// Function to extract TLS info from socket
function extractTlsInfo(socket: any): string | null {
  if (!socket || !socket.encrypted) {
    return null;
  }

  const tlsSocket = socket as TLSSocket;

  try {
    const tlsInfo: any = {};

    // Check if methods exist before calling them
    if (typeof tlsSocket.getProtocol === "function") {
      tlsInfo.protocol = tlsSocket.getProtocol();
    }

    if (typeof tlsSocket.getCipher === "function") {
      tlsInfo.cipher = tlsSocket.getCipher();
    }

    if (typeof tlsSocket.getPeerCertificate === "function") {
      const cert = tlsSocket.getPeerCertificate();
      if (cert && Object.keys(cert).length > 0) {
        tlsInfo.peerCertificate = {
          subject: cert.subject,
          issuer: cert.issuer,
          valid_from: cert.valid_from,
          valid_to: cert.valid_to,
          fingerprint: cert.fingerprint,
        };
      }
    }

    if (typeof tlsSocket.isSessionReused === "function") {
      tlsInfo.isSessionReused = tlsSocket.isSessionReused();
    }

    // AIDEV-NOTE: TLS info is stored as JSON string in the database
    return JSON.stringify(tlsInfo);
  } catch (err) {
    console.error("Failed to extract TLS info:", err);
    return null;
  }
}

app.all("*", async (req, res) => {
  const headers = { ...req.headers };
  for (const header of Object.keys(headers)) {
    if (EXCLUDE_HEADER_MAP[header]) delete headers[header];
  }

  // Extract query parameters from URL
  // AIDEV-NOTE: Query parameters are extracted using URL and URLSearchParams APIs
  // which automatically handles decoding. The base URL doesn't matter since we only
  // care about the query string portion of req.originalUrl.
  const url = new URL(
    req.originalUrl,
    `http://${req.headers.host || "localhost"}`,
  );
  const queryParams = [...url.searchParams.entries()];

  // Extract TLS info if connection is HTTPS
  const tlsInfo = extractTlsInfo(req.socket);

  const event: RequestEvent = {
    id: randomUUID(),
    type: "inbound",
    status: "running",
    request_url: req.originalUrl,
    request_method: req.method as HttpMethod,
    request_timestamp: now(),
    request_body: Buffer.isBuffer(req.body) ? fromBufferLike(req.body) : null,
    request_headers: fromObject(headers),
    request_query_params: queryParams,
    tls_info: tlsInfo,
  };

  const createdEvent = createRequestEvent(event);
  appEvents.emit("request:created", createdEvent);

  // intercept response write so we can log the response info
  // ref. https://stackoverflow.com/a/50161321

  const oldWrite = res.write;
  const oldEnd = res.end;

  const chunks: Buffer[] = [];

  res.write = (...restArgs) => {
    chunks.push(Buffer.from(restArgs[0]));
    return oldWrite.apply(res, restArgs);
  };

  res.end = (...restArgs) => {
    if (restArgs[0]) {
      chunks.push(Buffer.from(restArgs[0]));
    }
    const body = Buffer.concat(chunks as any);
    const result = oldEnd.apply(res, restArgs);

    const updatedEvent = updateRequestEvent({
      id: event.id,
      status: "complete",
      response_status: res.statusCode,
      response_status_message: res.statusMessage,
      response_headers: fromObject(res.getHeaders()),
      response_body: body.length > 0 ? fromBufferLike(body) : null,
      response_timestamp: now(),
    });
    appEvents.emit("request:updated", updatedEvent);
    return result;
  };

  // TODO handle errors
  const [error, response] = await handleRequest(event);

  const responseStatus =
    typeof response?.response_status === "number"
      ? response.response_status
      : 200;
  res.status(responseStatus);
  for (const [k, v] of response?.response_headers) {
    res.set(k, v.toString());
  }
  res.send(
    response?.response_body === null || response?.response_body === undefined
      ? { status: responseStatus }
      : Buffer.from(response.response_body, "base64"),
  );
});

export interface WebhookServerOptions {
  port: number;
  ssl: {
    enabled: boolean;
    keyPath: string;
    certPath: string;
    port: number;
  };
}

export function startWebhookServer({ port, ssl }: WebhookServerOptions) {
  return new Promise<any>((resolve) => {
    // Start HTTP server
    const server = app.listen(port, () => {
      console.log(`HTTP webhook server listening on port ${port}`);

      // Start HTTPS server if enabled
      if (ssl.enabled) {
        try {
          const httpsOptions = {
            key: fs.readFileSync(ssl.keyPath),
            cert: fs.readFileSync(ssl.certPath),
          };

          https.createServer(httpsOptions, app).listen(ssl.port, () => {
            console.log(`HTTPS webhook server listening on port ${ssl.port}`);
            resolve(server);
          });
        } catch (err) {
          console.error("Failed to start HTTPS server:", err);
          console.log("Continuing with HTTP only");
          resolve(server);
        }
      } else {
        resolve(server);
      }
    });
  });
}

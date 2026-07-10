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
import http from "http";
import fs from "fs";
import { EXCLUDE_HEADER_MAP } from "@/config";
import { fromObject } from "@/util/kv-list";
import type { HttpMethod } from "@/util/http";
import { fromBufferLike } from "@/util/base64";
import { acmeManager } from "@/acme-manager";
import { ACME_ENABLED } from "@/config";
import { extractTlsInfo } from "./tls-info";
import {
  processRequest,
  EMPTY_SENT,
  type NormalizedRequest,
  type Responder,
  type SentResponse,
} from "./process-request";

// NOTE: Express is used for the webhook server instead of Bun.serve() because we want to
// be able to inspect the final HTTP response sent to the client (including content-length, etc.)
// which isn't possible with Bun.serve().
const app = express();

app.use(morgan("combined"));
app.use(bodyParser.raw({ type: (_req) => true }));

// Handle ACME HTTP-01 challenges
if (ACME_ENABLED) {
  app.get("/.well-known/acme-challenge/:token", (req, res) => {
    const token = req.params.token;
    const keyAuthorization = acmeManager.getChallengeResponse(token);

    if (keyAuthorization) {
      console.log(`Serving ACME challenge for token: ${token}`);
      res.set("Content-Type", "text/plain");
      res.send(keyAuthorization);
    } else {
      console.warn(`No ACME challenge found for token: ${token}`);
      res.status(404).send("Not found");
    }
  });
}

function normalizeExpressRequest(req: express.Request): NormalizedRequest {
  const headers = { ...req.headers };
  for (const header of Object.keys(headers)) {
    if (EXCLUDE_HEADER_MAP[header]) delete headers[header];
  }

  // AIDEV-NOTE: Query parameters are extracted using URL and URLSearchParams APIs
  // which automatically handles decoding. The base URL doesn't matter since we only
  // care about the query string portion of req.originalUrl.
  const url = new URL(
    req.originalUrl,
    `http://${req.headers.host || "localhost"}`,
  );

  return {
    method: req.method as HttpMethod,
    url: url.pathname,
    headers: fromObject(headers as Record<string, string | string[]>),
    queryParams: [...url.searchParams.entries()],
    body: Buffer.isBuffer(req.body) ? fromBufferLike(req.body) : null,
    httpVersion: req.httpVersion,
    tlsInfo: extractTlsInfo(req.socket),
    http2Info: null,
  };
}

function createExpressResponder(
  req: express.Request,
  res: express.Response,
): Responder {
  // intercept response write so we can log the response info actually sent
  // ref. https://stackoverflow.com/a/50161321
  const oldWrite = res.write;
  const oldEnd = res.end;
  const chunks: Buffer[] = [];
  let onSent: ((sent: SentResponse) => void) | null = null;

  res.write = (...restArgs) => {
    chunks.push(Buffer.from(restArgs[0]));
    return oldWrite.apply(res, restArgs);
  };

  res.end = (...restArgs) => {
    if (restArgs[0]) {
      chunks.push(Buffer.from(restArgs[0]));
    }
    const body = Buffer.concat(chunks);
    const result = oldEnd.apply(res, restArgs);

    onSent?.({
      status: res.statusCode,
      // Express leaves statusMessage as "" for some codes; the schema requires min(1) or null.
      statusMessage: res.statusMessage || null,
      headers: fromObject(
        res.getHeaders() as Record<string, string | string[]>,
      ),
      body: body.length > 0 ? body : null,
    });
    return result;
  };

  return {
    send(outcome) {
      return new Promise<SentResponse>((resolve) => {
        // AIDEV-NOTE: Destroy the socket without sending any response.
        if (outcome.kind === "abort") {
          req.socket.destroy();
          resolve(EMPTY_SENT);
          return;
        }

        // AIDEV-NOTE: Write raw data directly to the socket, bypassing HTTP.
        if (outcome.kind === "raw") {
          req.socket.write(outcome.data, "utf8");
          req.socket.end(() => resolve(EMPTY_SENT));
          return;
        }

        onSent = resolve;
        res.status(outcome.status);
        for (const [k, v] of outcome.headers) {
          res.set(k, v.toString());
        }
        res.send(
          outcome.body === null ? { status: outcome.status } : outcome.body,
        );
      });
    },
  };
}

app.all("*", async (req: express.Request, res: express.Response) => {
  await processRequest(
    normalizeExpressRequest(req),
    createExpressResponder(req, res),
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

export interface WebhookServerResp {
  server: http.Server;
  httpsServer?: https.Server;
}

export async function startWebhookServer({
  port,
  ssl,
}: WebhookServerOptions): Promise<WebhookServerResp> {
  return new Promise<WebhookServerResp>(async (resolve) => {
    // Start HTTP server
    const server: http.Server = app.listen(port, () => {
      console.log(`HTTP webhook server listening on port ${port}`);
    });

    // Start HTTPS server if enabled
    if (ssl.enabled) {
      try {
        let httpsOptions: https.ServerOptions;

        if (ACME_ENABLED) {
          // Initialize ACME manager
          await acmeManager.initialize();

          // Obtain or load certificate
          const certInfo = await acmeManager.obtainCertificate();

          httpsOptions = {
            key: certInfo.privateKey,
            cert: certInfo.certificate,
          };

          console.log(
            `Using ACME certificate (expires: ${certInfo.expiresAt})`,
          );
        } else {
          // Use self-signed certificates
          httpsOptions = {
            key: fs.readFileSync(ssl.keyPath),
            cert: fs.readFileSync(ssl.certPath),
          };

          console.log("Using self-signed certificate");
        }

        const httpsServer = https.createServer(httpsOptions, app);
        httpsServer.listen(ssl.port, () => {
          console.log(`HTTPS webhook server listening on port ${ssl.port}`);
          resolve({ server, httpsServer });
        });
      } catch (err) {
        console.error("Failed to start HTTPS server:", err);

        // Fall back to self-signed certificate if ACME fails
        if (ACME_ENABLED) {
          console.log("Falling back to self-signed certificate");
          try {
            const httpsOptions = {
              key: fs.readFileSync(ssl.keyPath),
              cert: fs.readFileSync(ssl.certPath),
            };

            const httpsServer = https.createServer(httpsOptions, app);
            httpsServer.listen(ssl.port, () => {
              console.log(
                `HTTPS webhook server listening on port ${ssl.port} (using fallback certificate)`,
              );
              resolve({ server, httpsServer });
            });
          } catch (fallbackErr) {
            console.error("Failed to use fallback certificate:", fallbackErr);
            console.log("Continuing with HTTP only");
            resolve({ server });
          }
        } else {
          console.log("Continuing with HTTP only");
          resolve({ server });
        }
      }
    } else {
      resolve({ server });
    }
  });
}

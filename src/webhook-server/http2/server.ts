import "@/server-only";
import http2, { type Http2SecureServer } from "node:http2";
import fs from "fs";
import { ACME_ENABLED } from "@/config";
import { acmeManager } from "@/acme-manager";
import { handleHttp2Stream } from "./stream-handler";

export interface Http2ServerOptions {
  port: number;
  certPath: string;
  keyPath: string;
}

export async function startHttp2WebhookServer({
  port,
  certPath,
  keyPath,
}: Http2ServerOptions): Promise<Http2SecureServer> {
  let credentials: { key: string | Buffer; cert: string | Buffer };

  if (ACME_ENABLED) {
    await acmeManager.initialize();
    const certInfo = await acmeManager.obtainCertificate();
    credentials = { key: certInfo.privateKey, cert: certInfo.certificate };
  } else {
    credentials = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  }

  // AIDEV-NOTE: `allowHTTP1` is pinned to false on purpose.
  //  1. Bun ignores `allowHTTP1: true` and advertises only `h2` via ALPN
  //     (https://github.com/oven-sh/bun/issues/26721), so HTTP/1.1 clients get a
  //     TLS "no application protocol" alert. That is why HTTP/2 lives on its own
  //     port instead of sharing the HTTPS port. If that bug is fixed, the ports
  //     could be merged.
  //  2. Pinning it false makes this listener behave identically on Bun and Node.
  //
  // AIDEV-NOTE: NEVER attach a 'request' listener to this server. Bun emits BOTH
  // 'stream' and 'request' for a single HTTP/2 request, so a second listener would
  // race the stream handler, respond first, and trigger ERR_HTTP2_INVALID_STREAM.
  const server = http2.createSecureServer({
    ...credentials,
    allowHTTP1: false,
  });

  server.on("stream", handleHttp2Stream);
  server.on("error", (err) => console.error("HTTP/2 server error:", err));

  return new Promise<Http2SecureServer>((resolve) => {
    server.listen(port, () => {
      console.log(`HTTP/2 webhook server listening on port ${port}`);
      resolve(server);
    });
  });
}

import "@/server-only";
import { describe, it, expect, afterEach } from "bun:test";
import http2, { type Http2SecureServer } from "node:http2";
import tls from "tls";
import { rmSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { assertGeneratedSelfSignedCert } from "@/util/generate-cert";
import { findAvailablePorts } from "@/util/port-finder";
import { startHttp2WebhookServer, restartHttp2Server } from "./server";

const openServers: Http2SecureServer[] = [];

afterEach(() => {
  while (openServers.length) {
    openServers.pop()?.close();
  }
});

async function makeCertPaths(name: string): Promise<{
  certPath: string;
  keyPath: string;
}> {
  const dir = join(tmpdir(), "wtt-restart-http2-spec", name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const certPath = join(dir, "cert.pem");
  const keyPath = join(dir, "key.pem");
  await assertGeneratedSelfSignedCert(certPath, keyPath);
  return { certPath, keyPath };
}

function h2Get(port: number): Promise<number> {
  const client = http2.connect(`https://localhost:${port}`, {
    rejectUnauthorized: false,
  });
  return new Promise<number>((resolve, reject) => {
    const req = client.request({ ":method": "GET", ":path": "/h2-restart" });
    let status = 0;
    req.on("response", (h) => (status = Number(h[":status"])));
    req.on("data", () => {});
    req.on("end", () => {
      client.close();
      resolve(status);
    });
    req.on("error", (err) => {
      client.close();
      reject(err);
    });
    req.end();
  });
}

function peerFingerprint(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: "localhost",
        port,
        rejectUnauthorized: false,
        servername: "localhost",
        ALPNProtocols: ["h2"],
      },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        resolve(cert.fingerprint256 || cert.fingerprint || "");
      },
    );
    socket.on("error", reject);
  });
}

describe("restartHttp2Server", () => {
  it("keeps serving HTTP/2 on the same port with the new certificate", async () => {
    const [port] = await findAvailablePorts(4600, 4999, 1);
    const a = await makeCertPaths("a");
    const b = await makeCertPaths("b");

    const server = await startHttp2WebhookServer({ port, ...a });
    openServers.push(server);

    expect(await h2Get(port)).toBe(200);
    const fingerprintBefore = await peerFingerprint(port);
    expect(fingerprintBefore).not.toBe("");

    const restarted = await restartHttp2Server(server, { port, ...b });
    openServers.push(restarted);

    // Still serving on the same port (a plain close would have dropped it).
    expect(await h2Get(port)).toBe(200);

    // And serving the renewed certificate.
    const fingerprintAfter = await peerFingerprint(port);
    expect(fingerprintAfter).not.toBe("");
    expect(fingerprintAfter).not.toBe(fingerprintBefore);
  });
});

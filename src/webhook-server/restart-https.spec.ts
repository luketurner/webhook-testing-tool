import "@/server-only";
import { describe, it, expect, afterEach } from "bun:test";
import https from "https";
import tls from "tls";
import { readFileSync, rmSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { assertGeneratedSelfSignedCert } from "@/util/generate-cert";
import { findAvailablePorts } from "@/util/port-finder";
import { restartHttpsServer } from "./index";

const openServers: https.Server[] = [];

afterEach(() => {
  while (openServers.length) {
    openServers.pop()?.close();
  }
});

async function makeCert(name: string): Promise<https.ServerOptions> {
  const dir = join(tmpdir(), "wtt-restart-https-spec", name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const certPath = join(dir, "cert.pem");
  const keyPath = join(dir, "key.pem");
  await assertGeneratedSelfSignedCert(certPath, keyPath);
  return { key: readFileSync(keyPath), cert: readFileSync(certPath) };
}

async function listen(server: https.Server, port: number): Promise<void> {
  openServers.push(server);
  await new Promise<void>((resolve) => server.listen(port, () => resolve()));
}

function peerFingerprint(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: "localhost",
        port,
        rejectUnauthorized: false,
        servername: "localhost",
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

describe("restartHttpsServer", () => {
  it("keeps serving on the same port after a certificate swap", async () => {
    const [port] = await findAvailablePorts(4600, 4999, 1);
    const optsA = await makeCert("keeps-serving-a");
    const optsB = await makeCert("keeps-serving-b");

    const initial = https.createServer(optsA, (_req, res) => res.end("ok"));
    await listen(initial, port);

    // Serving before the swap.
    const before = await fetch(`https://localhost:${port}/`, {
      tls: { rejectUnauthorized: false },
    });
    expect(before.status).toBe(200);

    const restarted = await restartHttpsServer(initial, port, optsB);
    openServers.push(restarted);

    // Still serving on the same port after the swap (the bug left it closed).
    const after = await fetch(`https://localhost:${port}/`, {
      tls: { rejectUnauthorized: false },
    });
    expect(after.status).toBe(200);
  });

  it("serves the new certificate after the swap", async () => {
    const [port] = await findAvailablePorts(4600, 4999, 1);
    const optsA = await makeCert("new-cert-a");
    const optsB = await makeCert("new-cert-b");

    const initial = https.createServer(optsA, (_req, res) => res.end("ok"));
    await listen(initial, port);

    const fingerprintBefore = await peerFingerprint(port);
    expect(fingerprintBefore).not.toBe("");

    const restarted = await restartHttpsServer(initial, port, optsB);
    openServers.push(restarted);

    const fingerprintAfter = await peerFingerprint(port);
    expect(fingerprintAfter).not.toBe("");
    expect(fingerprintAfter).not.toBe(fingerprintBefore);
  });
});

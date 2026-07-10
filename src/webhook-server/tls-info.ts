import "@/server-only";
import type { TLSSocket } from "tls";
import type { TLSInfo } from "@/request-events/schema";

interface MaybeTlsSocket {
  encrypted?: boolean;
}

// AIDEV-NOTE: This does not work for HTTP/1 sockets in Bun due to
// https://github.com/oven-sh/bun/issues/16834 -- it returns null there.
// It DOES work on the HTTP/2 path (session.socket), which is the first place
// tls_info is ever populated under Bun.
export function extractTlsInfo(socket: unknown): TLSInfo | null {
  const maybe = socket as MaybeTlsSocket | null | undefined;
  if (!maybe || !maybe.encrypted) {
    return null;
  }

  const tlsSocket = socket as TLSSocket;

  try {
    const tlsInfo: TLSInfo = {};

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

    if (Object.keys(tlsInfo).length === 0) {
      return null;
    }

    return tlsInfo;
  } catch (err) {
    console.error("Failed to extract TLS info:", err);
    return null;
  }
}

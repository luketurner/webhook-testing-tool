import { describe, expect, test } from "bun:test";
import {
  parseSignatureHeader,
  verifyHMACSignature,
  type IParsedSignature,
} from "./hmac";
import { seedRequests } from "./seed";

/**
 * Every signed seed request embeds the secret it was signed with in its JSON
 * body, so the signatures can be re-derived from the payload. These tests fail
 * if a payload is edited without regenerating its signature headers.
 */
interface SignedSeedHeader {
  id: string;
  headerName: string;
  parsedSignature: IParsedSignature;
  payload: string;
  secret: string;
}

function collectSignedHeaders(): SignedSeedHeader[] {
  const signed: SignedSeedHeader[] = [];

  for (const request of seedRequests) {
    if (!request.body) continue;

    const payload = atob(request.body);
    let secret: unknown;
    try {
      secret = JSON.parse(payload).secret;
    } catch {
      continue;
    }
    if (typeof secret !== "string") continue;

    for (const [headerName, value] of request.headers) {
      const parsedSignature = parseSignatureHeader(value);
      if (!parsedSignature || parsedSignature.signatureType === "unknown") {
        continue;
      }
      signed.push({
        id: request.id,
        headerName,
        parsedSignature,
        payload,
        secret,
      });
    }
  }

  return signed;
}

describe("seedRequests", () => {
  test("evaluates synchronously at import time", () => {
    expect(Array.isArray(seedRequests)).toBe(true);
    expect(seedRequests.length).toBeGreaterThan(0);
  });

  test("has unique ids", () => {
    const ids = seedRequests.map((request) => request.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("includes every signed request", () => {
    const ids = new Set(collectSignedHeaders().map((header) => header.id));
    expect(ids).toEqual(
      new Set([
        "github_webhook",
        "gitea_webhook",
        "hmac_auth",
        "custom_signature",
      ]),
    );
  });

  describe("signature headers match their payloads", () => {
    for (const header of collectSignedHeaders()) {
      test(`${header.id} ${header.headerName}`, async () => {
        const result = await verifyHMACSignature(
          header.parsedSignature,
          header.payload,
          header.secret,
        );

        expect(result.error).toBeUndefined();
        expect(result.isValid).toBe(true);
      });
    }
  });
});

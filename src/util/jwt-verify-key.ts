import * as jose from "jose";
import { createPublicKey } from "node:crypto";
import { tryParseJWT } from "./authorization";
import { verifyJWT, type JWTVerificationResult } from "./jwt-verification";

export interface JWTKeyVerificationConfig {
  /**
   * Key material to verify against. Accepts a JWKS document (JSON), a single
   * JWK (JSON), a PEM-encoded key or certificate (public or private — the
   * public key is derived from private keys), or a raw HMAC shared secret.
   */
  key?: string;
  /** URL of a JWKS endpoint to fetch keys from. */
  jku?: string;
}

async function pemToJWKS(
  pem: string,
  alg: string,
): Promise<jose.JSONWebKeySet> {
  let key: jose.CryptoKey | jose.KeyObject;
  if (pem.includes("BEGIN CERTIFICATE")) {
    key = await jose.importX509(pem, alg);
  } else {
    // createPublicKey accepts public key PEMs directly and derives the
    // public key from private key PEMs (PKCS#8, PKCS#1, SEC1)
    key = createPublicKey(pem);
  }
  const jwk = await jose.exportJWK(key);
  jwk.alg = alg;
  return { keys: [jwk] };
}

function jsonToJWKS(json: string): jose.JSONWebKeySet | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  if (Array.isArray((parsed as jose.JSONWebKeySet).keys)) {
    return parsed as jose.JSONWebKeySet;
  }
  if (typeof (parsed as jose.JWK).kty === "string") {
    return { keys: [parsed as jose.JWK] };
  }
  return null;
}

// jose's local JWKS resolver only supports asymmetric keys, so HMAC secrets
// are verified directly instead of through verifyJWT's JWKS path
async function verifyWithSecret(
  token: string,
  secret: Uint8Array,
  alg: string,
  keyId?: string,
): Promise<JWTVerificationResult> {
  try {
    await jose.jwtVerify(token, secret, {
      algorithms: [alg],
    });
    return { isValid: true, algorithm: alg, keyId };
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      return {
        isValid: false,
        error: "JWT has expired",
        algorithm: alg,
        keyId,
      };
    }
    if (error instanceof jose.errors.JWTClaimValidationFailed) {
      if (error.message.includes("nbf")) {
        return {
          isValid: false,
          error: "JWT is not yet valid",
          algorithm: alg,
          keyId,
        };
      }
      return {
        isValid: false,
        error: `JWT claim validation failed: ${error.message}`,
        algorithm: alg,
        keyId,
      };
    }
    if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
      return {
        isValid: false,
        error: "JWT signature verification failed",
        algorithm: alg,
        keyId,
      };
    }
    return {
      isValid: false,
      error: `JWT verification error: ${error instanceof Error ? error.message : "Unknown error"}`,
      algorithm: alg,
      keyId,
    };
  }
}

/**
 * Verifies a raw JWT against the provided key material or JWKS endpoint,
 * including its signature and time-based claims. Thin wrapper that normalizes
 * the key into a JWKS and delegates to verifyJWT from jwt-verification.ts.
 */
export async function verifyJWTWithKey(
  token: string,
  config: JWTKeyVerificationConfig,
): Promise<JWTVerificationResult> {
  const rawToken = token.replace(/^Bearer\s+/, "").trim();
  const parsed = tryParseJWT(rawToken);
  if (!parsed?.isValid) {
    return { isValid: false, error: "Invalid JWT structure" };
  }

  if (!config.key && !config.jku) {
    return { isValid: false, error: "No key or JKU provided for verification" };
  }

  if (config.jku) {
    return verifyJWT(parsed, { jku: config.jku });
  }

  const alg = parsed.headers?.alg;
  if (typeof alg !== "string") {
    return { isValid: false, error: "Missing algorithm in JWT header" };
  }
  const keyId =
    typeof parsed.headers?.kid === "string" ? parsed.headers.kid : undefined;

  const key = config.key!.trim();
  let jwks: jose.JSONWebKeySet | null;
  try {
    if (key.startsWith("{")) {
      jwks = jsonToJWKS(key);
      if (!jwks) {
        return {
          isValid: false,
          error: "Key looks like JSON but is not a valid JWK or JWKS",
          algorithm: alg,
        };
      }
    } else if (key.includes("-----BEGIN")) {
      jwks = await pemToJWKS(key, alg);
    } else {
      return verifyWithSecret(
        rawToken,
        new TextEncoder().encode(key),
        alg,
        keyId,
      );
    }
  } catch (error) {
    return {
      isValid: false,
      error: `Failed to parse key: ${error instanceof Error ? error.message : "Unknown error"}`,
      algorithm: alg,
    };
  }

  // Symmetric JWKs can't go through verifyJWT's JWKS path either
  const octKey = jwks.keys.find(
    (k) => k.kty === "oct" && typeof k.k === "string",
  );
  if (alg.startsWith("HS") && octKey) {
    return verifyWithSecret(
      rawToken,
      jose.base64url.decode(octKey.k!),
      alg,
      keyId,
    );
  }

  return verifyJWT(parsed, { jwks: JSON.stringify(jwks) });
}

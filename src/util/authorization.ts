import {
  type HMACAuthVerificationResult,
  type IParsedSignature,
  verifyHMACSignature,
} from "./hmac";

export interface IParsedAuth {
  authType: "basic" | "digest" | "bearer" | "jwt" | "hmac" | "unknown";
  isValid: boolean;
  rawHeader: string;
  error?: Error;
}

export interface ParsedAuthBasic extends IParsedAuth {
  authType: "basic";
  username?: string;
  password?: string;
  encodedCredentials?: string;
}

export interface ParsedAuthDigest extends IParsedAuth {
  authType: "digest";
  username?: string;
  realm?: string;
  nonce?: string;
  uri?: string;
  response?: string;
  algorithm?: string;
  opaque?: string;
  qop?: string;
  nc?: string;
  cnonce?: string;
  parameters?: Record<string, string>;
}

export interface ParsedAuthGenericBearer extends IParsedAuth {
  authType: "bearer";
  token?: string;
}

export interface ParsedAuthUnknown extends IParsedAuth {
  authType: "unknown";
}

export interface ParsedAuthJWT extends IParsedAuth {
  authType: "jwt";
  headers?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  decodedHeaders?: string;
  decodedPayload?: string;
  rawHeaders?: string;
  rawPayload?: string;
  rawSignature?: string;
}

export interface ParsedAuthHMAC extends IParsedAuth {
  authType: "hmac";
  algorithm?: string;
  signature?: string;
}

export function isBasicAuth(v: IParsedAuth): v is ParsedAuthBasic {
  return v.authType === "basic";
}

export function isDigestAuth(v: IParsedAuth): v is ParsedAuthDigest {
  return v.authType === "digest";
}

export function isGenericBearerAuth(
  v: IParsedAuth,
): v is ParsedAuthGenericBearer {
  return v.authType === "bearer";
}

export function isJWTAuth(v: IParsedAuth): v is ParsedAuthJWT {
  return v.authType === "jwt";
}

export function isUnknownAuth(v: IParsedAuth): v is ParsedAuthUnknown {
  return v.authType === "unknown";
}

export function isHMACAuth(v: IParsedAuth): v is ParsedAuthHMAC {
  return v.authType === "hmac";
}

export function tryParseBasicHeader(rawHeader: string): ParsedAuthBasic | null {
  const result = rawHeader.match(/^Basic\s+([^\s]+)/);
  if (!result) return null;
  try {
    const [, encodedCredentials] = result;
    const decodedCredentials = atob(encodedCredentials);

    // N.B. username cannot contain colons, but passwords can
    // ref. https://datatracker.ietf.org/doc/html/rfc7617#section-2
    const [, username, password] = decodedCredentials.match(/^([^:]*):(.*)/);

    return {
      authType: "basic",
      isValid: true,
      encodedCredentials,
      username,
      password,
      rawHeader,
    };
  } catch (e) {
    return {
      authType: "basic",
      isValid: false,
      rawHeader,
      error: e,
    };
  }
}

export function tryParseDigestHeader(
  rawHeader: string,
): ParsedAuthDigest | null {
  if (!rawHeader.startsWith("Digest ")) return null;
  try {
    const digestContent = rawHeader.substring(7); // Remove "Digest " prefix
    const parameters: Record<string, string> = {};

    // Parse comma-separated parameters
    // Handle both quoted and unquoted values
    const paramRegex = /([\w-]+)=(?:"([^"]*)"|([^,\s]+))/g;
    let match: RegExpExecArray | null;

    while ((match = paramRegex.exec(digestContent)) !== null) {
      const [, key, quotedValue, unquotedValue] = match;
      parameters[key.toLowerCase()] = quotedValue || unquotedValue;
    }

    return {
      authType: "digest",
      isValid: true,
      rawHeader,
      username: parameters.username,
      realm: parameters.realm,
      nonce: parameters.nonce,
      uri: parameters.uri,
      response: parameters.response,
      algorithm: parameters.algorithm,
      opaque: parameters.opaque,
      qop: parameters.qop,
      nc: parameters.nc,
      cnonce: parameters.cnonce,
      parameters,
    };
  } catch (e) {
    return {
      authType: "digest",
      isValid: false,
      rawHeader,
      error: e,
    };
  }
}

export function tryParseGenericBearerHeader(
  rawHeader: string,
): ParsedAuthGenericBearer | null {
  if (!rawHeader.startsWith("Bearer ")) return null;
  const [, token] = rawHeader.match(/^Bearer\s+(.*)/);
  try {
    return {
      authType: "bearer",
      isValid: false,
      rawHeader,
      token,
    };
  } catch (e) {
    return {
      authType: "bearer",
      isValid: false,
      rawHeader,
      error: e,
    };
  }
}

export function tryParseJWTHeader(rawHeader: string): ParsedAuthJWT | null {
  const result = rawHeader.match(/^Bearer\s+([^\s.]+)\.([^\s.]+)\.([^\s.]+)/);
  if (!result) return null;
  const parsed: ParsedAuthJWT = {
    authType: "jwt",
    isValid: true,
    rawHeader,
  };
  try {
    const [, rawHeaders, rawPayload, rawSignature] = result;

    parsed.rawHeaders = rawHeaders;
    parsed.rawPayload = rawPayload;
    parsed.rawSignature = rawSignature;

    parsed.decodedHeaders = atob(rawHeaders);
    parsed.decodedPayload = atob(rawPayload);

    parsed.headers = JSON.parse(parsed.decodedHeaders);
    parsed.payload = JSON.parse(parsed.decodedPayload);

    return parsed;
  } catch (e) {
    parsed.isValid = false;
    parsed.error = e;
    return parsed;
  }
}

export function parseUnknownHeader(rawHeader: string): ParsedAuthUnknown {
  return {
    authType: "unknown",
    isValid: true,
    rawHeader,
  };
}

export function tryParseHMACHeader(rawHeader: string): ParsedAuthHMAC | null {
  // HMAC format: HMAC-SHA256 <signature> or HMAC <algorithm> <signature>
  const match = rawHeader.match(/^HMAC(?:-(\w+))? ([a-fA-F0-9]+)$/i);
  if (!match) return null;

  try {
    const [, algorithm, signature] = match;
    return {
      authType: "hmac",
      isValid: true,
      rawHeader,
      algorithm: algorithm ? algorithm.toUpperCase() : "SHA256", // Default to SHA256
      signature,
    };
  } catch (e) {
    return {
      authType: "hmac",
      isValid: false,
      rawHeader,
      error: e,
    };
  }
}

export function parseAuthorizationHeader(rawHeader: string): IParsedAuth {
  return (
    tryParseBasicHeader(rawHeader) ||
    tryParseDigestHeader(rawHeader) ||
    tryParseJWTHeader(rawHeader) ||
    tryParseHMACHeader(rawHeader) ||
    tryParseGenericBearerHeader(rawHeader) ||
    parseUnknownHeader(rawHeader)
  );
}

/**
 * Verifies an HMAC authorization header against a payload
 * @param parsedAuth The parsed authorization header from parseAuthorizationHeader
 * @param payload The raw payload (request body) to verify
 * @param secret The secret key used for HMAC
 * @returns Verification result with details
 */
export async function verifyHMACAuthorization(
  parsedAuth: IParsedAuth,
  payload: string | Uint8Array,
  secret: string,
): Promise<HMACAuthVerificationResult> {
  if (!isHMACAuth(parsedAuth)) {
    return {
      isValid: false,
      expectedSignature: "",
      actualSignature: "",
      algorithm: "UNKNOWN",
      error: "Not an HMAC authorization",
    };
  }

  // Convert ParsedAuthHMAC to IParsedSignature format for hmac.ts
  const parsedSignature: IParsedSignature = {
    signatureType: "hmac",
    isValid: parsedAuth.isValid,
    rawHeader: parsedAuth.rawHeader,
    algorithm: parsedAuth.algorithm,
    signature: parsedAuth.signature,
    error: parsedAuth.error,
  };

  // Use the verifyHMACSignature function from hmac.ts
  return verifyHMACSignature(parsedSignature, payload, secret);
}

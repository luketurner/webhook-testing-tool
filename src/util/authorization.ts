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
  // TODO
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

// Signature header types
export interface IParsedSignature {
  signatureType:
    | "hmac-sha1"
    | "hmac-sha256"
    | "hmac-sha512"
    | "hmac"
    | "unknown";
  isValid: boolean;
  rawHeader: string;
  algorithm?: string;
  signature?: string;
  error?: Error;
}

export interface ParsedHMACSignature extends IParsedSignature {
  signatureType: "hmac-sha1" | "hmac-sha256" | "hmac-sha512" | "hmac";
  algorithm: string;
  signature: string;
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

export function isHMACSignature(v: IParsedSignature): v is ParsedHMACSignature {
  return v.signatureType.startsWith("hmac");
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
    // TODO
    return {
      authType: "digest",
      isValid: true,
      rawHeader,
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

// Signature header parsing functions
export function parseGitHubSignature(
  rawHeader: string,
): ParsedHMACSignature | null {
  // GitHub format: sha1=<signature> or sha256=<signature>
  const match = rawHeader.match(/^(sha1|sha256|sha512)=([a-fA-F0-9]+)$/);
  if (!match) return null;

  const [, algorithm, signature] = match;
  return {
    signatureType: `hmac-${algorithm}` as
      | "hmac-sha1"
      | "hmac-sha256"
      | "hmac-sha512",
    isValid: true,
    rawHeader,
    algorithm: algorithm.toUpperCase(),
    signature,
  };
}

export function parseGiteaSignature(
  rawHeader: string,
): ParsedHMACSignature | null {
  // Gitea uses the same format as GitHub: sha256=<signature>
  return parseGitHubSignature(rawHeader);
}

export function parseGenericHMACSignature(
  rawHeader: string,
): ParsedHMACSignature | null {
  // Generic HMAC format: HMAC-SHA256 <signature> or just the hex signature
  const hmacMatch = rawHeader.match(/^HMAC-(\w+) ([a-fA-F0-9]+)$/i);
  if (hmacMatch) {
    const [, algorithm, signature] = hmacMatch;
    return {
      signatureType: "hmac",
      isValid: true,
      rawHeader,
      algorithm: algorithm.toUpperCase(),
      signature,
    };
  }

  // Check if it's just a hex string (common for simple HMAC implementations)
  const hexMatch = rawHeader.match(/^[a-fA-F0-9]+$/);
  if (hexMatch && rawHeader.length >= 32) {
    // At least 128 bits
    return {
      signatureType: "hmac",
      isValid: true,
      rawHeader,
      algorithm: "UNKNOWN",
      signature: rawHeader,
    };
  }

  return null;
}

export function parseSignatureHeader(rawHeader: string): IParsedSignature {
  return (
    parseGitHubSignature(rawHeader) ||
    parseGiteaSignature(rawHeader) ||
    parseGenericHMACSignature(rawHeader) || {
      signatureType: "unknown",
      isValid: false,
      rawHeader,
    }
  );
}

// Helper to identify signature-related headers
export function isSignatureHeader(headerName: string): boolean {
  const normalized = headerName.toLowerCase();
  return (
    normalized === "x-signature" ||
    normalized === "x-hub-signature" ||
    normalized === "x-hub-signature-256" ||
    normalized === "x-gitea-signature" ||
    normalized === "x-gitlab-signature" ||
    normalized.startsWith("x-signature-") ||
    normalized.includes("-signature")
  );
}

// Helper to get a display name for common signature headers
export function getSignatureHeaderInfo(
  headerName: string,
): { service: string; description: string } | null {
  const normalized = headerName.toLowerCase();

  const headerMap: Record<string, { service: string; description: string }> = {
    "x-hub-signature": {
      service: "GitHub",
      description: "HMAC-SHA1 webhook signature",
    },
    "x-hub-signature-256": {
      service: "GitHub",
      description: "HMAC-SHA256 webhook signature",
    },
    "x-gitea-signature": {
      service: "Gitea",
      description: "HMAC-SHA256 webhook signature",
    },
    "x-gitlab-signature": {
      service: "GitLab",
      description: "HMAC webhook signature",
    },
    "x-signature": {
      service: "Generic",
      description: "Generic HMAC signature",
    },
  };

  return headerMap[normalized] || null;
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

// HMAC verification for Authorization headers

export interface HMACAuthVerificationResult {
  isValid: boolean;
  expectedSignature: string;
  actualSignature: string;
  algorithm: string;
  error?: string;
}

/**
 * Verifies an HMAC Authorization header against a payload
 * @param parsedAuth The parsed authorization from parseAuthorizationHeader
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

  const algorithm = normalizeAlgorithmBrowser(parsedAuth.algorithm || "SHA256");
  if (!algorithm) {
    return {
      isValid: false,
      expectedSignature: "",
      actualSignature: parsedAuth.signature || "",
      algorithm: parsedAuth.algorithm || "UNKNOWN",
      error: `Unsupported algorithm: ${parsedAuth.algorithm}`,
    };
  }

  try {
    const expectedSignature = await generateHMACSignatureBrowser(
      payload,
      secret,
      algorithm,
    );

    // Use timing-safe comparison
    const actualSig = (parsedAuth.signature || "").toLowerCase();
    const expectedSig = expectedSignature.toLowerCase();

    const isValid =
      actualSig.length === expectedSig.length &&
      timingSafeEqualBrowser(actualSig, expectedSig);

    return {
      isValid,
      expectedSignature,
      actualSignature: parsedAuth.signature || "",
      algorithm: parsedAuth.algorithm || "SHA256",
    };
  } catch (error) {
    return {
      isValid: false,
      expectedSignature: "",
      actualSignature: parsedAuth.signature || "",
      algorithm: parsedAuth.algorithm || "SHA256",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Verifies an HMAC signature against a payload
 * @param parsedSignature The parsed signature from parseSignatureHeader
 * @param payload The raw payload (request body) to verify
 * @param secret The secret key used for HMAC
 * @returns Verification result with details
 */
export async function verifyHMACSignature(
  parsedSignature: IParsedSignature,
  payload: string | Uint8Array,
  secret: string,
): Promise<HMACAuthVerificationResult> {
  if (!isHMACSignature(parsedSignature)) {
    return {
      isValid: false,
      expectedSignature: "",
      actualSignature: parsedSignature.signature || "",
      algorithm: parsedSignature.algorithm || "UNKNOWN",
      error: "Not an HMAC signature",
    };
  }

  // For raw hex signatures with UNKNOWN algorithm, default to SHA256
  const algorithmToUse =
    parsedSignature.algorithm === "UNKNOWN"
      ? "SHA256"
      : parsedSignature.algorithm;
  const algorithm = normalizeAlgorithmBrowser(algorithmToUse);
  if (!algorithm) {
    return {
      isValid: false,
      expectedSignature: "",
      actualSignature: parsedSignature.signature,
      algorithm: parsedSignature.algorithm,
      error: `Unsupported algorithm: ${parsedSignature.algorithm}`,
    };
  }

  try {
    const expectedSignature = await generateHMACSignatureBrowser(
      payload,
      secret,
      algorithm,
    );

    // Use timing-safe comparison
    const actualSig = parsedSignature.signature.toLowerCase();
    const expectedSig = expectedSignature.toLowerCase();

    const isValid =
      actualSig.length === expectedSig.length &&
      timingSafeEqualBrowser(actualSig, expectedSig);

    return {
      isValid,
      expectedSignature,
      actualSignature: parsedSignature.signature,
      algorithm: parsedSignature.algorithm,
    };
  } catch (error) {
    return {
      isValid: false,
      expectedSignature: "",
      actualSignature: parsedSignature.signature,
      algorithm: parsedSignature.algorithm,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generates an HMAC signature for a payload
 * @param payload The payload to sign
 * @param secret The secret key
 * @param algorithm The HMAC algorithm (sha1, sha256, sha512)
 * @returns The hex-encoded signature
 */
export async function generateHMACSignature(
  payload: string | Uint8Array,
  secret: string,
  algorithm: "sha1" | "sha256" | "sha512" = "sha256",
): Promise<string> {
  const normalizedAlgorithm = normalizeAlgorithmBrowser(
    algorithm.toUpperCase(),
  );
  if (!normalizedAlgorithm) {
    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }
  return generateHMACSignatureBrowser(payload, secret, normalizedAlgorithm);
}

// Browser-compatible HMAC verification functions using SubtleCrypto API

/**
 * Browser-compatible HMAC verification using SubtleCrypto API
 * @param parsedAuth The parsed authorization from parseAuthorizationHeader
 * @param payload The raw payload (request body) to verify
 * @param secret The secret key used for HMAC
 * @returns Promise that resolves to verification result with details
 */
export async function verifyHMACAuthorizationBrowser(
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

  const algorithm = normalizeAlgorithmBrowser(parsedAuth.algorithm || "SHA256");
  if (!algorithm) {
    return {
      isValid: false,
      expectedSignature: "",
      actualSignature: parsedAuth.signature || "",
      algorithm: parsedAuth.algorithm || "UNKNOWN",
      error: `Unsupported algorithm: ${parsedAuth.algorithm}`,
    };
  }

  try {
    const expectedSignature = await generateHMACSignatureBrowser(
      payload,
      secret,
      algorithm,
    );

    // Use timing-safe comparison
    const actualSig = (parsedAuth.signature || "").toLowerCase();
    const expectedSig = expectedSignature.toLowerCase();

    const isValid =
      actualSig.length === expectedSig.length &&
      timingSafeEqualBrowser(actualSig, expectedSig);

    return {
      isValid,
      expectedSignature,
      actualSignature: parsedAuth.signature || "",
      algorithm: parsedAuth.algorithm || "SHA256",
    };
  } catch (error) {
    return {
      isValid: false,
      expectedSignature: "",
      actualSignature: parsedAuth.signature || "",
      algorithm: parsedAuth.algorithm || "SHA256",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Browser-compatible HMAC signature verification using SubtleCrypto API
 * @param parsedSignature The parsed signature from parseSignatureHeader
 * @param payload The raw payload (request body) to verify
 * @param secret The secret key used for HMAC
 * @returns Promise that resolves to verification result with details
 */
export async function verifyHMACSignatureBrowser(
  parsedSignature: IParsedSignature,
  payload: string | Uint8Array,
  secret: string,
): Promise<HMACAuthVerificationResult> {
  if (!isHMACSignature(parsedSignature)) {
    return {
      isValid: false,
      expectedSignature: "",
      actualSignature: parsedSignature.signature || "",
      algorithm: parsedSignature.algorithm || "UNKNOWN",
      error: "Not an HMAC signature",
    };
  }

  // For raw hex signatures with UNKNOWN algorithm, default to SHA256
  const algorithmToUse =
    parsedSignature.algorithm === "UNKNOWN"
      ? "SHA256"
      : parsedSignature.algorithm;
  const algorithm = normalizeAlgorithmBrowser(algorithmToUse);
  if (!algorithm) {
    return {
      isValid: false,
      expectedSignature: "",
      actualSignature: parsedSignature.signature,
      algorithm: parsedSignature.algorithm,
      error: `Unsupported algorithm: ${parsedSignature.algorithm}`,
    };
  }

  try {
    const expectedSignature = await generateHMACSignatureBrowser(
      payload,
      secret,
      algorithm,
    );

    // Use timing-safe comparison
    const actualSig = parsedSignature.signature.toLowerCase();
    const expectedSig = expectedSignature.toLowerCase();

    const isValid =
      actualSig.length === expectedSig.length &&
      timingSafeEqualBrowser(actualSig, expectedSig);

    return {
      isValid,
      expectedSignature,
      actualSignature: parsedSignature.signature,
      algorithm: parsedSignature.algorithm,
    };
  } catch (error) {
    return {
      isValid: false,
      expectedSignature: "",
      actualSignature: parsedSignature.signature,
      algorithm: parsedSignature.algorithm,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Browser-compatible HMAC signature generation using SubtleCrypto API
 * @param payload The payload to sign
 * @param secret The secret key
 * @param algorithm The HMAC algorithm name for SubtleCrypto
 * @returns Promise that resolves to the hex-encoded signature
 */
export async function generateHMACSignatureBrowser(
  payload: string | Uint8Array,
  secret: string,
  algorithm: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const payloadData =
    typeof payload === "string" ? encoder.encode(payload) : payload;

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, payloadData);

  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Normalizes algorithm names to SubtleCrypto format
 */
function normalizeAlgorithmBrowser(algorithm: string): string | null {
  const normalized = algorithm.toUpperCase();
  switch (normalized) {
    case "SHA1":
    case "SHA-1":
      return "SHA-1";
    case "SHA256":
    case "SHA-256":
      return "SHA-256";
    case "SHA512":
    case "SHA-512":
      return "SHA-512";
    default:
      return null;
  }
}

/**
 * Timing-safe string comparison for browser
 */
function timingSafeEqualBrowser(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

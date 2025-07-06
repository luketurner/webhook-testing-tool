// HMAC-related types and interfaces
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

export interface HMACAuthVerificationResult {
  isValid: boolean;
  expectedSignature: string;
  actualSignature: string;
  algorithm: string;
  error?: string;
}

// Type guards
export function isHMACSignature(v: IParsedSignature): v is ParsedHMACSignature {
  return v.signatureType.startsWith("hmac");
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
  const algorithm = normalizeAlgorithm(algorithmToUse);
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
    const expectedSignature = await generateHMACSignature(
      payload,
      secret,
      algorithm,
    );

    // Use timing-safe comparison
    const actualSig = parsedSignature.signature.toLowerCase();
    const expectedSig = expectedSignature.toLowerCase();

    const isValid =
      actualSig.length === expectedSig.length &&
      timingSafeEqual(actualSig, expectedSig);

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
  algorithm: string,
): Promise<string> {
  const normalizedAlgorithm = normalizeAlgorithm(algorithm.toUpperCase());
  if (!normalizedAlgorithm) {
    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }
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
export function normalizeAlgorithm(algorithm: string): string | null {
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
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

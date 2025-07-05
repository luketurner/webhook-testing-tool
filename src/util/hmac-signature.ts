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

export function isHMACSignature(v: IParsedSignature): v is ParsedHMACSignature {
  return v.signatureType.startsWith("hmac");
}

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
  // Use \s+ for single space, not multiple spaces
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

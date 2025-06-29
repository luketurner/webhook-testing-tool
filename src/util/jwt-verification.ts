import { type ParsedAuthJWT } from "./authorization";

export interface JWTVerificationConfig {
  jku?: string;
  jwks?: string;
}

export interface JWTVerificationResult {
  isValid: boolean;
  error?: string;
  algorithm?: string;
  keyId?: string;
}

export interface JWK {
  kty: string;
  use?: string;
  key_ops?: string[];
  alg?: string;
  kid?: string;
  x5u?: string;
  x5c?: string[];
  x5t?: string;
  "x5t#S256"?: string;
  n?: string;
  e?: string;
  d?: string;
  p?: string;
  q?: string;
  dp?: string;
  dq?: string;
  qi?: string;
  x?: string;
  y?: string;
  crv?: string;
  k?: string;
}

export interface JWKS {
  keys: JWK[];
}

async function fetchJWKS(jku: string): Promise<JWKS> {
  try {
    const response = await fetch(jku, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Webhook-Testing-Tool-JWT-Verifier/1.0",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS from ${jku}: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      throw new Error(
        `Invalid content type from JWKS endpoint: ${contentType}`,
      );
    }

    const jwks = await response.json();

    if (!jwks || typeof jwks !== "object" || !Array.isArray(jwks.keys)) {
      throw new Error("Invalid JWKS format: missing or invalid keys array");
    }

    return jwks as JWKS;
  } catch (error) {
    throw new Error(
      `Failed to fetch JWKS: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

function parseJWKS(jwksString: string): JWKS {
  try {
    const jwks = JSON.parse(jwksString);

    if (!jwks || typeof jwks !== "object" || !Array.isArray(jwks.keys)) {
      throw new Error("Invalid JWKS format: missing or invalid keys array");
    }

    return jwks as JWKS;
  } catch (error) {
    throw new Error(
      `Failed to parse JWKS: ${error instanceof Error ? error.message : "Invalid JSON"}`,
    );
  }
}

function findMatchingKey(jwks: JWKS, kid?: string, alg?: string): JWK | null {
  if (!jwks.keys || jwks.keys.length === 0) {
    return null;
  }

  // First try to find by kid if provided
  if (kid) {
    const keyById = jwks.keys.find((key) => key.kid === kid);
    if (keyById) {
      return keyById;
    }
  }

  // Then try to find by algorithm if provided
  if (alg) {
    const keyByAlg = jwks.keys.find((key) => key.alg === alg);
    if (keyByAlg) {
      return keyByAlg;
    }
  }

  // If no specific match, return the first key (common for single-key JWKS)
  return jwks.keys[0] || null;
}

async function createPublicKey(jwk: JWK): Promise<CryptoKey | null> {
  try {
    if (jwk.kty === "RSA" && jwk.n && jwk.e) {
      // RSA public key
      const keyData = {
        kty: jwk.kty,
        n: jwk.n,
        e: jwk.e,
        alg: jwk.alg,
        use: jwk.use || "sig",
      };

      return await crypto.subtle.importKey(
        "jwk",
        keyData,
        {
          name: "RSASSA-PKCS1-v1_5",
          hash: jwk.alg?.includes("256")
            ? "SHA-256"
            : jwk.alg?.includes("384")
              ? "SHA-384"
              : jwk.alg?.includes("512")
                ? "SHA-512"
                : "SHA-256",
        },
        false,
        ["verify"],
      );
    }

    if (jwk.kty === "EC" && jwk.x && jwk.y && jwk.crv) {
      // EC public key
      const keyData = {
        kty: jwk.kty,
        x: jwk.x,
        y: jwk.y,
        crv: jwk.crv,
        alg: jwk.alg,
        use: jwk.use || "sig",
      };

      const namedCurve =
        jwk.crv === "P-256"
          ? "P-256"
          : jwk.crv === "P-384"
            ? "P-384"
            : jwk.crv === "P-521"
              ? "P-521"
              : "P-256";

      return await crypto.subtle.importKey(
        "jwk",
        keyData,
        {
          name: "ECDSA",
          namedCurve,
        },
        false,
        ["verify"],
      );
    }

    if (jwk.kty === "oct" && jwk.k) {
      // Symmetric key for HMAC
      const keyData = {
        kty: jwk.kty,
        k: jwk.k,
        alg: jwk.alg,
        use: jwk.use || "sig",
      };

      return await crypto.subtle.importKey(
        "jwk",
        keyData,
        {
          name: "HMAC",
          hash: jwk.alg?.includes("256")
            ? "SHA-256"
            : jwk.alg?.includes("384")
              ? "SHA-384"
              : jwk.alg?.includes("512")
                ? "SHA-512"
                : "SHA-256",
        },
        false,
        ["verify"],
      );
    }

    return null;
  } catch (error) {
    console.error("Failed to create public key:", error);
    return null;
  }
}

function base64UrlToArrayBuffer(base64Url: string): ArrayBuffer {
  // Convert base64url to base64
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if needed
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );

  // Decode base64 to binary string
  const binaryString = atob(padded);

  // Convert binary string to ArrayBuffer
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

async function verifyJWTSignature(
  jwt: ParsedAuthJWT,
  publicKey: CryptoKey,
  algorithm: string,
): Promise<boolean> {
  try {
    if (!jwt.rawHeaders || !jwt.rawPayload || !jwt.rawSignature) {
      return false;
    }

    // Create the signing input (header.payload)
    const signingInput = `${jwt.rawHeaders}.${jwt.rawPayload}`;
    const signingInputBuffer = new TextEncoder().encode(signingInput);

    // Decode the signature
    const signatureBuffer = base64UrlToArrayBuffer(jwt.rawSignature);

    // Determine the algorithm
    let cryptoAlgorithm: AlgorithmIdentifier;

    if (algorithm.startsWith("RS")) {
      cryptoAlgorithm = {
        name: "RSASSA-PKCS1-v1_5",
      };
    } else if (algorithm.startsWith("ES")) {
      cryptoAlgorithm = {
        name: "ECDSA",
        hash: algorithm.includes("256")
          ? "SHA-256"
          : algorithm.includes("384")
            ? "SHA-384"
            : algorithm.includes("512")
              ? "SHA-512"
              : "SHA-256",
      } as EcdsaParams;
    } else if (algorithm.startsWith("HS")) {
      cryptoAlgorithm = {
        name: "HMAC",
      };
    } else {
      return false;
    }

    // Verify the signature
    return await crypto.subtle.verify(
      cryptoAlgorithm,
      publicKey,
      signatureBuffer,
      signingInputBuffer,
    );
  } catch (error) {
    console.error("JWT signature verification failed:", error);
    return false;
  }
}

export async function verifyJWT(
  jwt: ParsedAuthJWT,
  config: JWTVerificationConfig,
): Promise<JWTVerificationResult> {
  try {
    // Basic validation
    if (!jwt.isValid || !jwt.headers || !jwt.payload) {
      return {
        isValid: false,
        error: "Invalid JWT structure",
      };
    }

    // Extract algorithm and key ID from header
    const algorithm = jwt.headers.alg as string;
    const keyId = jwt.headers.kid as string;

    if (!algorithm) {
      return {
        isValid: false,
        error: "Missing algorithm in JWT header",
        keyId,
      };
    }

    // Get JWKS
    let jwks: JWKS;

    if (config.jku) {
      try {
        jwks = await fetchJWKS(config.jku);
      } catch (error) {
        return {
          isValid: false,
          error: `Failed to fetch JWKS from JKU: ${error instanceof Error ? error.message : "Unknown error"}`,
          algorithm,
          keyId,
        };
      }
    } else if (config.jwks) {
      try {
        jwks = parseJWKS(config.jwks);
      } catch (error) {
        return {
          isValid: false,
          error: `Failed to parse JWKS: ${error instanceof Error ? error.message : "Unknown error"}`,
          algorithm,
          keyId,
        };
      }
    } else {
      return {
        isValid: false,
        error: "No JKU or JWKS provided for verification",
        algorithm,
        keyId,
      };
    }

    // Find matching key
    const matchingKey = findMatchingKey(jwks, keyId, algorithm);
    if (!matchingKey) {
      return {
        isValid: false,
        error: `No matching key found in JWKS for kid: ${keyId || "none"}, alg: ${algorithm}`,
        algorithm,
        keyId,
      };
    }

    // Create public key
    const publicKey = await createPublicKey(matchingKey);
    if (!publicKey) {
      return {
        isValid: false,
        error: `Failed to create public key from JWK`,
        algorithm,
        keyId,
      };
    }

    // Verify signature
    const isSignatureValid = await verifyJWTSignature(
      jwt,
      publicKey,
      algorithm,
    );

    if (!isSignatureValid) {
      return {
        isValid: false,
        error: "JWT signature verification failed",
        algorithm,
        keyId,
      };
    }

    // Check expiration if present
    if (jwt.payload.exp && typeof jwt.payload.exp === "number") {
      const now = Math.floor(Date.now() / 1000);
      if (jwt.payload.exp < now) {
        return {
          isValid: false,
          error: "JWT has expired",
          algorithm,
          keyId,
        };
      }
    }

    // Check not before if present
    if (jwt.payload.nbf && typeof jwt.payload.nbf === "number") {
      const now = Math.floor(Date.now() / 1000);
      if (jwt.payload.nbf > now) {
        return {
          isValid: false,
          error: "JWT is not yet valid",
          algorithm,
          keyId,
        };
      }
    }

    return {
      isValid: true,
      algorithm,
      keyId,
    };
  } catch (error) {
    return {
      isValid: false,
      error: `JWT verification error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

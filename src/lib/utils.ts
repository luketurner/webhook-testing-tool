import { type ClassValue, clsx } from "clsx";
import type { Request } from "express";
import { twMerge } from "tailwind-merge";
import { z } from "zod";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function headerNameDisplay(v: string) {
  return v
    ?.toLowerCase()
    ?.replace(/(?<!\w)[a-zA-Z]/g, (match) => match.toUpperCase());
}

export const HTTP_METHODS = [
  "*",
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "OPTIONS",
  "HEAD",
  "PATCH",
] as const;

export interface IParsedAuth {
  authType: "basic" | "digest" | "bearer" | "jwt" | "unknown";
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

export function isBasicAuth(v: IParsedAuth): v is ParsedAuthBasic {
  return v.authType === "basic";
}

export function isDigestAuth(v: IParsedAuth): v is ParsedAuthDigest {
  return v.authType === "digest";
}

export function isGenericBearerAuth(
  v: IParsedAuth
): v is ParsedAuthGenericBearer {
  return v.authType === "bearer";
}

export function isJWTAuth(v: IParsedAuth): v is ParsedAuthJWT {
  return v.authType === "jwt";
}

export function isUnknownAuth(v: IParsedAuth): v is ParsedAuthUnknown {
  return v.authType === "unknown";
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
  rawHeader: string
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
  rawHeader: string
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

export function parseAuthorizationHeader(rawHeader: string): IParsedAuth {
  return (
    tryParseBasicHeader(rawHeader) ||
    tryParseDigestHeader(rawHeader) ||
    tryParseJWTHeader(rawHeader) ||
    tryParseGenericBearerHeader(rawHeader) ||
    parseUnknownHeader(rawHeader)
  );
}

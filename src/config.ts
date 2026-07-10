import "@/server-only";
import { join } from "path";

export const NODE_ENV = process.env.NODE_ENV;
export const DEV = NODE_ENV === "development";
export const PROD = NODE_ENV === "production";
export const TEST = NODE_ENV === "test";

if (!process.env.BETTER_AUTH_SECRET && PROD)
  throw new Error(
    "Using default BETTER_AUTH_SECRET, which is prohibited in production mode. You should set this to a secret value.",
  );

export const ADMIN_USERNAME =
  process.env.WTT_ADMIN_USERNAME || "admin@example.com";

export const DATA_DIR = process.env.WTT_DATA_DIR || "data";

export const DB_FILE = TEST
  ? ":memory:"
  : process.env.WTT_DB_FILE || join(DATA_DIR, "data.sqlite");

if (!process.env.WTT_ADMIN_PASSWORD && PROD)
  throw new Error(
    "Using default password for admin dashboard, which is prohibited in production mode. You should set WTT_ADMIN_PASSWORD to a secret value.",
  );
export const ADMIN_PASSWORD = process.env.WTT_ADMIN_PASSWORD || "admin123";

export const WEBHOOK_PORT = parseInt(
  process.env.WTT_WEBHOOK_PORT || "3000",
  10,
);
export const PUBLIC_WEBHOOK_PORT = process.env.WTT_PUBLIC_WEBHOOK_PORT
  ? parseInt(process.env.WTT_PUBLIC_WEBHOOK_PORT, 10)
  : undefined;

export const ADMIN_PORT = parseInt(process.env.WTT_ADMIN_PORT || "3001", 10);

// Public base URL of the admin dashboard. Used as the OAuth issuer and token
// audience for the MCP server, so it must be stable and externally reachable.
export const BASE_URL =
  process.env.WTT_BASE_URL ||
  process.env.BETTER_AUTH_URL ||
  `http${process.env.WTT_DASHBOARD_SSL_ENABLED === "true" ? "s" : ""}://localhost:${ADMIN_PORT}`;
export const EXCLUDE_HEADERS = process.env.WTT_EXCLUDE_HEADERS ?? "";
export const EXCLUDE_HEADER_MAP = EXCLUDE_HEADERS.split(",").reduce(
  (obj, k) => {
    if (k) obj[k] = true;
    return obj;
  },
  {},
);

// SSL/TLS Configuration
export const WEBHOOK_SSL_ENABLED =
  process.env.WTT_WEBHOOK_SSL_ENABLED === "true";
export const WEBHOOK_SSL_PORT = parseInt(
  process.env.WTT_WEBHOOK_SSL_PORT || "3443",
  10,
);
export const PUBLIC_WEBHOOK_SSL_PORT = process.env.WTT_PUBLIC_WEBHOOK_SSL_PORT
  ? parseInt(process.env.WTT_PUBLIC_WEBHOOK_SSL_PORT, 10)
  : undefined;
export const SSL_CERT_PATH =
  process.env.WTT_SSL_CERT_PATH || join(DATA_DIR, "certs/cert.pem");
export const SSL_KEY_PATH =
  process.env.WTT_SSL_KEY_PATH || join(DATA_DIR, "certs/key.pem");
export const DASHBOARD_SSL_ENABLED =
  process.env.WTT_DASHBOARD_SSL_ENABLED === "true";

// HTTP/2 Configuration
// AIDEV-NOTE: HTTP/2 needs its own TLS port because Bun cannot serve HTTP/1.1 and
// HTTP/2 on one port: allowHTTP1 is ignored and ALPN advertises only h2.
// See https://github.com/oven-sh/bun/issues/26721
// This is independent of WTT_WEBHOOK_SSL_ENABLED, but still requires a certificate.
export const WEBHOOK_H2_ENABLED = process.env.WTT_WEBHOOK_H2_ENABLED === "true";
export const WEBHOOK_H2_PORT = parseInt(
  process.env.WTT_WEBHOOK_H2_PORT || "3444",
  10,
);
export const PUBLIC_WEBHOOK_H2_PORT = process.env.WTT_PUBLIC_WEBHOOK_H2_PORT
  ? parseInt(process.env.WTT_PUBLIC_WEBHOOK_H2_PORT, 10)
  : undefined;

// ACME/Let's Encrypt Configuration
export const ACME_ENABLED = process.env.WTT_ACME_ENABLED === "true";
export const ACME_DOMAINS = process.env.WTT_ACME_DOMAINS
  ? process.env.WTT_ACME_DOMAINS.split(",").map((d) => d.trim())
  : [];
export const ACME_EMAIL = process.env.WTT_ACME_EMAIL || "";
export const ACME_DIRECTORY_URL =
  process.env.WTT_ACME_DIRECTORY ||
  "https://acme-v02.api.letsencrypt.org/directory";
export const ACME_CERT_PATH =
  process.env.WTT_ACME_CERT_PATH || join(DATA_DIR, "acme-certs");
export const ACME_STAGING = process.env.WTT_ACME_STAGING === "true";

// TCP Server Configuration
export const TCP_PORT = parseInt(process.env.WTT_TCP_PORT || "3002", 10);
export const PUBLIC_TCP_PORT = process.env.WTT_PUBLIC_TCP_PORT
  ? parseInt(process.env.WTT_PUBLIC_TCP_PORT, 10)
  : undefined;

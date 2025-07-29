import "@/server-only";
import { mkdir } from "fs/promises";
import { join } from "path";

export const NODE_ENV = process.env.NODE_ENV;
export const DEV = NODE_ENV === "development";
export const PROD = NODE_ENV === "production";
export const TEST = NODE_ENV === "test";

if (!process.env.BETTER_AUTH_SECRET && PROD)
  console.warn("WARNING: Using default BETTER_AUTH_SECRET. You should set this to a secret value.");

export const ADMIN_USERNAME =
  process.env.WTT_ADMIN_USERNAME || "admin@example.com";

export const DATA_DIR = process.env.WTT_DATA_DIR || "data";

export const DB_FILE = TEST
  ? ":memory:"
  : process.env.WTT_DB_FILE || join(DATA_DIR, "data.sqlite");

if (!process.env.WTT_ADMIN_PASSWORD && PROD)
  console.warn("WARNING: Using default password for admin dashboard. You should set WTT_ADMIN_PASSWORD to a secret value.");
export const ADMIN_PASSWORD = process.env.WTT_ADMIN_PASSWORD || "admin123";

export const WEBHOOK_PORT = parseInt(
  process.env.WTT_WEBHOOK_PORT || "3000",
  10,
);
export const ADMIN_PORT = parseInt(process.env.WTT_ADMIN_PORT || "3001", 10);
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
export const SSL_CERT_PATH =
  process.env.WTT_SSL_CERT_PATH || join(DATA_DIR, "certs/cert.pem");
export const SSL_KEY_PATH =
  process.env.WTT_SSL_KEY_PATH || join(DATA_DIR, "certs/key.pem");
export const DASHBOARD_SSL_ENABLED =
  process.env.WTT_DASHBOARD_SSL_ENABLED === "true";

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

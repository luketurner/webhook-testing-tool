export const NODE_ENV = process.env.NODE_ENV;
export const DEV = process.env.NODE_ENV === "development";
export const PROD = process.env.NODE_ENV === "production";
export const TEST = process.env.NODE_ENV === "test";

export const WEBHOOK_PORT = 3000;
export const ADMIN_PORT = 3001;
export const ADMIN_USERNAME = "admin";
export const EXCLUDE_HEADERS = process.env.WTT_EXCLUDE_HEADERS ?? "";
export const EXCLUDE_HEADER_MAP = EXCLUDE_HEADERS.split(",").reduce(
  (obj, k) => {
    if (k) obj[k] = true;
    return obj;
  },
  {}
);

export const DB_FILE = TEST
  ? ":memory:"
  : process.env.WTT_DB_FILE || "local/data.sqlite";

if (!process.env.WTT_ADMIN_PASSWORD && PROD)
  throw new Error("Must specify WTT_ADMIN_PASSWORD");
export const ADMIN_PASSWORD = process.env.WTT_ADMIN_PASSWORD || "admin";

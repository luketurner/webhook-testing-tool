export const WEBHOOK_PORT = 3000;
export const ADMIN_PORT = 3001;
export const DB_FILE = process.env.WTT_DB_FILE || "local/data.sqlite";
export const ADMIN_USERNAME = "admin";
export const NODE_ENV = process.env.NODE_ENV;
export const DEV = process.env.NODE_ENV === "development";
export const EXCLUDE_HEADERS = process.env.WTT_EXCLUDE_HEADERS ?? "";
export const EXCLUDE_HEADER_MAP = EXCLUDE_HEADERS.split(",").reduce(
  (obj, k) => {
    if (k) obj[k] = true;
    return obj;
  },
  {}
);

if (!process.env.WTT_ADMIN_PASSWORD && !DEV)
  throw new Error("Must specify WTT_ADMIN_PASSWORD");
export const ADMIN_PASSWORD = process.env.WTT_ADMIN_PASSWORD || "admin";

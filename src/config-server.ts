import "@/server-only";

export const NODE_ENV = process.env.NODE_ENV;
export const DEV = process.env.NODE_ENV === "development";
export const PROD = process.env.NODE_ENV === "production";
export const TEST = process.env.NODE_ENV === "test";

export const ADMIN_USERNAME = "admin@example.com";

export const DB_FILE = TEST
  ? ":memory:"
  : process.env.WTT_DB_FILE || "local/data.sqlite";

if (!process.env.WTT_ADMIN_PASSWORD && PROD)
  throw new Error("Must specify WTT_ADMIN_PASSWORD");
export const ADMIN_PASSWORD = process.env.WTT_ADMIN_PASSWORD || "admin123";

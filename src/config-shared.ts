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

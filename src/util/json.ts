export function fromJSONString<T>(s: T | string): T {
  if (typeof s === "string") {
    return JSON.parse(s);
  }
  return s;
}

export function toJSONString(v: unknown): string | null | undefined {
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "string" || v === null || v === undefined)
    return v as string | null | undefined;
  throw new Error("Invalid JSON value");
}

export function jsonFieldToSql<T>(obj: T, k: keyof T) {
  const json = toJSONString(obj[k]);
  return json ? { [k]: json } : null;
}

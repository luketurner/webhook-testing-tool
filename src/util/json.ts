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

export function tryParseJSON(content: string): {
  parsed: any | null;
  pretty: string | null;
  isValid: boolean;
} {
  try {
    const parsed = JSON.parse(content);
    return {
      parsed,
      pretty: JSON.stringify(parsed, null, 2),
      isValid: true,
    };
  } catch {
    return { parsed: null, pretty: null, isValid: false };
  }
}

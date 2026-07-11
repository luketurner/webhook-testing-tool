export function headerNameDisplay(v: string) {
  return v
    ?.toLowerCase()
    ?.replace(/(?<!\w)[a-zA-Z]/g, (match) => match.toUpperCase());
}

export const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "OPTIONS",
  "HEAD",
  "PATCH",
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export function isAbsolutePath(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//");
}

export function isAbsoluteHttpUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

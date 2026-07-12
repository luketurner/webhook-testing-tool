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
  // The WHATWG URL parser treats "\" like "/" for http(s) URLs, so a path
  // like "/\evil.com" can resolve off-origin. The runtime origin check in
  // resolveTargetUrl remains the authoritative internal boundary; rejecting
  // backslashes here just keeps the common bypass out with a clean
  // validation error instead of an opaque 500.
  return url.startsWith("/") && !url.startsWith("//") && !url.includes("\\");
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

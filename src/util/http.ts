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

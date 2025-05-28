import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function headerNameDisplay(v: string) {
  return v?.replace(/(?<!\w)[a-zA-Z]/g, (match) => match.toUpperCase());
}

export const HTTP_METHODS = [
  "*",
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "OPTIONS",
  "HEAD",
  "PATCH",
] as const;

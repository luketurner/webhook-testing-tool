/**
 * Utility for consistent API fetch operations
 */

export interface ApiFetchOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
}

export async function apiFetch<T>(
  url: string,
  options?: ApiFetchOptions,
): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

export function createApiFetcher(baseOptions?: ApiFetchOptions) {
  return <T>(url: string, options?: ApiFetchOptions) =>
    apiFetch<T>(url, { ...baseOptions, ...options });
}

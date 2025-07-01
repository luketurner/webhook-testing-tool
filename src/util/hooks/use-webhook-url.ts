import { useMemo } from "react";

/**
 * Custom hook to get the webhook base URL and construct full URLs
 * @returns Object with baseUrl and a function to get full URL from a path
 */
export const useWebhookUrl = () => {
  const baseUrl = useMemo(() => {
    return `https://${window.location.hostname}`;
  }, []);

  const getFullUrl = (path: string) => {
    // Ensure path starts with /
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
  };

  return {
    baseUrl,
    getFullUrl,
  };
};

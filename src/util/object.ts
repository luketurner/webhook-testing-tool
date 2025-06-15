/**
 * Deep freezes an object and all its nested properties recursively.
 * Returns a deeply frozen copy of the original object.
 */
export function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return Object.freeze(obj.map(item => deepFreeze(item))) as T;
  }

  // Handle objects
  const frozen = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      (frozen as any)[key] = deepFreeze(obj[key]);
    }
  }

  return Object.freeze(frozen);
}
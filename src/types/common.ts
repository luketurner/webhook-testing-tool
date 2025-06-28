// Generic type helper for extracting ID types from entities
export type EntityId<T> = T extends { id: infer ID } ? ID : never;

// Common status types
export type Status = "running" | "complete" | "success" | "error" | "pending";

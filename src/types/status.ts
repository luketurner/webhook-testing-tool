import { z } from "zod";

// AIDEV-NOTE: Centralized status types to reduce duplication across the codebase
// These base statuses are shared across request events and handler executions

// Base status values shared across different entities
export const BASE_STATUSES = ["running", "complete", "error"] as const;

// Extended status for handler executions (includes "success")
export const EXECUTION_STATUSES = ["running", "success", "error"] as const;

// Status type definitions
export type BaseStatus = (typeof BASE_STATUSES)[number];
export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

// Zod schemas for validation
export const baseStatusSchema = z.enum(BASE_STATUSES);
export const executionStatusSchema = z.enum(EXECUTION_STATUSES);

// Legacy Status type from common.ts - kept for backward compatibility
export type Status = "running" | "complete" | "success" | "error" | "pending";

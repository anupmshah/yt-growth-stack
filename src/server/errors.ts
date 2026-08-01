import { ZodError } from "zod";
export type AppErrorCode = "UNCONFIGURED" | "UNAUTHORIZED" | "INVALID_REQUEST" | "NOT_FOUND" | "CONFLICT" | "UPSTREAM_TIMEOUT" | "UPSTREAM_RETRYABLE" | "UPSTREAM_TERMINAL" | "INTERNAL";
export class AppError extends Error { constructor(public readonly code: AppErrorCode, message: string, public readonly status: number, public readonly retryable = false, options?: ErrorOptions) { super(message, options); this.name = "AppError"; } }
export function errorResponse(error: unknown) {
  if (error instanceof AppError) return { status: error.status, body: { error: { code: error.code, message: error.message, retryable: error.retryable } } };
  if (error instanceof ZodError) return { status: 400, body: { error: { code: "INVALID_REQUEST", message: "Request validation failed", retryable: false, issues: error.issues.map(({ path, message }) => ({ path, message })) } } };
  console.error("Unhandled server error", { error: error instanceof Error ? error.name : "unknown" }); return { status: 500, body: { error: { code: "INTERNAL", message: "An unexpected server error occurred", retryable: false } } };
}


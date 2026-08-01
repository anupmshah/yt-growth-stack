import { AppError } from "@/server/errors";
export interface ResilientFetchOptions { timeoutMs?: number; retries?: number; fetchImpl?: typeof fetch; }
export async function fetchJson<T>(url: string, init: RequestInit, options: ResilientFetchOptions = {}): Promise<T> {
  const fetchImpl = options.fetchImpl ?? fetch; const retries = Math.max(0, Math.min(options.retries ?? 2, 3)); const timeoutMs = Math.max(500, Math.min(options.timeoutMs ?? 15_000, 60_000));
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) }); const payload: unknown = await response.json().catch(() => null);
      if (response.ok) return payload as T;
      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt < retries) { await new Promise((resolve) => setTimeout(resolve, 150 * 2 ** attempt)); continue; }
      throw new AppError(retryable ? "UPSTREAM_RETRYABLE" : "UPSTREAM_TERMINAL", `Provider request failed with status ${response.status}`, 502, retryable);
    } catch (error) {
      if (error instanceof AppError) throw error;
      const timedOut = error instanceof DOMException && error.name === "TimeoutError";
      if (attempt < retries) continue;
      throw new AppError(timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_RETRYABLE", timedOut ? "Provider request timed out" : "Provider request failed", 504, true, { cause: error });
    }
  }
  throw new AppError("INTERNAL", "Unreachable request state", 500);
}

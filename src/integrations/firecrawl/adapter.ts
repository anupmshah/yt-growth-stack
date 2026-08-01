import { z } from "zod";
import type { ScraperAdapter, ScrapeJob } from "@/integrations/types";
import { AppError } from "@/server/errors";
import { fetchJson, type ResilientFetchOptions } from "@/server/http";
export const webResearchInputSchema = z.object({ urls: z.array(z.string().url()).min(1).max(100) });
export type WebResearchInput = z.infer<typeof webResearchInputSchema>; export type FirecrawlResult = { documents: unknown[] };
type FirecrawlStart = { success: boolean; id: string }; type FirecrawlStatus = { success: boolean; status: "scraping" | "completed" | "failed" | "cancelled"; data?: unknown[] };
export interface FirecrawlOptions extends ResilientFetchOptions { apiKey?: string; operation?: string; baseUrl?: string }
export class FirecrawlAdapter implements ScraperAdapter<WebResearchInput, FirecrawlResult> {
  private readonly apiKey; private readonly operation; private readonly baseUrl; private readonly requestOptions;
  constructor(options: FirecrawlOptions = {}) { this.apiKey = options.apiKey ?? process.env.FIRECRAWL_API_KEY; this.operation = (options.operation ?? process.env.FIRECRAWL_OPERATION ?? "batch/scrape").replace(/^\/+|\/+$/g, ""); this.baseUrl = (options.baseUrl ?? "https://api.firecrawl.dev/v2").replace(/\/$/, ""); this.requestOptions = options; }
  private headers() { if (!this.apiKey) throw new AppError("UNCONFIGURED", "Firecrawl is not configured", 503); return { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" }; }
  async start(rawInput: WebResearchInput): Promise<ScrapeJob<WebResearchInput>> { const input = webResearchInputSchema.parse(rawInput); const response = await fetchJson<FirecrawlStart>(`${this.baseUrl}/${this.operation}`, { method: "POST", headers: this.headers(), body: JSON.stringify({ urls: input.urls, formats: ["markdown", "links"] }) }, this.requestOptions); if (!response.success || !response.id) throw new AppError("UPSTREAM_TERMINAL", "Firecrawl rejected the job", 502); return { id: response.id, status: "queued", input }; }
  async status(jobId: string) { const response = await fetchJson<FirecrawlStatus>(`${this.baseUrl}/${this.operation}/${encodeURIComponent(jobId)}`, { method: "GET", headers: this.headers() }, this.requestOptions); return response.status === "completed" ? "succeeded" : response.status === "scraping" ? "running" : response.status; }
  async result(jobId: string): Promise<FirecrawlResult> { const response = await fetchJson<FirecrawlStatus>(`${this.baseUrl}/${this.operation}/${encodeURIComponent(jobId)}`, { method: "GET", headers: this.headers() }, this.requestOptions); if (response.status !== "completed") throw new AppError(response.status === "failed" ? "UPSTREAM_TERMINAL" : "CONFLICT", `Firecrawl job is ${response.status}`, response.status === "failed" ? 502 : 409, response.status === "scraping"); return { documents: response.data ?? [] }; }
  async cancel(jobId: string) { await fetchJson(`${this.baseUrl}/${this.operation}/${encodeURIComponent(jobId)}`, { method: "DELETE", headers: this.headers() }, this.requestOptions); }
}

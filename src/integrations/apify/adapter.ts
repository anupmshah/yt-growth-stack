import { z } from "zod";
import type { ScraperAdapter, ScrapeJob } from "@/integrations/types";
import { AppError } from "@/server/errors";
import { fetchJson, type ResilientFetchOptions } from "@/server/http";

export const youtubeResearchInputSchema = z.object({ channels: z.array(z.string().url()).min(1).max(25), maxVideos: z.number().int().min(1).max(500).default(50) });
export type YouTubeResearchInput = z.infer<typeof youtubeResearchInputSchema>;
export type ApifyDataset = { datasetId: string; items: unknown[] };
type ApifyRun = { data: { id: string; status: string; defaultDatasetId?: string } };
export interface ApifyOptions extends ResilientFetchOptions { token?: string; actorId?: string; baseUrl?: string }

export class ApifyAdapter implements ScraperAdapter<YouTubeResearchInput, ApifyDataset> {
  private readonly token; private readonly actorId; private readonly baseUrl; private readonly requestOptions;
  constructor(options: ApifyOptions = {}) { this.token = options.token ?? process.env.APIFY_API_TOKEN; this.actorId = options.actorId ?? process.env.APIFY_YOUTUBE_ACTOR_ID; this.baseUrl = (options.baseUrl ?? "https://api.apify.com/v2").replace(/\/$/, ""); this.requestOptions = options; }
  private configured() { if (!this.token || !this.actorId) throw new AppError("UNCONFIGURED", "Apify is not configured", 503); return { actorId: this.actorId, headers: { authorization: `Bearer ${this.token}` } }; }
  async start(rawInput: YouTubeResearchInput): Promise<ScrapeJob<YouTubeResearchInput>> { const input = youtubeResearchInputSchema.parse(rawInput); const { actorId, headers } = this.configured(); const response = await fetchJson<ApifyRun>(`${this.baseUrl}/acts/${encodeURIComponent(actorId)}/runs`, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ startUrls: input.channels.map((url) => ({ url })), maxResults: input.maxVideos }) }, this.requestOptions); return { id: response.data.id, status: response.data.status === "SUCCEEDED" ? "succeeded" : "running", input }; }
  async status(jobId: string) { const { headers } = this.configured(); const run = await fetchJson<ApifyRun>(`${this.baseUrl}/actor-runs/${encodeURIComponent(jobId)}`, { method: "GET", headers }, this.requestOptions); const value = run.data.status; const status = value === "SUCCEEDED" ? "succeeded" : value === "ABORTED" ? "cancelled" : ["FAILED", "TIMED-OUT"].includes(value) ? "failed" : value === "READY" ? "queued" : "running"; return { status, datasetId: run.data.defaultDatasetId } as const; }
  async result(jobId: string, datasetId?: string): Promise<ApifyDataset> { const { headers } = this.configured(); let resolvedDatasetId = datasetId; if (!resolvedDatasetId) { const run = await fetchJson<ApifyRun>(`${this.baseUrl}/actor-runs/${encodeURIComponent(jobId)}`, { method: "GET", headers }, this.requestOptions); if (run.data.status !== "SUCCEEDED" || !run.data.defaultDatasetId) throw new AppError("CONFLICT", "Apify run is not complete", 409, true); resolvedDatasetId = run.data.defaultDatasetId; } const items = await fetchJson<unknown[]>(`${this.baseUrl}/datasets/${encodeURIComponent(resolvedDatasetId)}/items?clean=true`, { method: "GET", headers }, this.requestOptions); return { datasetId: resolvedDatasetId, items }; }
  async cancel(jobId: string) { const { headers } = this.configured(); await fetchJson(`${this.baseUrl}/actor-runs/${encodeURIComponent(jobId)}/abort`, { method: "POST", headers }, this.requestOptions); }
}

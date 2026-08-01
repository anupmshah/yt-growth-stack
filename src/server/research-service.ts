import { z } from "zod";
import { ApifyAdapter } from "@/integrations/apify/adapter";
import { FirecrawlAdapter } from "@/integrations/firecrawl/adapter";
import { AppError } from "@/server/errors";
import { analyzeEvidence, normalizeEvidence, type EvidenceDocument, type ResearchOpportunity } from "@/server/evidence-analysis";

export type ResearchStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type ResearchContext = { ownerId: string; projectId: string; conversationId: string };
export type ResearchRecord = ResearchContext & { id: string; provider: "apify" | "firecrawl"; providerJobId: string; datasetId?: string; status: ResearchStatus; input: unknown; evidence?: EvidenceDocument[]; opportunities?: ResearchOpportunity[]; createdAt: string; updatedAt: string };
export interface ResearchStore { save(record: ResearchRecord): Promise<void>; get(ownerId: string, id: string): Promise<ResearchRecord | null>; }
class MemoryResearchStore implements ResearchStore {
  private records = new Map<string, ResearchRecord>();
  async save(record: ResearchRecord) { this.records.set(`${record.ownerId}:${record.id}`, structuredClone(record)); }
  async get(ownerId: string, id: string) { const value = this.records.get(`${ownerId}:${id}`); return value ? structuredClone(value) : null; }
}
const globalStore = globalThis as typeof globalThis & { __researchStore?: MemoryResearchStore };
export const developmentResearchStore = globalStore.__researchStore ??= new MemoryResearchStore();
export interface ResearchServiceOptions { context?: ResearchContext; store?: ResearchStore; apify?: ApifyAdapter; firecrawl?: FirecrawlAdapter }
export class ResearchService {
  private context; private store; private apify; private firecrawl;
  constructor(options: ResearchServiceOptions = {}) { this.context = options.context ?? { ownerId: "test", projectId: "00000000-0000-0000-0000-000000000000", conversationId: "00000000-0000-0000-0000-000000000000" }; this.store = options.store ?? developmentResearchStore; this.apify = options.apify ?? new ApifyAdapter(); this.firecrawl = options.firecrawl ?? new FirecrawlAdapter(); }
  async create(input: { provider: "apify" | "firecrawl"; channels?: string[]; urls?: string[]; maxVideos?: number }) {
    const providerJob = input.provider === "apify" ? await this.apify.start({ channels: input.channels ?? [], maxVideos: input.maxVideos ?? 50 }) : await this.firecrawl.start({ urls: input.urls ?? [] });
    const now = new Date().toISOString(); const record: ResearchRecord = { ...this.context, id: crypto.randomUUID(), provider: input.provider, providerJobId: providerJob.id, status: providerJob.status === "succeeded" ? "succeeded" : "running", input, createdAt: now, updatedAt: now };
    await this.store.save(record); return record;
  }
  async status(id: string) { const record = await this.store.get(this.context.ownerId, id); if (!record) throw new AppError("NOT_FOUND", "Research run was not found", 404); if (!["running", "queued"].includes(record.status)) return record; const providerState = record.provider === "apify" ? await this.apify.status(record.providerJobId) : { status: await this.firecrawl.status(record.providerJobId) }; const updated: ResearchRecord = { ...record, status: providerState.status as ResearchStatus, datasetId: "datasetId" in providerState ? providerState.datasetId : record.datasetId, updatedAt: new Date().toISOString() }; await this.store.save(updated); return updated; }
  async collect(id: string) { const record = await this.status(id); if (record.status !== "succeeded") throw new AppError("CONFLICT", `Cannot collect a ${record.status} run`, 409, ["queued", "running"].includes(record.status)); const rawEvidence = record.provider === "apify" ? (await this.apify.result(record.providerJobId, record.datasetId)).items : (await this.firecrawl.result(record.providerJobId)).documents; const evidence = normalizeEvidence(record.provider, rawEvidence); if (!evidence.length) throw new AppError("UPSTREAM_TERMINAL", "The provider completed without usable source URLs", 502); const opportunities = analyzeEvidence(evidence); const updated = { ...record, evidence, opportunities, updatedAt: new Date().toISOString() }; await this.store.save(updated); return updated; }
  async cancel(id: string, confirmed: boolean) { if (!confirmed) throw new AppError("INVALID_REQUEST", "Cancellation requires confirmation", 400); const record = await this.status(id); if (record.provider === "apify") await this.apify.cancel(record.providerJobId); else await this.firecrawl.cancel(record.providerJobId); const updated = { ...record, status: "cancelled" as const, updatedAt: new Date().toISOString() }; await this.store.save(updated); return updated; }
}

export const createResearchSchema = z.discriminatedUnion("provider", [z.object({ provider: z.literal("apify"), channels: z.array(z.string().url()).min(1).max(25), maxVideos: z.number().int().min(1).max(500).default(50) }), z.object({ provider: z.literal("firecrawl"), urls: z.array(z.string().url()).min(1).max(100) })]);


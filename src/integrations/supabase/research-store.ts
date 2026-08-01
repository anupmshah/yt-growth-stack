import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/server/errors";
import type { ResearchRecord, ResearchStore } from "@/server/research-service";

type ResearchRow = {
  id: string; project_id: string; conversation_id: string | null;
  status: ResearchRecord["status"]; provider: ResearchRecord["provider"] | null;
  provider_job_id: string | null; provider_dataset_id: string | null;
  input: unknown; result: unknown; created_at: string; updated_at: string;
};

function toRecord(ownerId: string, row: ResearchRow): ResearchRecord {
  if (!row.provider || !row.provider_job_id || !row.conversation_id) {
    throw new AppError("INTERNAL", "Stored research state is incomplete", 500);
  }
  const result = row.result && typeof row.result === "object" ? row.result as { evidence?: unknown[] } : undefined;
  return {
    ownerId, id: row.id, projectId: row.project_id, conversationId: row.conversation_id,
    provider: row.provider, providerJobId: row.provider_job_id,
    datasetId: row.provider_dataset_id ?? undefined, status: row.status,
    input: row.input, evidence: result?.evidence,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export class SupabaseResearchStore implements ResearchStore {
  constructor(private readonly client: SupabaseClient) {}
  async save(record: ResearchRecord): Promise<void> {
    const { error } = await this.client.from("research_runs").upsert({
      id: record.id, project_id: record.projectId, conversation_id: record.conversationId,
      status: record.status, provider: record.provider, provider_job_id: record.providerJobId,
      provider_dataset_id: record.datasetId ?? null, input: record.input,
      result: record.evidence ? { evidence: record.evidence } : null,
      started_at: record.status === "running" ? record.createdAt : null,
      finished_at: ["succeeded","failed","cancelled"].includes(record.status) ? record.updatedAt : null,
      cancelled_at: record.status === "cancelled" ? record.updatedAt : null,
      created_at: record.createdAt, updated_at: record.updatedAt,
    }, { onConflict: "id" });
    if (error) throw new AppError("INTERNAL", "Could not persist research state", 500, false, { cause: error });
  }
  async get(ownerId: string, id: string): Promise<ResearchRecord | null> {
    const { data, error } = await this.client.from("research_runs")
      .select("id,project_id,conversation_id,status,provider,provider_job_id,provider_dataset_id,input,result,created_at,updated_at")
      .eq("id", id).maybeSingle();
    if (error) throw new AppError("INTERNAL", "Could not read research state", 500, false, { cause: error });
    return data ? toRecord(ownerId, data as ResearchRow) : null;
  }
}
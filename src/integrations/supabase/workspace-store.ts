import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/server/errors";
import type { ConversationInput, ListInput, MessageInput, OpportunityUpdateInput, WorkspaceStore } from "@/server/workspace/workspace-service";

type DbError = { code?: string } | null;

function fail(error: DbError, action: string): never {
  console.error("Workspace persistence failed", { action, code: error?.code ?? "unknown" });
  throw new AppError("INTERNAL", `Could not ${action}`, 500);
}

function rows<T>(data: T[] | null, error: DbError, action: string): T[] {
  if (error) fail(error, action);
  return data ?? [];
}

function one<T>(data: T | null, error: DbError, label: string): T {
  if (error) fail(error, `load ${label}`);
  if (!data) throw new AppError("NOT_FOUND", `${label} was not found`, 404);
  return data;
}

function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
function conversationView(value: unknown) { const row=object(value); return { id: row.id, projectId: row.project_id, title: row.title, createdAt: row.created_at, updatedAt: row.updated_at }; }
function messageView(value: unknown) { const row=object(value); const payload=object(row.content); const content=typeof row.content === "string" ? row.content : typeof payload.text === "string" ? payload.text : JSON.stringify(row.content); return { id: row.id, clientId: row.client_id, conversationId: row.conversation_id, kind: typeof row.kind === "string" && row.kind.startsWith("user_") ? "user" : "assistant", content, createdAt: row.created_at, updatedAt: row.updated_at }; }
function runView(value: unknown) { const row=object(value); const input=object(row.input); return { id: row.id, projectId: row.project_id, conversationId: row.conversation_id, status: row.status, provider: row.provider, providerJobId: row.provider_job_id, target: input.target ?? input.channelUrl ?? input.url ?? (Array.isArray(input.channels) ? input.channels[0] : undefined), budgetCents: row.budget_cents, sourceCount: Array.isArray(object(row.result).evidence) ? (object(row.result).evidence as unknown[]).length : undefined, startedAt: row.started_at, finishedAt: row.finished_at, cancelledAt: row.cancelled_at, error: row.error, createdAt: row.created_at, updatedAt: row.updated_at }; }
function sourceView(value: unknown) { const row=object(value); const raw=object(row.raw_payload); const metrics=object(raw.metrics); return { id: row.id, researchRunId: row.research_run_id, provider: row.provider, sourceUrl: row.source_url, title: row.title, contentText: row.content_text, channel: raw.channel ?? raw.channelName ?? metrics.channel, views: raw.viewCount ?? raw.views ?? metrics.views, capturedAt: row.captured_at }; }
function opportunityView(value: unknown) { const row=object(value); return { id: row.id, projectId: row.project_id, researchRunId: row.research_run_id, title: row.title, rationale: row.rationale, score: row.score, state: row.state, sources: row.opportunity_sources, createdAt: row.created_at, updatedAt: row.updated_at }; }
export class SupabaseWorkspaceStore implements WorkspaceStore {
  constructor(private readonly client: SupabaseClient) {}

  private async assertProject(ownerId: string, projectId: string) {
    const { data, error } = await this.client.from("projects").select("id").eq("id", projectId).eq("owner_id", ownerId).maybeSingle();
    one(data, error, "Project");
  }

  async listConversations(input: ListInput) {
    await this.assertProject(input.ownerId, input.projectId);
    let query = this.client.from("conversations")
      .select("id,project_id,title,created_at,updated_at,projects!inner(owner_id)")
      .eq("project_id", input.projectId).order("updated_at", { ascending: false }).limit(input.limit);
    if (input.cursor) query = query.lt("updated_at", input.cursor);
    const { data, error } = await query;
    return rows(data, error, "list conversations").map(conversationView);
  }

  async createConversation(input: ConversationInput) {
    await this.assertProject(input.ownerId, input.projectId);
    const { data, error } = await this.client.from("conversations").insert({
      project_id: input.projectId,
      title: input.title ?? "New research",
    }).select("id,project_id,title,created_at,updated_at,projects!inner(owner_id)").single();
    if (error || !data) fail(error, "create conversation");
    return conversationView(data);
  }

  async getConversation(input: { ownerId: string; conversationId: string }) {
    const conversationResult = await this.client.from("conversations")
      .select("id,project_id,title,created_at,updated_at,projects!inner(owner_id)")
      .eq("id", input.conversationId).eq("projects.owner_id", input.ownerId).maybeSingle();
    const conversationRow = one(conversationResult.data, conversationResult.error, "Conversation");
    const projectId = object(conversationRow).project_id as string;
    const [messageResult, runResult] = await Promise.all([
      this.client.from("messages").select("id,conversation_id,kind,content,created_at")
        .eq("conversation_id", input.conversationId).order("created_at", { ascending: true }).limit(200),
      this.client.from("research_runs").select("id,project_id,conversation_id,status,provider,provider_job_id,budget_cents,input,result,started_at,finished_at,cancelled_at,error,created_at,updated_at")
        .eq("project_id", projectId).eq("conversation_id", input.conversationId).order("created_at", { ascending: false }).limit(20),
    ]);
    return {
      conversation: conversationView(conversationRow),
      messages: rows(messageResult.data, messageResult.error, "load conversation messages").map(messageView),
      researchRuns: rows(runResult.data, runResult.error, "load conversation research runs").map(runView),
    };
  }

  async createMessage(input: MessageInput) {
    const conversation = await this.client.from("conversations")
      .select("id,projects!inner(owner_id)").eq("id", input.conversationId).eq("projects.owner_id", input.ownerId).maybeSingle();
    one(conversation.data, conversation.error, "Conversation");
    const payload = {
      ...(input.clientId ? { client_id: input.clientId } : {}),
      conversation_id: input.conversationId,
      kind: input.kind === "user" ? "user_text" : input.kind === "assistant" ? "assistant_text" : input.kind,
      content: input.content,
    };
    const write = input.clientId
      ? this.client.from("messages").upsert(payload, { onConflict: "conversation_id,client_id" })
      : this.client.from("messages").insert(payload);
    const { data, error } = await write
      .select("id,conversation_id,client_id,kind,content,created_at,updated_at").single();
    if (error || !data) fail(error, "create message");
    return messageView(data);
  }

  async listResearchRuns(input: ListInput) {
    await this.assertProject(input.ownerId, input.projectId);
    let query = this.client.from("research_runs")
      .select("id,project_id,conversation_id,status,provider,provider_job_id,budget_cents,input,result,started_at,finished_at,cancelled_at,error,created_at,updated_at")
      .eq("project_id", input.projectId).order("created_at", { ascending: false }).limit(input.limit);
    if (input.cursor) query = query.lt("created_at", input.cursor);
    const { data, error } = await query;
    return rows(data, error, "list research runs").map(runView);
  }

  async getResearchRun(input: { ownerId: string; researchRunId: string }) {
    const { data, error } = await this.client.from("research_runs").select(`
      id,project_id,conversation_id,status,provider,provider_job_id,budget_cents,input,result,
      started_at,finished_at,cancelled_at,error,created_at,updated_at,
      projects!inner(owner_id),
      research_run_events(id,kind,progress_percent,provider,summary,metadata,created_at),
      source_documents(id,research_run_id,provider,source_url,title,raw_payload,content_text,captured_at),
      opportunities(id,project_id,research_run_id,title,rationale,score,state,created_at,updated_at)
    `).eq("id", input.researchRunId).eq("projects.owner_id", input.ownerId).maybeSingle();
    const row = object(one(data, error, "Research run"));
    return {
      researchRun: runView(row),
      sources: Array.isArray(row.source_documents) ? row.source_documents.map(sourceView) : [],
      opportunities: Array.isArray(row.opportunities) ? row.opportunities.map(opportunityView) : [],
    };
  }

  async listSources(input: ListInput) {
    await this.assertProject(input.ownerId, input.projectId);
    let query = this.client.from("source_documents")
      .select("id,research_run_id,provider,source_url,title,raw_payload,content_text,captured_at,research_runs!inner(project_id)")
      .eq("research_runs.project_id", input.projectId).order("captured_at", { ascending: false }).limit(input.limit);
    if (input.cursor) query = query.lt("captured_at", input.cursor);
    const { data, error } = await query;
    return rows(data, error, "list sources").map(sourceView);
  }

  async listOpportunities(input: ListInput) {
    await this.assertProject(input.ownerId, input.projectId);
    let query = this.client.from("opportunities")
      .select("id,project_id,research_run_id,title,rationale,score,state,created_at,updated_at,opportunity_sources(source_document_id,relevance)")
      .eq("project_id", input.projectId).order("created_at", { ascending: false }).limit(input.limit);
    if (input.cursor) query = query.lt("created_at", input.cursor);
    const { data, error } = await query;
    return rows(data, error, "list opportunities").map(opportunityView);
  }

  async updateOpportunity(input: OpportunityUpdateInput) {
    const owned = await this.client.from("opportunities")
      .select("id,projects!inner(owner_id)").eq("id", input.opportunityId).eq("projects.owner_id", input.ownerId).maybeSingle();
    one(owned.data, owned.error, "Opportunity");
    const { data, error } = await this.client.from("opportunities").update({ state: input.state })
      .eq("id", input.opportunityId)
      .select("id,project_id,research_run_id,title,rationale,score,state,created_at,updated_at").single();
    if (error || !data) fail(error, "update opportunity");
    return opportunityView(data);
  }
}

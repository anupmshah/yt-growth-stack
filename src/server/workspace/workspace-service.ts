import type { JsonValue } from "@/server/workspace/contracts";
import { assertSafeMessageContent } from "@/server/workspace/contracts";

export type ListInput = { ownerId: string; projectId: string; limit: number; cursor?: string };
export type ConversationInput = { ownerId: string; projectId: string; title?: string };
export type MessageInput = { ownerId: string; conversationId: string; kind: string; content: JsonValue; clientId?: string };
export type OpportunityUpdateInput = { ownerId: string; opportunityId: string; state: "candidate" | "saved" | "dismissed" };

export interface WorkspaceStore {
  listConversations(input: ListInput): Promise<unknown[]>;
  createConversation(input: ConversationInput): Promise<unknown>;
  getConversation(input: { ownerId: string; conversationId: string }): Promise<{ conversation: unknown; messages: unknown[]; researchRuns: unknown[] }>;
  createMessage(input: MessageInput): Promise<unknown>;
  listResearchRuns(input: ListInput): Promise<unknown[]>;
  getResearchRun(input: { ownerId: string; researchRunId: string }): Promise<unknown>;
  listSources(input: ListInput): Promise<unknown[]>;
  listOpportunities(input: ListInput): Promise<unknown[]>;
  updateOpportunity(input: OpportunityUpdateInput): Promise<unknown>;
}

export class WorkspaceService {
  constructor(private readonly store: WorkspaceStore) {}
  listConversations(input: ListInput) { return this.store.listConversations(input); }
  createConversation(input: ConversationInput) { return this.store.createConversation(input); }
  getConversation(input: { ownerId: string; conversationId: string }) { return this.store.getConversation(input); }
  createMessage(input: MessageInput) { assertSafeMessageContent(input.content); return this.store.createMessage(input); }
  listResearchRuns(input: ListInput) { return this.store.listResearchRuns(input); }
  getResearchRun(input: { ownerId: string; researchRunId: string }) { return this.store.getResearchRun(input); }
  listSources(input: ListInput) { return this.store.listSources(input); }
  listOpportunities(input: ListInput) { return this.store.listOpportunities(input); }
  updateOpportunity(input: OpportunityUpdateInput) { return this.store.updateOpportunity(input); }
}

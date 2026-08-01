export type ConversationSummary = { id: string; title: string; createdAt?: string; updatedAt?: string };
export type StoredMessage = { id: string; role: "user" | "assistant"; text: string; createdAt?: string };
export type ResearchRunSummary = { id: string; status: string; provider?: string; target?: string; createdAt?: string; updatedAt?: string; sourceCount?: number };
export type SourceSummary = { id: string; title: string | null; sourceUrl: string; provider?: string; channel?: string | null; views?: number | null; capturedAt?: string };
export type OpportunitySummary = { id: string; title: string; rationale: string; score: number; state?: "saved" | "dismissed" | "active"; sources?: SourceSummary[] };


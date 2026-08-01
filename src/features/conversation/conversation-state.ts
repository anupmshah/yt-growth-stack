import type { ConversationMessage } from "./types/realtime";

export type StoredConversationView = { title: string | null; messages: ConversationMessage[] };

export function storedConversationView(payload: unknown): StoredConversationView | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { conversation?: unknown; messages?: unknown };
  const conversation = record.conversation && typeof record.conversation === "object" ? record.conversation as Record<string, unknown> : {};
  const title = typeof conversation.title === "string" ? conversation.title : null;
  const messages = Array.isArray(record.messages) ? record.messages.flatMap((value, index) => {
    if (!value || typeof value !== "object") return [];
    const item = value as Record<string, unknown>;
    const role = item.kind ?? item.role;
    const message = item.content ?? item.text;
    if ((role !== "user" && role !== "assistant") || typeof message !== "string") return [];
    const normalizedRole: "user" | "assistant" = role;
    return [{ id: typeof item.id === "string" ? item.id : `stored-${index}`, role: normalizedRole, text: message, status: "complete" as const }];
  }) : [];
  return { title, messages };
}

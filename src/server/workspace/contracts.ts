import { z } from "zod";
import { AppError } from "@/server/errors";

export const messageKinds = [
  "user_text", "user_transcript", "assistant_text", "assistant_audio",
  "tool_started", "tool_completed", "tool_failed", "research_progress",
  "evidence", "opportunity", "approval_request",
] as const;

const jsonPrimitive = z.union([z.string().max(12_000), z.number().finite(), z.boolean(), z.null()]);
export type JsonValue = z.infer<typeof jsonPrimitive> | JsonValue[] | { [key: string]: JsonValue };
const jsonValue: z.ZodType<JsonValue> = z.lazy(() => z.union([
  jsonPrimitive,
  z.array(jsonValue).max(100),
  z.record(z.string().min(1).max(80), jsonValue),
]));

const forbiddenCredentialKey = /^(authorization|api[-_]?key|access[-_]?token|refresh[-_]?token|password|secret|credential)$/i;

export function assertSafeMessageContent(content: JsonValue) {
  const serialized = JSON.stringify(content);
  if (new TextEncoder().encode(serialized).byteLength > 16_384) {
    throw new AppError("INVALID_REQUEST", "Message content is too large", 400);
  }
  const inspect = (value: JsonValue, depth: number) => {
    if (depth > 8) throw new AppError("INVALID_REQUEST", "Message content is nested too deeply", 400);
    if (Array.isArray(value)) return value.forEach((item) => inspect(item, depth + 1));
    if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value)) {
        if (forbiddenCredentialKey.test(key)) throw new AppError("INVALID_REQUEST", "Credentials cannot be stored in messages", 400);
        inspect(item, depth + 1);
      }
    }
  };
  inspect(content, 0);
}

export const projectIdSchema = z.string().uuid();
export const idSchema = z.string().uuid();
export const listQuerySchema = z.object({
  projectId: projectIdSchema,
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().datetime({ offset: true }).optional(),
});
export const createConversationSchema = z.object({
  projectId: projectIdSchema,
  title: z.string().trim().min(1).max(120).optional(),
}).strict();
export const createMessageSchema = z.object({
  conversationId: idSchema,
  kind: z.union([z.enum(messageKinds), z.enum(["user", "assistant"])]),
  content: jsonValue,
  clientId: idSchema.optional(),
}).strict();
export const opportunityStateSchema = z.enum(["candidate", "saved", "dismissed"]);
export const updateOpportunitySchema = z.object({
  opportunityId: idSchema,
  state: opportunityStateSchema,
}).strict();

export function parseJsonBody(request: Request): Promise<unknown> {
  return request.json().catch(() => { throw new AppError("INVALID_REQUEST", "Request body must be valid JSON", 400); });
}

export function queryValues(request: Request) {
  return Object.fromEntries(new URL(request.url).searchParams.entries());
}

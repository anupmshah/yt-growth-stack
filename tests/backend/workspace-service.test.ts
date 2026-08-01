import assert from "node:assert/strict";
import test from "node:test";
import { createMessageSchema, listQuerySchema, updateOpportunitySchema } from "@/server/workspace/contracts";
import { WorkspaceService, type WorkspaceStore } from "@/server/workspace/workspace-service";

const ownerId = "10000000-0000-4000-8000-000000000000";
const projectId = "20000000-0000-4000-8000-000000000000";
const conversationId = "30000000-0000-4000-8000-000000000000";

function fakeStore(overrides: Partial<WorkspaceStore> = {}): WorkspaceStore {
  return {
    listConversations: async () => [],
    createConversation: async (input) => ({ id: conversationId, ...input }),
    getConversation: async () => ({ conversation: { id: conversationId }, messages: [], researchRuns: [] }),
    createMessage: async (input) => ({ id: input.clientId ?? "generated", ...input }),
    listResearchRuns: async () => [],
    getResearchRun: async ({ researchRunId }) => ({ id: researchRunId }),
    listSources: async () => [],
    listOpportunities: async () => [],
    updateOpportunity: async (input) => input,
    ...overrides,
  };
}

test("list query applies a bounded default and rejects excessive limits", () => {
  assert.deepEqual(listQuerySchema.parse({ projectId }), { projectId, limit: 25 });
  assert.throws(() => listQuerySchema.parse({ projectId, limit: "101" }));
  assert.throws(() => listQuerySchema.parse({ projectId, cursor: "not-a-date" }));
});

test("message persistence accepts existing kinds and bounded JSON", async () => {
  let received: unknown;
  const service = new WorkspaceService(fakeStore({ createMessage: async (input) => { received = input; return { id: "message" }; } }));
  const body = createMessageSchema.parse({ conversationId, kind: "user_text", content: { text: "Find three channel outliers" } });
  assert.deepEqual(await service.createMessage({ ownerId, ...body }), { id: "message" });
  assert.deepEqual(received, { ownerId, ...body });
});

test("message API accepts the public conversation roles", () => {
  assert.deepEqual(createMessageSchema.parse({ conversationId, kind: "user", content: "Hello" }), { conversationId, kind: "user", content: "Hello" });
  assert.deepEqual(createMessageSchema.parse({ conversationId, kind: "assistant", content: "Hi" }), { conversationId, kind: "assistant", content: "Hi" });
});

test("message persistence rejects credentials and oversized content", () => {
  const service = new WorkspaceService(fakeStore());
  assert.throws(
    () => service.createMessage({ ownerId, conversationId, kind: "user_text", content: { apiKey: "must-not-persist" } }),
    /Credentials cannot be stored/,
  );
  assert.throws(
    () => service.createMessage({ ownerId, conversationId, kind: "user_text", content: { text: "x".repeat(17_000) } }),
    /too large/,
  );
});

test("opportunity state contract permits only workflow states", () => {
  assert.deepEqual(updateOpportunitySchema.parse({ opportunityId: conversationId, state: "saved" }), { opportunityId: conversationId, state: "saved" });
  assert.throws(() => updateOpportunitySchema.parse({ opportunityId: conversationId, state: "published" }));
});

test("conversation detail and research detail remain owner/project scoped", async () => {
  const calls: unknown[] = [];
  const service = new WorkspaceService(fakeStore({
    getConversation: async (input) => { calls.push(input); return { conversation: { id: conversationId }, messages: [], researchRuns: [] }; },
    getResearchRun: async (input) => { calls.push(input); return { id: input.researchRunId }; },
  }));
  await service.getConversation({ ownerId, conversationId });
  await service.getResearchRun({ ownerId, researchRunId: conversationId });
  assert.deepEqual(calls, [
    { ownerId, conversationId },
    { ownerId, researchRunId: conversationId },
  ]);
});

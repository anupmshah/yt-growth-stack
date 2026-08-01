import test from "node:test";
import assert from "node:assert/strict";
import type { ApifyAdapter } from "@/integrations/apify/adapter";
import type { FirecrawlAdapter } from "@/integrations/firecrawl/adapter";
import { AppError } from "@/server/errors";
import { ResearchService, type ResearchRecord, type ResearchStore } from "@/server/research-service";

class TestStore implements ResearchStore {
  records = new Map<string, ResearchRecord>();
  async save(record: ResearchRecord) { this.records.set(record.id, structuredClone(record)); }
  async get(_ownerId: string, id: string) { const record = this.records.get(id); return record ? structuredClone(record) : null; }
}

const context = { ownerId: "owner-1", projectId: "00000000-0000-0000-0000-000000000001", conversationId: "00000000-0000-0000-0000-000000000002" };

function apifyFixture(status: "running" | "succeeded" = "succeeded") {
  let resultCalls = 0;
  let cancelCalls = 0;
  const adapter = {
    async start() { return { id: "provider-run-1", status: "running" as const, input: { channels: ["https://youtube.com/@example"], maxVideos: 3 } }; },
    async status() { return { status, datasetId: "dataset-1" }; },
    async result() { resultCalls += 1; return { datasetId: "dataset-1", items: [
      { videoUrl: "https://youtube.com/watch?v=one", title: "Baseline one", viewCount: 100 },
      { videoUrl: "https://youtube.com/watch?v=two", title: "Baseline two", viewCount: 110 },
      { videoUrl: "https://youtube.com/watch?v=three", title: "Breakout", viewCount: 1000 },
    ] }; },
    async cancel() { cancelCalls += 1; },
  } as unknown as ApifyAdapter;
  return { adapter, resultCalls: () => resultCalls, cancelCalls: () => cancelCalls };
}

const unusedFirecrawl = {} as FirecrawlAdapter;

test("collect is idempotent and does not create duplicate opportunities", async () => {
  const store = new TestStore();
  const fake = apifyFixture();
  const service = new ResearchService({ context, store, apify: fake.adapter, firecrawl: unusedFirecrawl });
  const created = await service.create({ provider: "apify", channels: ["https://youtube.com/@example"], maxVideos: 3 });
  const first = await service.collect(created.id);
  const second = await service.collect(created.id);

  assert.equal(fake.resultCalls(), 1);
  assert.equal(first.evidence?.length, 3);
  assert.deepEqual(second.opportunities?.map(({ id }) => id), first.opportunities?.map(({ id }) => id));
});

test("a completed provider run cannot be cancelled", async () => {
  const store = new TestStore();
  const fake = apifyFixture("succeeded");
  const service = new ResearchService({ context, store, apify: fake.adapter, firecrawl: unusedFirecrawl });
  const created = await service.create({ provider: "apify", channels: ["https://youtube.com/@example"], maxVideos: 3 });

  await assert.rejects(service.cancel(created.id, true), (error: unknown) => error instanceof AppError && error.code === "CONFLICT");
  assert.equal(fake.cancelCalls(), 0);
});
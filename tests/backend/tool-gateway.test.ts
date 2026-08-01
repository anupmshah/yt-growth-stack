import test from "node:test";
import assert from "node:assert/strict";
import { ToolGateway } from "@/server/tools/registry";
import { createResearchSchema } from "@/server/research-service";
import { AppError } from "@/server/errors";
test("gateway rejects unknown tools", async () => { await assert.rejects(new ToolGateway().execute("delete_everything", {}), (error: unknown) => error instanceof AppError && error.code === "INVALID_REQUEST"); });
test("gateway validates tool arguments before provider execution", async () => { await assert.rejects(new ToolGateway().execute("create_research", { provider: "firecrawl", urls: [] })); });
test("research creation requires the approval marker", async () => { await assert.rejects(new ToolGateway().execute("create_research", { provider: "apify", channels: ["https://youtube.com/@example"], maxVideos: 3 })); });
test("cancellation contract requires explicit confirmation", async () => { await assert.rejects(new ToolGateway().execute("cancel_research", { researchId: crypto.randomUUID(), confirmed: false })); });

test("channel research accepts handles and rejects individual video links", () => {
  const parsed = createResearchSchema.parse({ provider: "apify", channels: ["@vaibhavsisinty"], maxVideos: 10, confirmed: true });
  assert.equal(parsed.provider, "apify");
  if (parsed.provider === "apify") assert.deepEqual(parsed.channels, ["https://www.youtube.com/@vaibhavsisinty"]);
  assert.throws(() => createResearchSchema.parse({ provider: "apify", channels: ["https://www.youtube.com/watch?v=abc"], maxVideos: 10, confirmed: true }));
});

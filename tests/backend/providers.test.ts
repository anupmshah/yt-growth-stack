import test from "node:test";
import assert from "node:assert/strict";
import { ApifyAdapter } from "@/integrations/apify/adapter";
import { FirecrawlAdapter } from "@/integrations/firecrawl/adapter";
import { AppError } from "@/server/errors";
import { YouTubeAdapter } from "@/integrations/youtube/adapter";
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
test("Apify creates a bounded actor run without exposing the token in its body", async () => {
  let requested = ""; let body = "";
  const adapter = new ApifyAdapter({ token: "secret-token", actorId: "actor/id", retries: 0, fetchImpl: async (input, init) => { requested = String(input); body = String(init?.body); return json({ data: { id: "run-1", status: "RUNNING", defaultDatasetId: "data-1" } }); } });
  const result = await adapter.start({ channels: ["https://youtube.com/@example"], maxVideos: 20 });
  assert.equal(result.id, "run-1"); assert.match(requested, /acts\/actor%2Fid\/runs/); assert.equal(body.includes("secret-token"), false);
});
test("Firecrawl reads completed batch evidence", async () => {
  const adapter = new FirecrawlAdapter({ apiKey: "secret", retries: 0, fetchImpl: async () => json({ success: true, status: "completed", data: [{ markdown: "evidence" }] }) });
  assert.deepEqual(await adapter.result("job-1"), { documents: [{ markdown: "evidence" }] });
});
test("providers fail safely when unconfigured", async () => {
  const adapter = new ApifyAdapter({ token: "", actorId: "" });
  await assert.rejects(adapter.start({ channels: ["https://youtube.com/@example"], maxVideos: 1 }), (error: unknown) => error instanceof AppError && error.code === "UNCONFIGURED");
});
test("retryable provider failures are bounded", async () => {
  let attempts = 0; const adapter = new FirecrawlAdapter({ apiKey: "secret", retries: 1, fetchImpl: async () => { attempts += 1; return json({}, 503); } });
  await assert.rejects(adapter.start({ urls: ["https://example.com"] }), (error: unknown) => error instanceof AppError && error.retryable);
  assert.equal(attempts, 2);
});

test("YouTube search normalizes official metadata and bounds result count", async () => {
  let requested = "";
  const adapter = new YouTubeAdapter({ apiKey: "youtube-secret", retries: 0, fetchImpl: async (input) => {
    requested = String(input);
    return json({ items: [{ id: { videoId: "abc123" }, snippet: { title: "Voice workflows", channelId: "channel-1", channelTitle: "Creator", publishedAt: "2026-01-01T00:00:00Z", description: "Evidence", thumbnails: { high: { url: "https://img.example/high.jpg" } } } }] });
  } });
  const result = await adapter.search({ query: "AI agents", maxResults: 50 });
  assert.equal(result.videos[0]?.sourceUrl, "https://www.youtube.com/watch?v=abc123");
  assert.match(requested, /maxResults=50/);
  assert.match(requested, /key=youtube-secret/);
});

test("YouTube search fails safely when unconfigured", async () => {
  const adapter = new YouTubeAdapter({ apiKey: "" });
  await assert.rejects(adapter.search({ query: "AI agents", maxResults: 1 }), (error: unknown) => error instanceof AppError && error.code === "UNCONFIGURED");
});
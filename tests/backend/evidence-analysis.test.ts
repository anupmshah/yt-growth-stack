import test from "node:test";
import assert from "node:assert/strict";
import { analyzeEvidence, normalizeEvidence } from "@/server/evidence-analysis";

test("Apify evidence is normalized, deduplicated, and keeps provenance", () => {
  const capturedAt = "2026-08-01T00:00:00.000Z";
  const evidence = normalizeEvidence("apify", [
    { videoUrl: "https://youtube.com/watch?v=one", title: "First", viewCount: "1,200", description: "Evidence" },
    { videoUrl: "https://youtube.com/watch?v=one", title: "Duplicate", viewCount: 999 },
    { title: "Missing provenance", viewCount: 100 },
  ], capturedAt);

  assert.equal(evidence.length, 1);
  assert.equal(evidence[0]?.sourceUrl, "https://youtube.com/watch?v=one");
  assert.equal(evidence[0]?.metrics.views, 1200);
  assert.equal(evidence[0]?.capturedAt, capturedAt);
  assert.equal(evidence[0]?.raw.title, "First");
});

test("Firecrawl metadata is normalized into a bounded source document", () => {
  const evidence = normalizeEvidence("firecrawl", [{
    markdown: "Useful web evidence",
    metadata: { sourceURL: "https://example.com/research", title: "Research" },
  }]);

  assert.equal(evidence[0]?.provider, "firecrawl");
  assert.equal(evidence[0]?.title, "Research");
  assert.equal(evidence[0]?.text, "Useful web evidence");
});

test("analysis creates only measured outlier opportunities with source URLs", () => {
  const evidence = normalizeEvidence("apify", [
    { url: "https://example.com/1", title: "Baseline one", views: 100 },
    { url: "https://example.com/2", title: "Baseline two", views: 110 },
    { url: "https://example.com/3", title: "Breakout format", views: 1000 },
  ]);
  const opportunities = analyzeEvidence(evidence);

  assert.equal(opportunities.length, 1);
  assert.match(opportunities[0]?.rationale ?? "", /9\.1x the median/);
  assert.deepEqual(opportunities[0]?.sourceUrls, ["https://example.com/3"]);
});

test("analysis returns no opportunity when evidence is insufficient", () => {
  const evidence = normalizeEvidence("firecrawl", [
    { url: "https://example.com/1", title: "One", markdown: "No demand metric" },
  ]);

  assert.deepEqual(analyzeEvidence(evidence), []);
});

test("normalization expands compact YouTube metrics", () => {
  const [document] = normalizeEvidence("apify", [{ url: "https://youtube.com/watch?v=compact", title: "Compact metrics", viewCount: "1.2M", likes: "4.5K" }], "2026-01-01T00:00:00.000Z");
  assert.equal(document?.metrics.views, 1_200_000);
  assert.equal(document?.metrics.likes, 4_500);
});

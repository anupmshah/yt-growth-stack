import test from "node:test";
import assert from "node:assert/strict";
import { storedResearchResultView } from "@/features/conversation/research-result";

test("stored workspace evidence replaces the demo state", () => {
  const result = storedResearchResultView(
    { sources: [{ id: "source-1", sourceUrl: "https://youtube.com/watch?v=1", title: "Real video", channel: "Real creator", views: 4200 }] },
    { opportunities: [{ id: "idea-1", title: "Real opportunity", rationale: "Measured from stored evidence", score: 84 }] },
  );
  assert.equal(result?.status, "stored");
  assert.equal(result?.sourceCount, 1);
  assert.equal(result?.sources[0]?.title, "Real video");
  assert.equal(result?.opportunities[0]?.title, "Real opportunity");
});

test("an empty workspace has no fabricated research result", () => {
  assert.equal(storedResearchResultView({ sources: [] }, { opportunities: [] }), null);
});

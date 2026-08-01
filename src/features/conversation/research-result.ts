export type ResearchSourceView = { title: string | null; sourceUrl: string; views: number | null; channel: string | null };
export type ResearchResultView = { status: string; sourceCount: number; sources: ResearchSourceView[]; opportunities: Array<{ id: string; title: string; rationale: string; score: number }> };

function opportunityViews(values: unknown): ResearchResultView["opportunities"] {
  if (!Array.isArray(values)) return [];
  return values.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const item = value as Record<string, unknown>;
    return typeof item.id === "string" && typeof item.title === "string" && typeof item.rationale === "string" && typeof item.score === "number"
      ? [{ id: item.id, title: item.title, rationale: item.rationale, score: item.score }]
      : [];
  });
}

function sourceViews(values: unknown): ResearchSourceView[] {
  if (!Array.isArray(values)) return [];
  return values.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const item = value as Record<string, unknown>;
    const metrics = item.metrics && typeof item.metrics === "object" ? item.metrics as Record<string, unknown> : {};
    const sourceUrl = item.sourceUrl ?? item.source_url;
    if (typeof sourceUrl !== "string") return [];
    return [{
      title: typeof item.title === "string" ? item.title : null,
      sourceUrl,
      views: typeof item.views === "number" ? item.views : typeof metrics.views === "number" ? metrics.views : null,
      channel: typeof item.channel === "string" ? item.channel : typeof metrics.channel === "string" ? metrics.channel : null,
    }];
  });
}

export function researchResultView(payload: unknown): ResearchResultView | null {
  if (!payload || typeof payload !== "object") return null;
  const result = (payload as { result?: unknown }).result;
  if (!result || typeof result !== "object") return null;
  const record = result as { status?: unknown; evidence?: unknown; opportunities?: unknown };
  const sources = sourceViews(record.evidence);
  return { status: typeof record.status === "string" ? record.status : "completed", sourceCount: sources.length, sources, opportunities: opportunityViews(record.opportunities) };
}

export function storedResearchResultView(sourcesPayload: unknown, opportunitiesPayload: unknown): ResearchResultView | null {
  const sourcesRecord = sourcesPayload && typeof sourcesPayload === "object" ? sourcesPayload as Record<string, unknown> : {};
  const opportunitiesRecord = opportunitiesPayload && typeof opportunitiesPayload === "object" ? opportunitiesPayload as Record<string, unknown> : {};
  const sources = sourceViews(sourcesRecord.sources);
  const opportunities = opportunityViews(opportunitiesRecord.opportunities);
  if (sources.length === 0 && opportunities.length === 0) return null;
  return { status: "stored", sourceCount: sources.length, sources, opportunities };
}

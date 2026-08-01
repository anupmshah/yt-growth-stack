export type ResearchSourceView = { title: string | null; sourceUrl: string; views: number | null; channel: string | null };
export type ResearchAnalysisView = { sampleSize: number; measuredVideos: number; medianViews: number | null; topVideo: ResearchSourceView | null; conclusion: string };
export type ResearchResultView = { status: string; sourceCount: number; sources: ResearchSourceView[]; opportunities: Array<{ id: string; title: string; rationale: string; score: number }>; analysis: ResearchAnalysisView };

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

function analysisView(sources: ResearchSourceView[], opportunityCount: number): ResearchAnalysisView {
  const measured = sources.filter((source): source is ResearchSourceView & { views: number } => source.views !== null);
  const ordered = [...measured].sort((left, right) => right.views - left.views);
  const viewCounts = ordered.map((source) => source.views).sort((left, right) => left - right);
  const middle = Math.floor(viewCounts.length / 2);
  const medianViews = viewCounts.length === 0 ? null : viewCounts.length % 2 ? viewCounts[middle] : ((viewCounts[middle - 1] ?? 0) + (viewCounts[middle] ?? 0)) / 2;
  const conclusion = measured.length < 3
    ? `Only ${measured.length} of ${sources.length} collected videos had usable view metrics; at least 3 are required for measured outlier analysis.`
    : opportunityCount === 0
      ? `Analyzed ${measured.length} videos with view metrics. None reached the conservative 1.5x median outlier threshold; increase the bounded sample for a stronger comparison.`
      : `Found ${opportunityCount} measured outlier ${opportunityCount === 1 ? "signal" : "signals"} across ${measured.length} videos with usable view metrics.`;
  return { sampleSize: sources.length, measuredVideos: measured.length, medianViews, topVideo: ordered[0] ?? null, conclusion };
}

function result(status: string, sources: ResearchSourceView[], opportunities: ResearchResultView["opportunities"]): ResearchResultView {
  return { status, sourceCount: sources.length, sources, opportunities, analysis: analysisView(sources, opportunities.length) };
}

export function researchResultView(payload: unknown): ResearchResultView | null {
  if (!payload || typeof payload !== "object") return null;
  const value = (payload as { result?: unknown }).result;
  if (!value || typeof value !== "object") return null;
  const record = value as { status?: unknown; evidence?: unknown; opportunities?: unknown };
  return result(typeof record.status === "string" ? record.status : "completed", sourceViews(record.evidence), opportunityViews(record.opportunities));
}

export function storedResearchResultView(sourcesPayload: unknown, opportunitiesPayload: unknown): ResearchResultView | null {
  const sourcesRecord = sourcesPayload && typeof sourcesPayload === "object" ? sourcesPayload as Record<string, unknown> : {};
  const opportunitiesRecord = opportunitiesPayload && typeof opportunitiesPayload === "object" ? opportunitiesPayload as Record<string, unknown> : {};
  const sources = sourceViews(sourcesRecord.sources);
  const opportunities = opportunityViews(opportunitiesRecord.opportunities);
  if (sources.length === 0 && opportunities.length === 0) return null;
  return result("stored", sources, opportunities);
}

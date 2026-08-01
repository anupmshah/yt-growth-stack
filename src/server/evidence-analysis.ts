import { z } from "zod";

const MAX_DOCUMENTS = 500;
const MAX_TEXT_LENGTH = 50_000;

export const evidenceDocumentSchema = z.object({
  sourceUrl: z.string().url(),
  provider: z.enum(["apify", "firecrawl"]),
  title: z.string().max(500).nullable(),
  text: z.string().max(MAX_TEXT_LENGTH).nullable(),
  capturedAt: z.string().datetime(),
  metrics: z.object({
    views: z.number().nonnegative().optional(),
    likes: z.number().nonnegative().optional(),
    comments: z.number().nonnegative().optional(),
    publishedAt: z.string().optional(),
    channel: z.string().optional(),
  }),
  raw: z.record(z.string(), z.unknown()),
});

export type EvidenceDocument = z.infer<typeof evidenceDocumentSchema>;

export const researchOpportunitySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  rationale: z.string().min(1).max(2_000),
  score: z.number().min(0).max(100),
  sourceUrls: z.array(z.string().url()).min(1),
});

export type ResearchOpportunity = z.infer<typeof researchOpportunitySchema>;

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function nested(record: Record<string, unknown>, key: string) {
  return object(record[key]);
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();
}

function number(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return undefined;
}

export function normalizeEvidence(provider: "apify" | "firecrawl", rawItems: unknown[], capturedAt = new Date().toISOString()): EvidenceDocument[] {
  const documents = new Map<string, EvidenceDocument>();
  for (const rawValue of rawItems.slice(0, MAX_DOCUMENTS)) {
    const raw = object(rawValue);
    const metadata = nested(raw, "metadata");
    const metrics = nested(raw, "metrics");
    const sourceUrl = firstString(raw.sourceUrl, raw.videoUrl, raw.url, raw.link, raw.canonicalUrl, metadata.sourceURL, metadata.sourceUrl, metadata.url);
    if (!sourceUrl || documents.has(sourceUrl)) continue;
    const parsedUrl = z.string().url().safeParse(sourceUrl);
    if (!parsedUrl.success) continue;
    const text = firstString(raw.markdown, raw.text, raw.content, raw.description, raw.transcript, metadata.description);
    documents.set(sourceUrl, evidenceDocumentSchema.parse({
      sourceUrl,
      provider,
      title: firstString(raw.title, raw.videoTitle, raw.name, metadata.title) ?? null,
      text: text?.slice(0, MAX_TEXT_LENGTH) ?? null,
      capturedAt,
      metrics: {
        views: number(raw.viewCount ?? raw.views ?? metrics.views),
        likes: number(raw.likeCount ?? raw.likes ?? metrics.likes),
        comments: number(raw.commentCount ?? raw.comments ?? metrics.comments),
        publishedAt: firstString(raw.publishedAt, raw.date, metadata.publishedAt),
        channel: firstString(raw.channelName, raw.channelTitle, raw.author, metadata.author),
      },
      raw,
    }));
  }
  return [...documents.values()];
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

export function analyzeEvidence(documents: EvidenceDocument[]): ResearchOpportunity[] {
  const withViews = documents.filter((document) => document.metrics.views !== undefined && document.title);
  if (withViews.length < 3) return [];
  const baseline = median(withViews.map((document) => document.metrics.views ?? 0));
  if (baseline <= 0) return [];

  return withViews
    .map((document) => ({ document, multiple: (document.metrics.views ?? 0) / baseline }))
    .filter(({ multiple }) => multiple >= 1.5)
    .sort((left, right) => right.multiple - left.multiple)
    .slice(0, 5)
    .map(({ document, multiple }) => researchOpportunitySchema.parse({
      id: crypto.randomUUID(),
      title: `Investigate the pattern behind “${document.title}”`,
      rationale: `${document.title} reached ${Math.round(document.metrics.views ?? 0).toLocaleString("en-US")} views, ${multiple.toFixed(1)}x the median of the collected evidence set. Treat this as a testable signal, not a guaranteed topic outcome.`,
      score: Math.min(100, Math.round(multiple * 20)),
      sourceUrls: [document.sourceUrl],
    }));
}

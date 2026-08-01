import { z } from "zod";
import { env } from "@/shared/config/env";
import { AppError } from "@/server/errors";
import { fetchJson, type ResilientFetchOptions } from "@/server/http";

const responseSchema = z.object({
  items: z.array(z.object({
    id: z.object({ videoId: z.string().min(1) }),
    snippet: z.object({
      title: z.string(),
      channelId: z.string(),
      channelTitle: z.string(),
      publishedAt: z.string(),
      description: z.string().default(""),
      thumbnails: z.record(z.string(), z.object({ url: z.string().url() })).optional(),
    }),
  })).default([]),
  nextPageToken: z.string().optional(),
});

export const youtubeSearchSchema = z.object({
  query: z.string().trim().min(2).max(200),
  maxResults: z.number().int().min(1).max(50).default(20),
  publishedAfter: z.string().datetime().optional(),
  pageToken: z.string().min(1).max(500).optional(),
});

export type YouTubeSearchInput = z.infer<typeof youtubeSearchSchema>;
export type YouTubeVideo = {
  videoId: string; title: string; channelId: string; channelTitle: string;
  publishedAt: string; description: string; thumbnailUrl: string | null; sourceUrl: string;
};

export interface YouTubeAdapterOptions extends ResilientFetchOptions { apiKey?: string }

export class YouTubeAdapter {
  private readonly apiKey; private readonly requestOptions;
  constructor(options: YouTubeAdapterOptions = {}) {
    this.apiKey = options.apiKey ?? env.YOUTUBE_API_KEY ?? "";
    this.requestOptions = options;
  }
  async search(input: YouTubeSearchInput): Promise<{ videos: YouTubeVideo[]; nextPageToken?: string }> {
    if (!this.apiKey) throw new AppError("UNCONFIGURED", "YouTube Data API is not configured", 503);
    const parsed = youtubeSearchSchema.parse(input);
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet"); url.searchParams.set("type", "video");
    url.searchParams.set("order", "viewCount"); url.searchParams.set("q", parsed.query);
    url.searchParams.set("maxResults", String(parsed.maxResults)); url.searchParams.set("key", this.apiKey);
    if (parsed.publishedAfter) url.searchParams.set("publishedAfter", parsed.publishedAfter);
    if (parsed.pageToken) url.searchParams.set("pageToken", parsed.pageToken);
    const raw = await fetchJson<unknown>(url.toString(), { method: "GET", cache: "no-store" }, this.requestOptions);
    const data = responseSchema.parse(raw);
    return {
      videos: data.items.map(({ id, snippet }) => ({
        videoId: id.videoId, title: snippet.title, channelId: snippet.channelId,
        channelTitle: snippet.channelTitle, publishedAt: snippet.publishedAt,
        description: snippet.description,
        thumbnailUrl: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url ?? null,
        sourceUrl: `https://www.youtube.com/watch?v=${id.videoId}`,
      })),
      nextPageToken: data.nextPageToken,
    };
  }
}
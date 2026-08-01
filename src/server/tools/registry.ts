import { z } from "zod";
import { AppError } from "@/server/errors";
import { createResearchSchema, ResearchService } from "@/server/research-service";
import { YouTubeAdapter, youtubeSearchSchema } from "@/integrations/youtube/adapter";

const idSchema = z.object({ researchId: z.string().uuid() });
const schemas = {
  search_youtube: youtubeSearchSchema,
  create_research: createResearchSchema,
  get_research_status: idSchema,
  collect_research_evidence: idSchema,
  cancel_research: idSchema.extend({ confirmed: z.literal(true) }),
} as const;
export type AgentToolName = keyof typeof schemas;
export const realtimeTools = [
  { type: "function", name: "search_youtube", description: "Search official YouTube metadata. This is read-only, bounded to 50 results, and should be preferred for YouTube-native discovery.", parameters: { type: "object", properties: { query: { type: "string" }, maxResults: { type: "number" }, publishedAfter: { type: "string" }, pageToken: { type: "string" } }, required: ["query"] } },
  { type: "function", name: "create_research", description: "Start bounded YouTube or web research. Apify accepts at most 25 channels/500 videos; Firecrawl accepts at most 100 URLs.", parameters: { type: "object", properties: { provider: { enum: ["apify", "firecrawl"] }, channels: { type: "array", items: { type: "string" } }, urls: { type: "array", items: { type: "string" } }, maxVideos: { type: "number" } }, required: ["provider"] } },
  { type: "function", name: "get_research_status", description: "Read the stored state of a research run.", parameters: { type: "object", properties: { researchId: { type: "string" } }, required: ["researchId"] } },
  { type: "function", name: "collect_research_evidence", description: "Collect provider output only after a research run completes.", parameters: { type: "object", properties: { researchId: { type: "string" } }, required: ["researchId"] } },
  { type: "function", name: "cancel_research", description: "Cancel a research run. Explicit user confirmation is required.", parameters: { type: "object", properties: { researchId: { type: "string" }, confirmed: { const: true } }, required: ["researchId", "confirmed"] } },
] as const;
export class ToolGateway {
  constructor(private readonly research = new ResearchService(), private readonly youtube = new YouTubeAdapter()) {}
  async execute(name: string, rawArguments: unknown) {
    if (!(name in schemas)) throw new AppError("INVALID_REQUEST", "Unknown tool", 400);
    const toolName = name as AgentToolName; const args = schemas[toolName].parse(rawArguments);
    switch (toolName) {
      case "search_youtube": return this.youtube.search(args as z.infer<typeof youtubeSearchSchema>);
      case "create_research": return this.research.create(args as z.infer<typeof createResearchSchema>);
      case "get_research_status": return this.research.status((args as z.infer<typeof idSchema>).researchId);
      case "collect_research_evidence": return this.research.collect((args as z.infer<typeof idSchema>).researchId);
      case "cancel_research": { const value = args as z.infer<typeof schemas.cancel_research>; return this.research.cancel(value.researchId, value.confirmed); }
    }
  }
}
export const agentTools = realtimeTools;
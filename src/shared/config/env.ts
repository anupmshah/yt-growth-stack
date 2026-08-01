import { z } from "zod";

const optionalText = z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().min(1).optional());
const optionalUrl = z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().url().optional());

const serverSchema = z.object({
  OPENAI_API_KEY: optionalText,
  OPENAI_REALTIME_MODEL: z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().default("gpt-realtime-2.1")),
  APIFY_API_TOKEN: optionalText,
  APIFY_YOUTUBE_ACTOR_ID: optionalText,
  FIRECRAWL_API_KEY: optionalText,
  FIRECRAWL_OPERATION: z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().default("batch/scrape")),
  YOUTUBE_API_KEY: optionalText,
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalText,
  SUPABASE_SERVICE_ROLE_KEY: optionalText,
});

export const env = serverSchema.parse(process.env);
export const capabilityStatus = {
  openai: Boolean(env.OPENAI_API_KEY),
  apify: Boolean(env.APIFY_API_TOKEN && env.APIFY_YOUTUBE_ACTOR_ID),
  firecrawl: Boolean(env.FIRECRAWL_API_KEY),
  youtube: Boolean(env.YOUTUBE_API_KEY),
  supabase: Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
};
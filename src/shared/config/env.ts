import { z } from "zod";

const serverSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_REALTIME_MODEL: z.string().default("gpt-realtime-2.1"),
  APIFY_API_TOKEN: z.string().min(1).optional(),
  FIRECRAWL_API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

export const env = serverSchema.parse(process.env);
export const capabilityStatus = {
  openai: Boolean(env.OPENAI_API_KEY), apify: Boolean(env.APIFY_API_TOKEN),
  firecrawl: Boolean(env.FIRECRAWL_API_KEY), supabase: Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
};

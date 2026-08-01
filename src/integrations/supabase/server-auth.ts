import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { AppError } from "@/server/errors";
import { env } from "@/shared/config/env";

export type AuthenticatedSupabase = { client: SupabaseClient; user: User };

export async function authenticateRequest(request: Request): Promise<AuthenticatedSupabase> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new AppError("UNAUTHORIZED", "Authentication is required", 401);
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new AppError("UNCONFIGURED", "Supabase authentication is not configured", 503);
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new AppError("UNAUTHORIZED", "The access token is invalid or expired", 401);
  return { client, user: data.user };
}

export async function assertResearchContext(client: SupabaseClient, userId: string, projectId: string, conversationId: string) {
  const { data: project } = await client.from("projects").select("id").eq("id", projectId).eq("owner_id", userId).maybeSingle();
  if (!project) throw new AppError("NOT_FOUND", "Project was not found", 404);
  const { data: conversation } = await client.from("conversations").select("id").eq("id", conversationId).eq("project_id", projectId).maybeSingle();
  if (!conversation) throw new AppError("NOT_FOUND", "Conversation was not found", 404);
}


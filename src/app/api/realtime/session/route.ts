import { NextResponse } from "next/server";
import { z } from "zod";
import { AGENT_INSTRUCTIONS, REALTIME_MODEL } from "@/integrations/openai/config";
import { env } from "@/shared/config/env";
import { errorResponse, AppError } from "@/server/errors";
import { fetchJson } from "@/server/http";
import { realtimeTools } from "@/server/tools/registry";
import { authenticateRequest } from "@/integrations/supabase/server-auth";
const optionsSchema = z.object({ voice: z.enum(["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"]).default("coral") }).default({ voice: "coral" });
type ClientSecretResponse = { value?: string; expires_at?: number; client_secret?: { value?: string; expires_at?: number } };
export async function POST(request: Request) {
  try {
    await authenticateRequest(request);
    if (!env.OPENAI_API_KEY) throw new AppError("UNCONFIGURED", "OpenAI Realtime is not configured", 503);
    const text = await request.text(); let rawOptions: unknown; try { rawOptions = text ? JSON.parse(text) : undefined; } catch { throw new AppError("INVALID_REQUEST", "Request body must be valid JSON", 400); } const options = optionsSchema.parse(rawOptions);
    const upstream = await fetchJson<ClientSecretResponse>("https://api.openai.com/v1/realtime/client_secrets", { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ session: { type: "realtime", model: REALTIME_MODEL, instructions: AGENT_INSTRUCTIONS, output_modalities: ["audio"], audio: { output: { voice: options.voice } }, tools: realtimeTools, tool_choice: "auto" } }) }, { timeoutMs: 10_000, retries: 1 });
    const clientSecret = upstream.value ?? upstream.client_secret?.value; const expiresAt = upstream.expires_at ?? upstream.client_secret?.expires_at;
    if (!clientSecret) throw new AppError("UPSTREAM_TERMINAL", "OpenAI returned an invalid session credential", 502);
    return NextResponse.json({ client_secret: { value: clientSecret, expires_at: expiresAt }, model: REALTIME_MODEL });
  } catch (error) { const response = errorResponse(error); return NextResponse.json(response.body, { status: response.status }); }
}

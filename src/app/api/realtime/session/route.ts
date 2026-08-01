import { NextResponse } from "next/server";
import { AGENT_INSTRUCTIONS, REALTIME_MODEL } from "@/integrations/openai/config";
import { env } from "@/shared/config/env";

export async function POST() {
  if (!env.OPENAI_API_KEY) return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ session: { type: "realtime", model: REALTIME_MODEL, instructions: AGENT_INSTRUCTIONS, modalities: ["audio", "text"] } }),
  });
  const body = await response.json();
  return NextResponse.json(body, { status: response.status });
}

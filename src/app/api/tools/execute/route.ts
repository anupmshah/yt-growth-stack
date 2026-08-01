import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, AppError } from "@/server/errors";
import { ResearchService } from "@/server/research-service";
import { ToolGateway } from "@/server/tools/registry";
import { assertResearchContext, authenticateRequest } from "@/integrations/supabase/server-auth";
import { SupabaseResearchStore } from "@/integrations/supabase/research-store";

const requestSchema = z.object({
  name: z.string().min(1).max(64),
  arguments: z.unknown(),
  projectId: z.string().uuid(),
  conversationId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const { client, user } = await authenticateRequest(request);
    let raw: unknown;
    try { raw = await request.json(); } catch { throw new AppError("INVALID_REQUEST", "Request body must be valid JSON", 400); }
    const body = requestSchema.parse(raw);
    await assertResearchContext(client, user.id, body.projectId, body.conversationId);
    const research = new ResearchService({ context: { ownerId: user.id, projectId: body.projectId, conversationId: body.conversationId }, store: new SupabaseResearchStore(client) });
    const result = await new ToolGateway(research).execute(body.name, body.arguments);
    return NextResponse.json({ result });
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

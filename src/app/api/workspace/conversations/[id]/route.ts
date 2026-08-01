import { NextResponse } from "next/server";
import { idSchema } from "@/server/workspace/contracts";
import { workspaceContext, workspaceError } from "@/server/workspace/route-helpers";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const conversationId = idSchema.parse((await context.params).id);
    const { ownerId, service } = await workspaceContext(request);
    return NextResponse.json(await service.getConversation({ ownerId, conversationId }));
  } catch (error) { return workspaceError(error); }
}

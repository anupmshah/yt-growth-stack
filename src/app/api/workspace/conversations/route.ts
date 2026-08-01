import { NextResponse } from "next/server";
import { createConversationSchema, listQuerySchema, parseJsonBody, queryValues } from "@/server/workspace/contracts";
import { workspaceContext, workspaceError } from "@/server/workspace/route-helpers";

export async function GET(request: Request) {
  try {
    const query = listQuerySchema.parse(queryValues(request));
    const { ownerId, service } = await workspaceContext(request);
    return NextResponse.json({ conversations: await service.listConversations({ ownerId, ...query }) });
  } catch (error) { return workspaceError(error); }
}

export async function POST(request: Request) {
  try {
    const body = createConversationSchema.parse(await parseJsonBody(request));
    const { ownerId, service } = await workspaceContext(request);
    return NextResponse.json({ conversation: await service.createConversation({ ownerId, ...body }) }, { status: 201 });
  } catch (error) { return workspaceError(error); }
}

import { NextResponse } from "next/server";
import { createMessageSchema, parseJsonBody } from "@/server/workspace/contracts";
import { workspaceContext, workspaceError } from "@/server/workspace/route-helpers";

export async function POST(request: Request) {
  try {
    const body = createMessageSchema.parse(await parseJsonBody(request));
    const { ownerId, service } = await workspaceContext(request);
    return NextResponse.json({ message: await service.createMessage({ ownerId, ...body }) }, { status: 201 });
  } catch (error) { return workspaceError(error); }
}

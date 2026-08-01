import { NextResponse } from "next/server";
import { idSchema } from "@/server/workspace/contracts";
import { workspaceContext, workspaceError } from "@/server/workspace/route-helpers";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const researchRunId = idSchema.parse((await context.params).id);
    const { ownerId, service } = await workspaceContext(request);
    return NextResponse.json(await service.getResearchRun({ ownerId, researchRunId }));
  } catch (error) { return workspaceError(error); }
}

import { NextResponse } from "next/server";
import { listQuerySchema, parseJsonBody, queryValues, updateOpportunitySchema } from "@/server/workspace/contracts";
import { workspaceContext, workspaceError } from "@/server/workspace/route-helpers";

export async function GET(request: Request) {
  try {
    const query = listQuerySchema.parse(queryValues(request));
    const { ownerId, service } = await workspaceContext(request);
    return NextResponse.json({ opportunities: await service.listOpportunities({ ownerId, ...query }) });
  } catch (error) { return workspaceError(error); }
}

export async function PATCH(request: Request) {
  try {
    const body = updateOpportunitySchema.parse(await parseJsonBody(request));
    const { ownerId, service } = await workspaceContext(request);
    return NextResponse.json({ opportunity: await service.updateOpportunity({ ownerId, ...body }) });
  } catch (error) { return workspaceError(error); }
}

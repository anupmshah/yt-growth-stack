import { NextResponse } from "next/server";
import { listQuerySchema, queryValues } from "@/server/workspace/contracts";
import { workspaceContext, workspaceError } from "@/server/workspace/route-helpers";

export async function GET(request: Request) {
  try {
    const query = listQuerySchema.parse(queryValues(request));
    const { ownerId, service } = await workspaceContext(request);
    return NextResponse.json({ sources: await service.listSources({ ownerId, ...query }) });
  } catch (error) { return workspaceError(error); }
}

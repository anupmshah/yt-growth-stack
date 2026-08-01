import { NextResponse } from "next/server";
import { authenticateRequest } from "@/integrations/supabase/server-auth";
import { SupabaseWorkspaceStore } from "@/integrations/supabase/workspace-store";
import { errorResponse } from "@/server/errors";
import { WorkspaceService } from "@/server/workspace/workspace-service";

export async function workspaceContext(request: Request) {
  const { client, user } = await authenticateRequest(request);
  return { ownerId: user.id, service: new WorkspaceService(new SupabaseWorkspaceStore(client)) };
}

export function workspaceError(error: unknown) {
  const response = errorResponse(error);
  return NextResponse.json(response.body, { status: response.status });
}

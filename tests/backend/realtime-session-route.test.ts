import test from "node:test";
import assert from "node:assert/strict";
import { authenticateRequest } from "@/integrations/supabase/server-auth";
import { AppError } from "@/server/errors";

test("Realtime authentication rejects requests without a bearer token", async () => {
  await assert.rejects(
    authenticateRequest(new Request("http://localhost/api/realtime/session", { method: "POST" })),
    (error: unknown) => error instanceof AppError
      && error.code === "UNAUTHORIZED"
      && error.status === 401,
  );
});
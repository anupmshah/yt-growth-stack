import test from "node:test";
import assert from "node:assert/strict";
import { authenticateRequest } from "@/integrations/supabase/server-auth";
import { AppError } from "@/server/errors";
import { DEFAULT_RESPONSE_LANGUAGE_INSTRUCTION, INPUT_TRANSCRIPTION } from "@/integrations/openai/realtime-language";

test("Realtime authentication rejects requests without a bearer token", async () => {
  await assert.rejects(
    authenticateRequest(new Request("http://localhost/api/realtime/session", { method: "POST" })),
    (error: unknown) => error instanceof AppError
      && error.code === "UNAUTHORIZED"
      && error.status === 401,
  );
});

test("Realtime transcription is constrained to English with domain context", () => {
  assert.deepEqual(INPUT_TRANSCRIPTION, {
    model: "gpt-4o-transcribe",
    language: "en",
    prompt: "English conversation about YouTube channels, creators, competitors, videos, audiences, analytics, content strategy, Apify, Firecrawl, and YT Growth Stack.",
  });
  assert.match(DEFAULT_RESPONSE_LANGUAGE_INSTRUCTION, /Speak and write in English/);
  assert.match(DEFAULT_RESPONSE_LANGUAGE_INSTRUCTION, /Do not switch languages merely because an accent/);
});

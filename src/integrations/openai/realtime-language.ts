export const INPUT_TRANSCRIPTION = {
  model: "gpt-4o-transcribe",
  language: "en",
  prompt: "English conversation about YouTube channels, creators, competitors, videos, audiences, analytics, content strategy, Apify, Firecrawl, and YT Growth Stack.",
} as const;

export const DEFAULT_RESPONSE_LANGUAGE_INSTRUCTION = "Speak and write in English unless the user explicitly asks you to use another language. Do not switch languages merely because an accent or transcription is ambiguous.";

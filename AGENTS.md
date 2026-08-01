# AGENTS.md

## Mission
Build YT Growth Stack as a voice-first YouTube research agent whose recommendations are traceable to stored evidence.

## Mental model
The UI expresses conversation and job state. The server owns authorization and tool execution. Integrations translate provider APIs into domain-safe contracts. Supabase owns durable data and RLS. No provider response is trusted until normalized and associated with provenance.

## Read before changing
1. Read this file.
2. Read the closest relevant document under `docs/`.
3. Use the relevant workflow under `skills/`.
4. Inspect the files you will change and their tests.

## Placement
- `src/app`: Next.js routes and thin transport handlers.
- `src/features`: UI and feature-level behavior.
- `src/integrations`: provider-specific code only.
- `src/server`: domain workflows, agent tools, jobs, and analysis.
- `src/shared`: stable cross-cutting types/configuration.
- `supabase/migrations`: append-only schema history.

## Hard rules
- Never commit secrets or log API keys, session credentials, or raw authorization headers.
- Permanent OpenAI, Apify, Firecrawl, and service-role keys stay server-side.
- Keep raw evidence and provenance; do not manufacture citations.
- Do not call scraping providers directly from client components.
- Require confirmation for destructive actions, migration rollout, production deployment, and work beyond an agreed cost threshold.
- Bound retries and change strategy between retries.
- Keep provider SDK types out of domain-facing interfaces.
- Preserve accessibility: keyboard operation, visible state, transcripts, and reduced motion.

## Completion contract
A change is complete only when relevant acceptance criteria pass and `npm run verify` is green. Database changes also require migration inspection and RLS review. UI changes require a responsive visual check. Provider changes require explicit unconfigured, success, retryable failure, and terminal failure behavior.

## Pull requests
Keep one concern per PR. Include: problem, approach, screenshots when visual, schema impact, security/cost impact, commands run, and remaining limitations. Agents may prepare commits and PRs; a human approves merge.

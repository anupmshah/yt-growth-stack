# Data model and ownership

Every user-visible record inherits ownership from `projects.owner_id`. Child tables avoid copying `owner_id`; RLS follows foreign keys to the project as the single source of truth.

```mermaid
erDiagram
  AUTH_USERS ||--o{ PROJECTS : owns
  PROJECTS ||--o{ CONVERSATIONS : contains
  CONVERSATIONS ||--o{ MESSAGES : records
  CONVERSATIONS ||--o{ TOOL_INVOCATIONS : executes
  PROJECTS ||--o{ COMPETITORS : tracks
  PROJECTS ||--o{ RESEARCH_RUNS : starts
  RESEARCH_RUNS ||--o{ RESEARCH_RUN_EVENTS : reports
  RESEARCH_RUNS ||--o{ SOURCE_DOCUMENTS : collects
  RESEARCH_RUNS ||--o{ OPPORTUNITIES : produces
  OPPORTUNITIES ||--o{ OPPORTUNITY_SOURCES : cites
  SOURCE_DOCUMENTS ||--o{ OPPORTUNITY_SOURCES : supports
```

`source_documents` preserves provider, URL, capture time, normalized text, and raw payload. `opportunity_sources` is authoritative for new evidence links; the old `evidence_ids` array remains temporarily for compatibility.

`research_run_events` is append-oriented history while `research_runs.status` is the current snapshot. `tool_invocations` stores validated arguments and sanitized outcomes. Credentials, authorization headers, short-lived Realtime secrets, and unfiltered provider errors must never be persisted.

Browser access uses an authenticated user JWT and RLS. A service-role key bypasses RLS, so privileged server workflows must independently establish user and project ownership. Never expose it to the browser.

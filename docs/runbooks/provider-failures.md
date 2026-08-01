# Provider failure runbook

1. Identify provider, research-run ID, provider request ID, attempt, and stored status. Never paste credentials into an incident ticket.
2. Confirm no secret, session credential, authorization header, or sensitive body was logged. Rotate a possibly exposed credential.
3. Classify as retryable (timeout, 408/429, 5xx), terminal input, authorization, quota/cost, or schema drift.
4. Retry only retryable failures within attempt, timeout, and cost budgets. Honor `Retry-After`, add jitter, and never loop indefinitely.
5. Write a sanitized `research_run_events` entry per attempt and outcome. Keep request IDs, status, and timing; omit secrets and large payloads.
6. On exhaustion set the run to `failed`, expose a user-safe error, and retain partial evidence without presenting it as complete.
7. For schema drift, add a redacted fixture and adapter test before changing normalization.
8. Mark success only when required evidence exists and citations link through `opportunity_sources`.

## Cancellation

Set `cancelled` and `cancelled_at` before best-effort provider cancellation. Late callbacks must not revive a cancelled run.

## Recovery evidence

Record run IDs, classification, attempts, cost impact, corrective change, test added, and whether historical repair is required.

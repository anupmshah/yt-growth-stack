# Provider failure runbook

1. Identify provider, job ID, attempt, and current stored status.
2. Confirm no secret or raw authorization header was logged.
3. Classify the failure as retryable, terminal, quota, authorization, or schema drift.
4. Retry transient failures only within the configured attempt and cost budget.
5. Preserve the failed payload metadata and expose a useful user-facing state.
6. For schema drift, add a fixture and adapter test before changing normalization.
7. Never mark a run succeeded until required evidence records exist.

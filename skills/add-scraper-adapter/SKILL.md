---
name: add-scraper-adapter
description: Add or change an Apify or Firecrawl adapter while preserving provider isolation, provenance, bounded retries, and failure behavior.
---
# Add scraper adapter
1. Define the provider-neutral input/output contract.
2. Keep credentials and SDK calls in `src/integrations/<provider>`.
3. Add explicit unconfigured, queued, running, succeeded, retryable-failure, and terminal-failure behavior.
4. Preserve source URL, provider, capture time, raw payload reference, and run ID.
5. Add fixtures/tests for provider schema changes.
6. Review rate limits, cost limits, cancellation, and secret handling.
7. Run `npm run verify` and document evidence in the PR.

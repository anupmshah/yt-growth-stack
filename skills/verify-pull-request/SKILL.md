---
name: verify-pull-request
description: Verify a YT Growth Stack pull request using current evidence, risk review, and the repository completion contract.
---
# Verify pull request
1. Read the issue acceptance criteria and diff.
2. Run `npm run lint`, `npm run typecheck`, and `npm run build`.
3. Run focused tests and visually inspect responsive UI changes.
4. Review secrets, authorization, RLS, provider cost, retries, and evidence provenance.
5. Confirm docs and `.env.example` match behavior.
6. Report failures precisely; do not claim done on stale or partial evidence.

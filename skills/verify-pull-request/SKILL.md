---
name: verify-pull-request
description: Verify a YT Growth Stack pull request using current evidence, risk review, and the repository completion contract.
---
# Verify pull request
1. Read the issue acceptance criteria and diff.
2. Run `npm run lint`, `npm run typecheck`, focused tests, and `npm run build`.
3. Visually inspect responsive UI changes and keyboard/accessibility states.
4. Review secrets, authorization, RLS, provider cost, retries, and evidence provenance.
5. For schema changes, reset a disposable database, run the platform contract, and exercise owner/cross-tenant/anonymous RLS.
6. For providers, require mocked unconfigured, success, retryable, and terminal evidence; paid live checks are explicit and separate.
7. Confirm docs and `.env.example`, and scan tracked files for secrets.
8. Report failures precisely; do not claim done on stale or partial evidence.

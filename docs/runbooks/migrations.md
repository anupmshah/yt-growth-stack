# Database migration runbook

## Local verification

1. Start local Supabase and run `supabase db reset` against the disposable database.
2. Run `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/platform/schema_contract.sql`.
3. Inspect the schema diff; a reset database should have no unexplained diff.
4. Run `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/platform/api_role_grants_contract.sql`.
5. Exercise the application with two authenticated test users.

The catalog contract checks required tables, RLS enablement, policy presence, durable idea state, and message idempotency. It does not prove isolation alone.

| RLS scenario | Expected |
| --- | --- |
| Owner selects their project tree | Rows returned |
| Second user selects the first user's tree | No rows |
| Second user inserts below the first user's project | Rejected |
| Anonymous user reads or mutates user data | No rows / rejected |
| Owner links an opportunity to another project's source | Rejected |
| Owner retries a message with the same conversation/client UUID | One row; conflict is handled idempotently |
| Owner saves or dismisses their opportunity | State changes and `updated_at` advances |
| Second user changes the first user's opportunity state | Rejected |

## Migration 005 rollout

`202608010005_connected_workspace_tabs.sql` assumes migrations 001-004 are already applied. It is additive, but index creation can briefly contend with writes on large tables. Before production:

1. Record row counts and sizes for `messages`, `conversations`, `research_runs`, `source_documents`, and `opportunities`.
2. Apply to a restored production snapshot or staging project first.
3. Confirm existing opportunities backfill to `candidate`, existing messages have `updated_at`, and duplicate non-null `(conversation_id, client_id)` values do not exist.
4. Run both platform SQL contracts and the two-user RLS matrix above.
5. Verify newest-first query plans use the new indexes, then deploy application readers/writers.

Do not apply this migration from an unreviewed developer session. A human must approve the production rollout.

## Rollout and rollback

Back up production, record the migration version, inspect locks/table size/existing values, apply to staging, and run the RLS scenarios before a scheduled production rollout. Monitor database errors, latency, and jobs.

Prefer a forward-fix migration. Dropping data or constraints requires explicit human approval. Application code can roll back while the additive schema remains.

If application deployment must roll back, leave migration 005 in place: its nullable `client_id`, defaulted `state`, timestamps, indexes, and triggers are backward-compatible. If a database rollback is unavoidable before any 005-era writes, use a separately reviewed down script in staging first. Once `saved`/`dismissed` state or client IDs exist, export those values and forward-fix instead of dropping columns or the enum.

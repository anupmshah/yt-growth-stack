# Database migration runbook

## Local verification

1. Start local Supabase and run `supabase db reset` against the disposable database.
2. Run `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/platform/schema_contract.sql`.
3. Inspect the schema diff; a reset database should have no unexplained diff.
4. Exercise the application with two authenticated test users.

The catalog contract checks required tables, RLS enablement, and policy presence. It does not prove isolation alone.

| RLS scenario | Expected |
| --- | --- |
| Owner selects their project tree | Rows returned |
| Second user selects the first user's tree | No rows |
| Second user inserts below the first user's project | Rejected |
| Anonymous user reads or mutates user data | No rows / rejected |
| Owner links an opportunity to another project's source | Rejected |

## Rollout and rollback

Back up production, record the migration version, inspect locks/table size/existing values, apply to staging, and run the RLS scenarios before a scheduled production rollout. Monitor database errors, latency, and jobs.

Prefer a forward-fix migration. Dropping data or constraints requires explicit human approval. Application code can roll back while the additive schema remains.

---
name: create-supabase-migration
description: Create a safe append-only Supabase migration with explicit data, RLS, rollback, and rollout review.
---
# Create Supabase migration
1. Inspect the latest migrations and affected queries.
2. Add a new timestamped migration; never rewrite applied history.
3. Prefer additive, backward-compatible changes.
4. Enable RLS and add least-privilege policies for user-owned tables.
5. Consider locks, existing data, defaults, nullability, and indexes.
6. Document rollout and rollback.
7. Inspect generated SQL and run the relevant database checks before PR.

-- Run after `supabase db reset`:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/platform/schema_contract.sql
do $$
declare missing text;
begin
 select string_agg(e.name, ', ') into missing from (values ('projects'),('conversations'),('messages'),('competitors'),('research_runs'),('research_run_events'),('source_documents'),('opportunities'),('opportunity_sources'),('tool_invocations')) e(name) where to_regclass('public.'||e.name) is null;
 if missing is not null then raise exception 'Missing required tables: %',missing; end if;
 if exists(select 1 from (values ('projects'),('conversations'),('messages'),('competitors'),('research_runs'),('research_run_events'),('source_documents'),('opportunities'),('opportunity_sources'),('tool_invocations')) e(name) join pg_class c on c.oid=to_regclass('public.'||e.name) where not c.relrowsecurity) then raise exception 'User-data table without RLS'; end if;
 if exists(select 1 from (values ('projects'),('conversations'),('messages'),('competitors'),('research_runs'),('research_run_events'),('source_documents'),('opportunities'),('opportunity_sources'),('tool_invocations')) e(name) where not exists(select 1 from pg_policies p where p.schemaname='public' and p.tablename=e.name)) then raise exception 'User-data table without policy'; end if;
 if not exists (
   select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace
   where n.nspname='public' and t.typname='opportunity_state'
 ) then raise exception 'Missing opportunity_state enum'; end if;
 if not exists (
   select 1 from information_schema.columns
   where table_schema='public' and table_name='opportunities' and column_name='state'
     and is_nullable='NO' and column_default like '%candidate%'
 ) then raise exception 'Opportunity state must be required and default to candidate'; end if;
 if not exists (
   select 1 from pg_constraint
   where conrelid='public.messages'::regclass and conname='messages_conversation_client_id_key' and contype='u'
 ) then raise exception 'Missing message idempotency constraint'; end if;
 if not exists (
   select 1 from information_schema.columns
   where table_schema='public' and table_name='messages' and column_name='updated_at'
 ) then raise exception 'Messages require updated_at'; end if;
end; $$;

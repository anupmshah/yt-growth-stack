-- Run after migrations against a disposable or staging database.
-- Confirms PostgREST roles can reach RLS-protected tables.
do $$
begin
  if exists (
    select 1
    from (values
      ('projects'), ('conversations'), ('messages'), ('competitors'),
      ('research_runs'), ('research_run_events'), ('source_documents'),
      ('opportunities'), ('opportunity_sources'), ('tool_invocations')
    ) as expected(name)
    where not has_table_privilege('anon', 'public.' || expected.name, 'SELECT')
  ) then
    raise exception 'User-data table without anon SELECT grant; Data API cannot evaluate RLS';
  end if;

  if exists (
    select 1
    from (values
      ('projects'), ('conversations'), ('messages'), ('competitors'),
      ('research_runs'), ('research_run_events'), ('source_documents'),
      ('opportunities'), ('opportunity_sources'), ('tool_invocations')
    ) as expected(name)
    where not has_table_privilege('authenticated', 'public.' || expected.name, 'SELECT')
  ) then
    raise exception 'User-data table without authenticated SELECT grant';
  end if;
end;
$$;

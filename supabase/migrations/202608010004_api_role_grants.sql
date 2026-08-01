-- Allow Supabase Data API roles to reach RLS. Policies remain authoritative
-- for row access; these grants only let PostgreSQL evaluate those policies.
grant usage on schema public to anon, authenticated;

grant select on table
  public.projects,
  public.conversations,
  public.messages,
  public.competitors,
  public.research_runs,
  public.research_run_events,
  public.source_documents,
  public.opportunities,
  public.opportunity_sources,
  public.tool_invocations
to anon;

grant select, insert, update, delete on table
  public.projects,
  public.conversations,
  public.messages,
  public.competitors,
  public.research_runs,
  public.research_run_events,
  public.source_documents,
  public.opportunities,
  public.opportunity_sources,
  public.tool_invocations
to authenticated;

-- research_run_events uses an identity sequence. RLS still prevents browser
-- inserts because that table intentionally has no INSERT policy.
grant usage, select on all sequences in schema public to authenticated;

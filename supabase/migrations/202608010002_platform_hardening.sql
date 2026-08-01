-- Additive hardening; 202608010001 may already be deployed.
create type public.research_event_kind as enum ('queued','started','progress','provider_request','provider_response','retrying','completed','failed','cancelled');
create type public.tool_invocation_status as enum ('pending','running','succeeded','failed','cancelled');

alter table public.projects add column updated_at timestamptz not null default now();
alter table public.conversations add column updated_at timestamptz not null default now();
alter table public.competitors add column updated_at timestamptz not null default now();
alter table public.research_runs add column updated_at timestamptz not null default now(), add column cancelled_at timestamptz,
  add constraint research_runs_finished_after_started check (finished_at is null or started_at is null or finished_at >= started_at) not valid,
  add constraint research_runs_cancelled_state check (cancelled_at is null or status = 'cancelled') not valid;
alter table public.opportunities add column updated_at timestamptz not null default now(),
  add constraint opportunities_score_range check (score is null or score between 0 and 100) not valid;

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger conversations_set_updated_at before update on public.conversations for each row execute function public.set_updated_at();
create trigger competitors_set_updated_at before update on public.competitors for each row execute function public.set_updated_at();
create trigger research_runs_set_updated_at before update on public.research_runs for each row execute function public.set_updated_at();
create trigger opportunities_set_updated_at before update on public.opportunities for each row execute function public.set_updated_at();

create table public.research_run_events (
 id bigint generated always as identity primary key, research_run_id uuid not null references public.research_runs(id) on delete cascade,
 kind public.research_event_kind not null, progress_percent smallint check (progress_percent between 0 and 100),
 provider text check (provider is null or provider in ('apify','firecrawl','openai','system')),
 summary text not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table public.tool_invocations (
 id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
 message_id uuid references public.messages(id) on delete set null, research_run_id uuid references public.research_runs(id) on delete set null,
 tool_call_id text not null, tool_name text not null, status public.tool_invocation_status not null default 'pending',
 arguments jsonb not null default '{}'::jsonb, result jsonb, error jsonb, started_at timestamptz, finished_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(conversation_id,tool_call_id),
 constraint tool_invocations_finished_after_started check (finished_at is null or started_at is null or finished_at >= started_at),
 constraint tool_invocations_terminal_payload check (not (result is not null and error is not null))
);
create trigger tool_invocations_set_updated_at before update on public.tool_invocations for each row execute function public.set_updated_at();
create table public.opportunity_sources (
 opportunity_id uuid not null references public.opportunities(id) on delete cascade,
 source_document_id uuid not null references public.source_documents(id) on delete cascade,
 relevance text, created_at timestamptz not null default now(), primary key(opportunity_id,source_document_id)
);

create or replace function public.enforce_tool_invocation_ownership() returns trigger language plpgsql set search_path=public as $$
declare conversation_project uuid;
begin
 select project_id into conversation_project from public.conversations where id=new.conversation_id;
 if new.message_id is not null and not exists(select 1 from public.messages where id=new.message_id and conversation_id=new.conversation_id) then raise exception 'message must belong to tool conversation'; end if;
 if new.research_run_id is not null and not exists(select 1 from public.research_runs where id=new.research_run_id and project_id=conversation_project) then raise exception 'research run must belong to conversation project'; end if;
 return new;
end; $$;
create trigger tool_invocations_enforce_ownership before insert or update on public.tool_invocations for each row execute function public.enforce_tool_invocation_ownership();
create or replace function public.enforce_opportunity_project() returns trigger language plpgsql set search_path=public as $$
begin
 if not exists(select 1 from public.research_runs where id=new.research_run_id and project_id=new.project_id) then raise exception 'opportunity run must belong to project'; end if;
 return new;
end; $$;
create trigger opportunities_enforce_project before insert or update on public.opportunities for each row execute function public.enforce_opportunity_project();

create index conversations_project_created_idx on public.conversations(project_id,created_at desc);
create index messages_conversation_created_idx on public.messages(conversation_id,created_at);
create index competitors_project_created_idx on public.competitors(project_id,created_at desc);
create index research_runs_project_created_idx on public.research_runs(project_id,created_at desc);
create index research_runs_active_idx on public.research_runs(project_id,status) where status in ('queued','running');
create index research_run_events_run_created_idx on public.research_run_events(research_run_id,created_at);
create index source_documents_run_captured_idx on public.source_documents(research_run_id,captured_at desc);
create index opportunities_project_score_idx on public.opportunities(project_id,score desc nulls last);
create index opportunities_run_idx on public.opportunities(research_run_id);
create index opportunity_sources_source_idx on public.opportunity_sources(source_document_id);
create index tool_invocations_conversation_created_idx on public.tool_invocations(conversation_id,created_at);
create index tool_invocations_run_idx on public.tool_invocations(research_run_id) where research_run_id is not null;

alter table public.research_run_events enable row level security;
alter table public.tool_invocations enable row level security;
alter table public.opportunity_sources enable row level security;
create policy "owners read research run events" on public.research_run_events for select
 using(exists(select 1 from public.research_runs r join public.projects p on p.id=r.project_id where r.id=research_run_id and p.owner_id=auth.uid()));
create policy "owners read tool invocations" on public.tool_invocations for select
 using(exists(select 1 from public.conversations c join public.projects p on p.id=c.project_id where c.id=conversation_id and p.owner_id=auth.uid()));
create policy "owners manage opportunity sources" on public.opportunity_sources for all
 using(exists(select 1 from public.opportunities o join public.projects p on p.id=o.project_id where o.id=opportunity_id and p.owner_id=auth.uid()))
 with check(exists(select 1 from public.opportunities o join public.projects p on p.id=o.project_id join public.source_documents s on s.id=source_document_id join public.research_runs r on r.id=s.research_run_id where o.id=opportunity_id and p.owner_id=auth.uid() and r.project_id=o.project_id));
comment on column public.tool_invocations.arguments is 'Validated tool arguments; never store credentials or authorization headers.';
comment on column public.tool_invocations.error is 'Sanitized error details only; never store provider secrets.';
comment on table public.opportunity_sources is 'Project-consistent provenance links for generated opportunities.';




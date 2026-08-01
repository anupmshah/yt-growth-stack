-- Additive support for durable conversations and connected workspace listings.
-- Migrations 001-004 may already be deployed; do not rewrite their history.
create type public.opportunity_state as enum ('candidate', 'saved', 'dismissed');

alter table public.opportunities
  add column state public.opportunity_state not null default 'candidate';

alter table public.messages
  add column client_id uuid,
  add column updated_at timestamptz not null default now();

create trigger messages_set_updated_at
  before update on public.messages
  for each row execute function public.set_updated_at();

-- A client-generated UUID makes a retried message write idempotent within one
-- conversation while preserving compatibility with existing server writes.
alter table public.messages
  add constraint messages_conversation_client_id_key unique (conversation_id, client_id);

-- Stable, newest-first workspace lists use id as the timestamp tie-breaker.
create index conversations_project_updated_idx
  on public.conversations(project_id, updated_at desc, id desc);
create index messages_conversation_created_desc_idx
  on public.messages(conversation_id, created_at desc, id desc);
create index research_runs_project_status_updated_idx
  on public.research_runs(project_id, status, updated_at desc, id desc);
create index source_documents_run_captured_desc_idx
  on public.source_documents(research_run_id, captured_at desc, id desc);
create index opportunities_project_state_updated_idx
  on public.opportunities(project_id, state, updated_at desc, id desc);

comment on column public.opportunities.state is
  'User workflow state. New analysis results start as candidate; owners may save or dismiss them.';
comment on column public.messages.client_id is
  'Optional client-generated UUID used to safely deduplicate retried message writes within a conversation.';

-- Keep the conversation inbox ordered by recent activity without trusting a
-- client-supplied project or owner identifier.
create or replace function public.touch_conversation_for_message()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.conversations
     set updated_at = now()
   where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
  after insert or update on public.messages
  for each row execute function public.touch_conversation_for_message();

-- Durable provider execution state. Additive: previous migrations may already be deployed.
alter table public.research_runs
  add column provider text,
  add column provider_job_id text,
  add column provider_dataset_id text,
  add column input jsonb not null default '{}'::jsonb,
  add column result jsonb,
  add constraint research_runs_provider check (provider is null or provider in ('apify','firecrawl')) not valid,
  add constraint research_runs_provider_job check (
    (provider is null and provider_job_id is null)
    or (provider is not null and provider_job_id is not null)
  ) not valid;

create unique index research_runs_provider_job_idx
  on public.research_runs(provider, provider_job_id)
  where provider is not null and provider_job_id is not null;

comment on column public.research_runs.result is
  'Bounded normalized provider output used to resume conversations; credentials and authorization data are forbidden.';
comment on column public.research_runs.provider_job_id is
  'Opaque provider run identifier. Never store provider tokens or signed URLs.';
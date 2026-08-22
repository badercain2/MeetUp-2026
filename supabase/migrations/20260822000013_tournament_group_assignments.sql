-- Persist the randomly drawn tournament groups.

alter table public.tournaments
  add column if not exists group_assignments jsonb not null default '{}'::jsonb;

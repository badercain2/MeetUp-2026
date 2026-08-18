-- MeetUP 2026 initial schema.
-- Run this file in Supabase SQL Editor or with `supabase db push`.

create type public.app_role as enum ('CHECKIN', 'SUPERVISOR', 'ADMIN');
create type public.authorization_status as enum ('confirmed', 'pending', 'missing');
create type public.event_status as enum ('DRAFT', 'READY', 'LIVE', 'FINISHED');
create type public.activity_status as enum ('UPCOMING', 'READY', 'LIVE', 'FINISHED', 'CANCELLED');
create type public.score_type as enum ('NONE', 'TIME_ASC', 'POINTS_DESC', 'BRACKET');
create type public.company_activity_status as enum ('NOT_STARTED', 'READY', 'IN_PROGRESS', 'PAUSED', 'FINISHED', 'REALIZED', 'UNDER_REVIEW', 'DISQUALIFIED');
create type public.exception_status as enum ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CANCELLED');
create type public.reward_status as enum ('PENDING', 'READY', 'DELIVERED', 'CANCELLED');
create type public.result_status as enum ('PROVISIONAL', 'OFFICIAL', 'UNDER_REVIEW', 'VOID');
create type public.tournament_status as enum ('PENDING', 'LIVE', 'FINISHED', 'CANCELLED');
create type public.tournament_match_status as enum ('PENDING', 'LIVE', 'FINISHED');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  theme_label text,
  event_date date not null,
  target_company_size integer not null default 20 check (target_company_size > 0),
  company_count integer not null default 9 check (company_count > 0),
  status public.event_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.app_role not null default 'CHECKIN',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  stake text not null default '',
  ward text not null default '',
  is_youth_leader boolean not null default false,
  authorization_status public.authorization_status not null default 'pending',
  notes text,
  is_exception boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  number integer not null,
  name text not null,
  target_size integer not null default 20 check (target_size > 0),
  theme_color_token text not null default 'lagoon',
  theme_icon text not null default 'wave',
  leader_participant_id uuid references public.participants(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, number)
);

create table public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  assignment_source text not null default 'RECOMMENDED' check (assignment_source in ('PREASSIGNED', 'RECOMMENDED', 'MANUAL')),
  is_current boolean not null default true,
  unique (event_id, participant_id, is_current)
);

create unique index company_memberships_one_current
  on public.company_memberships(event_id, participant_id)
  where is_current;

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete restrict,
  company_id uuid references public.companies(id) on delete restrict,
  checked_in_at timestamptz not null default now(),
  checked_in_by uuid references auth.users(id) on delete set null,
  authorization_verified_at timestamptz,
  unique (event_id, participant_id)
);

create table public.material_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  shirt_delivered boolean not null default false,
  card_pack_delivered boolean not null default false,
  credential_delivered boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (event_id, participant_id)
);

create table public.exceptions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid references public.participants(id) on delete set null,
  type text not null check (type in ('authorization', 'incomplete', 'duplicate', 'manual', 'not_found')),
  status public.exception_status not null default 'OPEN',
  title text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  order_number integer not null,
  name text not null,
  start_time time,
  duration_minutes integer not null default 0,
  score_type public.score_type not null default 'NONE',
  status public.activity_status not null default 'UPCOMING',
  global_points_enabled boolean not null default false,
  manual_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, order_number)
);

create table public.company_activity_states (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  status public.company_activity_status not null default 'NOT_STARTED',
  progress_current integer not null default 0 check (progress_current >= 0),
  progress_total integer not null default 0 check (progress_total >= 0),
  started_at timestamptz,
  finished_at timestamptz,
  elapsed_ms bigint,
  official_time_ms bigint,
  points numeric,
  under_review boolean not null default false,
  last_result_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_id, company_id)
);

create table public.challenge_progress (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  challenge_number integer not null,
  name text not null,
  status text not null default 'LOCKED' check (status in ('LOCKED', 'ACTIVE', 'COMPLETED', 'REPEAT')),
  started_at timestamptz,
  completed_at timestamptz,
  split_ms bigint,
  validated_by uuid references auth.users(id) on delete set null,
  review_reason text,
  unique (activity_id, company_id, challenge_number)
);

create table public.activity_results (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  participant_id uuid references public.participants(id) on delete cascade,
  rank integer,
  points numeric,
  is_official boolean not null default false,
  status public.result_status not null default 'PROVISIONAL',
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  correction_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  reward_key text not null unique,
  activity_id uuid references public.activities(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  participant_id uuid references public.participants(id) on delete set null,
  reason text not null,
  quantity integer,
  status public.reward_status not null default 'PENDING',
  delivered_at timestamptz,
  delivered_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete set null,
  name text not null,
  status public.tournament_status not null default 'PENDING',
  fixture_version text not null default 'GROUPS_THREE_TO_FINAL',
  manual_group_winners jsonb not null default '{}'::jsonb,
  manual_final_places jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round_type text not null check (round_type in ('GROUP', 'FINAL')),
  group_key text check (group_key in ('A', 'B', 'C')),
  company_a_id uuid references public.companies(id) on delete set null,
  company_b_id uuid references public.companies(id) on delete set null,
  winner_company_id uuid references public.companies(id) on delete set null,
  status public.tournament_match_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournament_representatives (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.tournament_matches(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  part_number integer not null,
  score numeric,
  is_winner boolean not null default false,
  unique (match_id, company_id, part_number)
);

create table public.scoring_configurations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete cascade,
  configuration_type text not null,
  configuration_json jsonb not null default '{}'::jsonb,
  is_official_manual_value boolean not null default true,
  configured_by uuid references auth.users(id) on delete set null,
  configured_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_value_json jsonb,
  new_value_json jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index participants_event_name_idx on public.participants(event_id, last_name, first_name);
create index memberships_event_company_idx on public.company_memberships(event_id, company_id) where is_current;
create index activity_states_activity_idx on public.company_activity_states(activity_id);
create index audit_logs_event_created_idx on public.audit_logs(event_id, created_at desc);

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active and role in ('CHECKIN', 'SUPERVISOR', 'ADMIN')
  );
$$;

create or replace function public.can_manage()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active and role in ('SUPERVISOR', 'ADMIN')
  );
$$;

create or replace function public.register_checkin(
  p_participant_id uuid,
  p_requested_company_id uuid default null,
  p_shirt_delivered boolean default false,
  p_card_pack_delivered boolean default false,
  p_credential_delivered boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_participant public.participants%rowtype;
  v_company_id uuid;
  v_checkin public.checkins%rowtype;
begin
  if not public.is_staff() then
    raise exception 'not authorized';
  end if;

  select event_id into v_event_id from public.participants where id = p_participant_id for update;
  if v_event_id is null then raise exception 'participant not found'; end if;

  select * into v_participant from public.participants where id = p_participant_id for update;
  if v_participant.authorization_status <> 'confirmed' then raise exception 'authorization required'; end if;
  if exists (select 1 from public.checkins where participant_id = p_participant_id and event_id = v_event_id) then raise exception 'already checked in'; end if;

  perform pg_advisory_xact_lock(hashtext(v_event_id::text));
  if p_requested_company_id is not null then
    select id into v_company_id from public.companies where id = p_requested_company_id and event_id = v_event_id and active;
  end if;
  if v_company_id is null then
    select c.id into v_company_id
    from public.companies c
    left join public.company_memberships cm on cm.company_id = c.id and cm.event_id = v_event_id and cm.is_current
    where c.event_id = v_event_id and c.active
    group by c.id, c.number
    order by count(cm.id), c.number
    limit 1;
  end if;
  if v_company_id is null then raise exception 'no active company available'; end if;

  insert into public.company_memberships(event_id, participant_id, company_id, assigned_by, assignment_source)
  values (v_event_id, p_participant_id, v_company_id, auth.uid(), case when p_requested_company_id is null then 'RECOMMENDED' else 'MANUAL' end);
  insert into public.checkins(event_id, participant_id, company_id, checked_in_by, authorization_verified_at)
  values (v_event_id, p_participant_id, v_company_id, auth.uid(), now()) returning * into v_checkin;
  insert into public.material_deliveries(event_id, participant_id, shirt_delivered, card_pack_delivered, credential_delivered, updated_by)
  values (v_event_id, p_participant_id, p_shirt_delivered, p_card_pack_delivered, p_credential_delivered, auth.uid())
  on conflict (event_id, participant_id) do update set shirt_delivered = excluded.shirt_delivered, card_pack_delivered = excluded.card_pack_delivered, credential_delivered = excluded.credential_delivered, updated_by = auth.uid(), updated_at = now();
  insert into public.audit_logs(event_id, actor_id, action, entity_type, entity_id, new_value_json)
  values (v_event_id, auth.uid(), 'REGISTER_CHECKIN', 'checkin', v_checkin.id, jsonb_build_object('participant_id', p_participant_id, 'company_id', v_company_id));
  return jsonb_build_object('checkin_id', v_checkin.id, 'participant_id', p_participant_id, 'company_id', v_company_id, 'checked_in_at', v_checkin.checked_in_at);
end;
$$;

grant execute on function public.register_checkin(uuid, uuid, boolean, boolean, boolean) to authenticated;

alter table public.events enable row level security;
alter table public.profiles enable row level security;
alter table public.participants enable row level security;
alter table public.companies enable row level security;
alter table public.company_memberships enable row level security;
alter table public.checkins enable row level security;
alter table public.material_deliveries enable row level security;
alter table public.exceptions enable row level security;
alter table public.activities enable row level security;
alter table public.company_activity_states enable row level security;
alter table public.challenge_progress enable row level security;
alter table public.activity_results enable row level security;
alter table public.rewards enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_matches enable row level security;
alter table public.tournament_representatives enable row level security;
alter table public.scoring_configurations enable row level security;
alter table public.audit_logs enable row level security;

create policy staff_read_events on public.events for select to authenticated using (public.is_staff());
create policy staff_manage_events on public.events for all to authenticated using (public.can_manage()) with check (public.can_manage());
create policy staff_read_all on public.profiles for select to authenticated using (public.is_staff());
create policy staff_read_participants on public.participants for select to authenticated using (public.is_staff());
create policy managers_write_participants on public.participants for all to authenticated using (public.can_manage()) with check (public.can_manage());
create policy staff_read_companies on public.companies for select to authenticated using (public.is_staff());
create policy managers_write_companies on public.companies for all to authenticated using (public.can_manage()) with check (public.can_manage());
create policy staff_read_memberships on public.company_memberships for select to authenticated using (public.is_staff());
create policy managers_write_memberships on public.company_memberships for all to authenticated using (public.can_manage()) with check (public.can_manage());
create policy staff_read_checkins on public.checkins for select to authenticated using (public.is_staff());
create policy staff_read_materials on public.material_deliveries for select to authenticated using (public.is_staff());
create policy managers_write_materials on public.material_deliveries for all to authenticated using (public.can_manage()) with check (public.can_manage());
create policy staff_read_exceptions on public.exceptions for select to authenticated using (public.is_staff());
create policy managers_write_exceptions on public.exceptions for all to authenticated using (public.can_manage()) with check (public.can_manage());
create policy staff_read_activities on public.activities for select to authenticated using (public.is_staff());
create policy managers_write_activities on public.activities for all to authenticated using (public.can_manage()) with check (public.can_manage());
create policy staff_read_game_states on public.company_activity_states for select to authenticated using (public.is_staff());
create policy managers_write_game_states on public.company_activity_states for all to authenticated using (public.can_manage()) with check (public.can_manage());
create policy staff_read_challenges on public.challenge_progress for select to authenticated using (public.is_staff());
create policy managers_write_challenges on public.challenge_progress for all to authenticated using (public.can_manage()) with check (public.can_manage());
create policy staff_read_results on public.activity_results for select to authenticated using (public.is_staff());
create policy managers_write_results on public.activity_results for all to authenticated using (public.can_manage()) with check (public.can_manage());
create policy staff_read_rewards on public.rewards for select to authenticated using (public.is_staff());
create policy managers_write_rewards on public.rewards for all to authenticated using (public.can_manage()) with check (public.can_manage());
create policy staff_read_tournaments on public.tournaments for select to authenticated using (public.is_staff());
create policy managers_write_tournaments on public.tournaments for all to authenticated using (public.can_manage()) with check (public.can_manage());
create policy staff_read_tournament_matches on public.tournament_matches for select to authenticated using (public.is_staff());
create policy managers_write_tournament_matches on public.tournament_matches for all to authenticated using (public.can_manage()) with check (public.can_manage());
create policy staff_read_tournament_reps on public.tournament_representatives for select to authenticated using (public.is_staff());
create policy managers_write_tournament_reps on public.tournament_representatives for all to authenticated using (public.can_manage()) with check (public.can_manage());
create policy managers_read_scoring on public.scoring_configurations for select to authenticated using (public.is_staff());
create policy managers_write_scoring on public.scoring_configurations for all to authenticated using (public.can_manage()) with check (public.can_manage());
create policy managers_read_audit on public.audit_logs for select to authenticated using (public.can_manage());

insert into public.events(id, name, theme_label, event_date, target_company_size, company_count, status)
values ('6add2995-c0cf-4a50-a65a-0905945c18e4', 'MeetUP 2026', 'Anda conmigo', '2026-06-14', 20, 9, 'DRAFT')
on conflict (id) do nothing;

insert into public.companies(event_id, number, name, target_size, theme_color_token, theme_icon)
select '6add2995-c0cf-4a50-a65a-0905945c18e4', n, 'Compañía ' || n, 20,
  (array['lagoon','ember','cloud','gold','stone','path','lagoon','ember','cloud'])[n],
  (array['wave','fire','cloud','manna','mountain','path','star','fire','cloud'])[n]
from generate_series(1, 9) as n
on conflict (event_id, number) do nothing;

insert into public.activities(event_id, order_number, name, start_time, duration_minutes, score_type, status, global_points_enabled)
values
('6add2995-c0cf-4a50-a65a-0905945c18e4', 1, '¿Quién soy?', '09:30', 30, 'NONE', 'UPCOMING', false),
('6add2995-c0cf-4a50-a65a-0905945c18e4', 2, 'Evita las Plagas', '10:00', 45, 'TIME_ASC', 'UPCOMING', false),
('6add2995-c0cf-4a50-a65a-0905945c18e4', 3, 'Cruza el Mar Rojo', '11:00', 45, 'TIME_ASC', 'UPCOMING', false),
('6add2995-c0cf-4a50-a65a-0905945c18e4', 4, 'Escape del Desierto', '13:00', 60, 'NONE', 'UPCOMING', false),
('6add2995-c0cf-4a50-a65a-0905945c18e4', 5, 'Torneo de Maestros', '14:00', 60, 'BRACKET', 'UPCOMING', false),
('6add2995-c0cf-4a50-a65a-0905945c18e4', 6, 'Sigue la Música', '15:00', 60, 'POINTS_DESC', 'UPCOMING', true)
on conflict (event_id, order_number) do nothing;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['events','profiles','participants','companies','company_memberships','checkins','material_deliveries','exceptions','activities','company_activity_states','challenge_progress','activity_results','rewards','tournaments','tournament_matches','tournament_representatives'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;

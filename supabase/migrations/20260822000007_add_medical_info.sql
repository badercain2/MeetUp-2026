-- Optional private medical information for operational check-in use.
alter table public.participants
  add column if not exists medical_info text;

comment on column public.participants.medical_info is
  'Optional private medical information visible only to authorized staff during check-in.';

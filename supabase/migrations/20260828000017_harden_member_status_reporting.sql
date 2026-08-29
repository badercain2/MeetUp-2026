-- Member status is part of the event record and must be available for reports.

update public.participants
set is_church_member = true
where is_church_member is null;

alter table public.participants
  alter column is_church_member set default true,
  alter column is_church_member set not null;

create index if not exists participants_event_member_idx
  on public.participants(event_id, is_church_member);

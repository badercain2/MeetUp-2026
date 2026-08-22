-- Keep a simple participant flag synchronized with the checkins table.

alter table public.participants
  add column if not exists checking boolean not null default false;

update public.participants p
set checking = exists (
  select 1
  from public.checkins c
  where c.participant_id = p.id
    and c.event_id = p.event_id
);

create or replace function public.sync_participant_checking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    update public.participants
    set checking = false, updated_at = now()
    where id = old.participant_id
      and not exists (
        select 1 from public.checkins
        where participant_id = old.participant_id and event_id = old.event_id
      );
    return old;
  end if;

  update public.participants
  set checking = true, updated_at = now()
  where id = new.participant_id and event_id = new.event_id;
  return new;
end;
$$;

drop trigger if exists sync_participant_checking on public.checkins;
create trigger sync_participant_checking
after insert or delete on public.checkins
for each row execute function public.sync_participant_checking();

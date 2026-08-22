-- Persist manual company changes through a transaction-safe RPC.

create or replace function public.assign_participant_company(p_participant_id uuid, p_company_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  if not public.is_staff() then raise exception 'not authorized'; end if;

  select event_id into v_event_id
  from public.participants
  where id = p_participant_id
  for update;
  if v_event_id is null then raise exception 'participant not found'; end if;

  if not exists (select 1 from public.companies where id = p_company_id and event_id = v_event_id and active) then
    raise exception 'company not found';
  end if;

  update public.company_memberships
  set is_current = false
  where event_id = v_event_id and participant_id = p_participant_id and is_current;

  insert into public.company_memberships(event_id, participant_id, company_id, assigned_by, assignment_source, is_current)
  values (v_event_id, p_participant_id, p_company_id, auth.uid(), 'MANUAL', true);

  return jsonb_build_object('participant_id', p_participant_id, 'company_id', p_company_id);
end;
$$;

grant execute on function public.assign_participant_company(uuid, uuid) to authenticated;

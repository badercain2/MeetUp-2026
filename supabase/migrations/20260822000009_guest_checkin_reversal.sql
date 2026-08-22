-- Persist visitors as regular event participants and allow staff to undo a check-in.

alter table public.participants
  add column if not exists is_church_member boolean not null default true;

create or replace function public.revert_checkin(p_participant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_checkin public.checkins%rowtype;
begin
  if not public.is_staff() then
    raise exception 'not authorized';
  end if;

  select event_id into v_event_id
  from public.participants
  where id = p_participant_id
  for update;

  if v_event_id is null then
    raise exception 'participant not found';
  end if;

  select * into v_checkin
  from public.checkins
  where event_id = v_event_id and participant_id = p_participant_id
  for update;

  if not found then
    raise exception 'check-in not found';
  end if;

  update public.material_deliveries
  set shirt_delivered = false,
      card_pack_delivered = false,
      credential_delivered = false,
      updated_by = auth.uid(),
      updated_at = now()
  where event_id = v_event_id and participant_id = p_participant_id;

  delete from public.company_memberships
  where event_id = v_event_id
    and participant_id = p_participant_id
    and is_current;

  delete from public.checkins
  where id = v_checkin.id;

  insert into public.audit_logs(event_id, actor_id, action, entity_type, entity_id, old_value_json)
  values (
    v_event_id,
    auth.uid(),
    'REVERT_CHECKIN',
    'checkin',
    v_checkin.id,
    jsonb_build_object(
      'participant_id', p_participant_id,
      'company_id', v_checkin.company_id,
      'checked_in_at', v_checkin.checked_in_at
    )
  );

  return jsonb_build_object('participant_id', p_participant_id, 'company_id', v_checkin.company_id);
end;
$$;

grant execute on function public.revert_checkin(uuid) to authenticated;

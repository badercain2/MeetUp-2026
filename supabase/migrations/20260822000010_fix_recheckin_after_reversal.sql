-- A reverted participant can be checked in again, even if an old membership row remains.

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
  if not public.is_staff() then raise exception 'not authorized'; end if;
  select event_id into v_event_id from public.participants where id = p_participant_id for update;
  if v_event_id is null then raise exception 'participant not found'; end if;
  select * into v_checkin from public.checkins where event_id = v_event_id and participant_id = p_participant_id for update;
  if not found then raise exception 'check-in not found'; end if;

  update public.material_deliveries
  set shirt_delivered = false, card_pack_delivered = false, credential_delivered = false, updated_by = auth.uid(), updated_at = now()
  where event_id = v_event_id and participant_id = p_participant_id;
  delete from public.company_memberships where event_id = v_event_id and participant_id = p_participant_id and is_current;
  delete from public.checkins where id = v_checkin.id;
  insert into public.audit_logs(event_id, actor_id, action, entity_type, entity_id, old_value_json)
  values (v_event_id, auth.uid(), 'REVERT_CHECKIN', 'checkin', v_checkin.id, jsonb_build_object('participant_id', p_participant_id, 'company_id', v_checkin.company_id, 'checked_in_at', v_checkin.checked_in_at));
  return jsonb_build_object('participant_id', p_participant_id, 'company_id', v_checkin.company_id);
end;
$$;

grant execute on function public.revert_checkin(uuid) to authenticated;

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

  select event_id into v_event_id
  from public.participants
  where id = p_participant_id
  for update;
  if v_event_id is null then raise exception 'participant not found'; end if;

  select * into v_participant
  from public.participants
  where id = p_participant_id
  for update;
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
  values (v_event_id, p_participant_id, v_company_id, auth.uid(), case when p_requested_company_id is null then 'RECOMMENDED' else 'MANUAL' end)
  on conflict (event_id, participant_id) where is_current
  do update set company_id = excluded.company_id, assigned_by = excluded.assigned_by, assigned_at = now(), assignment_source = excluded.assignment_source;

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

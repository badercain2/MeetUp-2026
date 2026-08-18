-- Keep an immutable trail for operational changes.

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_id uuid;
  event_id_value uuid;
begin
  row_id := coalesce(new.id, old.id);
  event_id_value := nullif(coalesce(to_jsonb(new) ->> 'event_id', to_jsonb(old) ->> 'event_id'), '')::uuid;

  insert into public.audit_logs (
    event_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    old_value_json,
    new_value_json
  ) values (
    event_id_value,
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    row_id,
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_participants on public.participants;
create trigger audit_participants after insert or update or delete on public.participants
for each row execute procedure public.audit_row_change();

drop trigger if exists audit_companies on public.companies;
create trigger audit_companies after insert or update or delete on public.companies
for each row execute procedure public.audit_row_change();

drop trigger if exists audit_memberships on public.company_memberships;
create trigger audit_memberships after insert or update or delete on public.company_memberships
for each row execute procedure public.audit_row_change();

drop trigger if exists audit_checkins on public.checkins;
create trigger audit_checkins after insert or update or delete on public.checkins
for each row execute procedure public.audit_row_change();

drop trigger if exists audit_materials on public.material_deliveries;
create trigger audit_materials after insert or update or delete on public.material_deliveries
for each row execute procedure public.audit_row_change();

drop trigger if exists audit_exceptions on public.exceptions;
create trigger audit_exceptions after insert or update or delete on public.exceptions
for each row execute procedure public.audit_row_change();

drop trigger if exists audit_activities on public.activities;
create trigger audit_activities after insert or update or delete on public.activities
for each row execute procedure public.audit_row_change();

drop trigger if exists audit_activity_states on public.company_activity_states;
create trigger audit_activity_states after insert or update or delete on public.company_activity_states
for each row execute procedure public.audit_row_change();

drop trigger if exists audit_results on public.activity_results;
create trigger audit_results after insert or update or delete on public.activity_results
for each row execute procedure public.audit_row_change();

drop trigger if exists audit_rewards on public.rewards;
create trigger audit_rewards after insert or update or delete on public.rewards
for each row execute procedure public.audit_row_change();

drop trigger if exists audit_tournaments on public.tournaments;
create trigger audit_tournaments after insert or update or delete on public.tournaments
for each row execute procedure public.audit_row_change();

drop trigger if exists audit_scoring on public.scoring_configurations;
create trigger audit_scoring after insert or update or delete on public.scoring_configurations
for each row execute procedure public.audit_row_change();

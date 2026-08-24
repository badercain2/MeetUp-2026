-- Keep database authorization aligned with the role stored in profiles.

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and active
      and role in ('CHECKIN', 'SUPERVISOR', 'ADMIN')
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
    select 1
    from public.profiles
    where id = auth.uid()
      and active
      and role in ('SUPERVISOR', 'ADMIN')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'Usuario'),
    'CHECKIN'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.is_staff() from public;
revoke execute on function public.can_manage() from public;
revoke execute on function public.register_checkin(uuid, uuid, boolean, boolean, boolean) from public;
revoke execute on function public.revert_checkin(uuid) from public;
revoke execute on function public.assign_participant_company(uuid, uuid) from public;

grant execute on function public.is_staff() to authenticated;
grant execute on function public.can_manage() to authenticated;
grant execute on function public.register_checkin(uuid, uuid, boolean, boolean, boolean) to authenticated;
grant execute on function public.revert_checkin(uuid) to authenticated;
grant execute on function public.assign_participant_company(uuid, uuid) to authenticated;

update public.profiles
set role = 'CONSEJERO'
where role in ('CHECKIN', 'SUPERVISOR');

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active and role in ('CONSEJERO', 'ADMIN')
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
    where id = auth.uid() and active and role in ('CONSEJERO', 'ADMIN')
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
    'CONSEJERO'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

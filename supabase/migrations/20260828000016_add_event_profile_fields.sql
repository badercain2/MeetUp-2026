-- Profile fields supplied by the MeetUP registration spreadsheet.

alter table public.participants
  add column if not exists birth_date date;

alter table public.participants
  add column if not exists dietary_info text;

comment on column public.participants.birth_date is
  'Participant birth date supplied during event registration.';

comment on column public.participants.dietary_info is
  'Food allergies, restrictions, or dietary notes supplied during registration.';

update public.events
set company_count = 12,
    updated_at = now()
where id = '6add2995-c0cf-4a50-a65a-0905945c18e4';

insert into public.companies(event_id, number, name, target_size, theme_color_token, theme_icon)
select '6add2995-c0cf-4a50-a65a-0905945c18e4', n, 'Compañía ' || n, 20,
  (array['lagoon','ember','cloud','gold','stone','path','lagoon','ember','cloud','gold','stone','path'])[n],
  (array['wave','fire','cloud','manna','mountain','path','star','fire','cloud','manna','mountain','path'])[n]
from generate_series(1, 12) as n
on conflict (event_id, number) do update
set name = excluded.name,
    target_size = excluded.target_size,
    theme_color_token = excluded.theme_color_token,
    theme_icon = excluded.theme_icon,
    active = true,
    updated_at = now();

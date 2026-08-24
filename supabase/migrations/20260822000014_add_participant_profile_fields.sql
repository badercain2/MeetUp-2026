-- Additional participant profile fields used by check-in and reporting.

alter table public.participants
  add column if not exists sex text check (sex in ('HOMBRE', 'MUJER'));

alter table public.participants
  add column if not exists age integer check (age is null or (age >= 0 and age <= 120));

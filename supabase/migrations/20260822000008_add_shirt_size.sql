-- Optional shirt size used during check-in material delivery.
alter table public.participants
  add column if not exists shirt_size text;

comment on column public.participants.shirt_size is
  'Optional shirt size for event material delivery.';

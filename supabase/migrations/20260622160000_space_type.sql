-- A Space can be a couple, a family, a friend group, or someone special.
-- This tunes onboarding, copy, and suggested features — without forking the model.
alter table public.calendars
  add column if not exists space_type text not null default 'couple';

-- Going-status per person on a shared event ("are we both free Thursday?").
-- One row per (event, user). RSVP applies to the whole series for recurring events.
create table if not exists public.event_attendance (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'going' check (status in ('going', 'maybe', 'declined')),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

grant select, insert, update, delete on public.event_attendance to authenticated;
grant all on public.event_attendance to service_role;
alter table public.event_attendance enable row level security;

-- You can see attendance for any event on a calendar you belong to.
create policy "attendance_select_member" on public.event_attendance for select to authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_id and public.is_calendar_member(e.calendar_id, auth.uid())
  ));

-- You can only set/change your own status, and only on events you can see.
create policy "attendance_insert_self" on public.event_attendance for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = event_id and public.is_calendar_member(e.calendar_id, auth.uid())
    )
  );
create policy "attendance_update_self" on public.event_attendance for update to authenticated
  using (user_id = auth.uid());
create policy "attendance_delete_self" on public.event_attendance for delete to authenticated
  using (user_id = auth.uid());

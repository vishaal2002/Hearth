-- =====================================================================
-- Amber — "moments": the daily ritual + the shared archive.
-- A moment is one entry two people leave in their shared space: a daily
-- reflection, a love note, or a time capsule that unlocks on a future date.
-- It hangs off an existing calendar (the shared space), so it inherits the
-- membership model and RLS helpers that already exist.
-- Run once in the Supabase SQL Editor.
-- =====================================================================

CREATE TYPE public.moment_kind AS ENUM ('reflection', 'note', 'capsule');

CREATE TABLE public.moments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id  UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  created_by   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind         public.moment_kind NOT NULL DEFAULT 'reflection',
  prompt_key   TEXT,                       -- which daily prompt this answers (reflections)
  prompt_text  TEXT,                       -- denormalised so the archive reads on its own
  mood         TEXT,                       -- one-tap feeling, e.g. 'glad','tender','tired'
  body         TEXT,
  photo_url    TEXT,
  voice_url    TEXT,
  happened_on  DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  reveal_at    TIMESTAMPTZ,                -- capsules stay sealed until this moment
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One reflection per person per space per day keeps the daily ritual honest.
CREATE UNIQUE INDEX moments_one_reflection_per_day
  ON public.moments (calendar_id, created_by, happened_on)
  WHERE kind = 'reflection';

CREATE INDEX moments_space_day_idx ON public.moments (calendar_id, happened_on DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.moments TO authenticated;
GRANT ALL ON public.moments TO service_role;
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;

-- Members of the space can read every moment in it (capsule sealing is enforced
-- in the app — the row is still owned by the space, just rendered as "sealed").
CREATE POLICY "moments_select_member" ON public.moments FOR SELECT TO authenticated
  USING (public.is_calendar_member(calendar_id, auth.uid()));

CREATE POLICY "moments_insert_self_member" ON public.moments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND public.is_calendar_member(calendar_id, auth.uid())
  );

CREATE POLICY "moments_update_own" ON public.moments FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "moments_delete_own" ON public.moments FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

CREATE TRIGGER set_updated_at_moments
  BEFORE UPDATE ON public.moments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =====================================================================
-- Hearth Shared Calendar — complete database schema
-- Paste this whole file into the Supabase SQL Editor and click "Run".
-- Safe to run once on a brand-new project. (The signup duplicate-member
-- bug is already fixed in handle_new_user below.)
-- =====================================================================

-- Enum for member roles
CREATE TYPE public.calendar_role AS ENUM ('owner', 'editor', 'viewer');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  color TEXT NOT NULL DEFAULT '#f97316',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Calendars
CREATE TABLE public.calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#f97316',
  is_personal BOOLEAN NOT NULL DEFAULT false,
  space_type TEXT NOT NULL DEFAULT 'couple',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendars TO authenticated;
GRANT ALL ON public.calendars TO service_role;
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

-- Calendar members
CREATE TABLE public.calendar_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.calendar_role NOT NULL DEFAULT 'editor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(calendar_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_members TO authenticated;
GRANT ALL ON public.calendar_members TO service_role;
ALTER TABLE public.calendar_members ENABLE ROW LEVEL SECURITY;

-- Helper: security definer to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.is_calendar_member(_calendar_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calendar_members
    WHERE calendar_id = _calendar_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.calendar_role_of(_calendar_id UUID, _user_id UUID)
RETURNS public.calendar_role
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.calendar_members
  WHERE calendar_id = _calendar_id AND user_id = _user_id
  LIMIT 1;
$$;

-- Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  color TEXT,
  reminder_minutes INTEGER,
  recurrence TEXT NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none','daily','weekly','monthly','yearly')),
  recurrence_until TIMESTAMPTZ,
  recurrence_exdates TIMESTAMPTZ[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX events_calendar_start_idx ON public.events(calendar_id, start_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Invitations
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.calendar_role NOT NULL DEFAULT 'editor',
  accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(calendar_id, invited_email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- ============= RLS POLICIES =============

CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "calendars_select_member" ON public.calendars FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.is_calendar_member(id, auth.uid()));
CREATE POLICY "calendars_insert_own" ON public.calendars FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "calendars_update_owner" ON public.calendars FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);
CREATE POLICY "calendars_delete_owner" ON public.calendars FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "members_select_if_member" ON public.calendar_members FOR SELECT TO authenticated
  USING (public.is_calendar_member(calendar_id, auth.uid()));
CREATE POLICY "members_insert_owner_or_self" ON public.calendar_members FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.calendars c WHERE c.id = calendar_id AND c.owner_id = auth.uid())
  );
CREATE POLICY "members_delete_owner_or_self" ON public.calendar_members FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.calendars c WHERE c.id = calendar_id AND c.owner_id = auth.uid())
  );

CREATE POLICY "events_select_member" ON public.events FOR SELECT TO authenticated
  USING (public.is_calendar_member(calendar_id, auth.uid()));
CREATE POLICY "events_insert_editor" ON public.events FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND public.calendar_role_of(calendar_id, auth.uid()) IN ('owner', 'editor')
  );
CREATE POLICY "events_update_editor" ON public.events FOR UPDATE TO authenticated
  USING (public.calendar_role_of(calendar_id, auth.uid()) IN ('owner', 'editor'));
CREATE POLICY "events_delete_editor" ON public.events FOR DELETE TO authenticated
  USING (public.calendar_role_of(calendar_id, auth.uid()) IN ('owner', 'editor'));

-- Event attendance (RSVP / going-status)
CREATE TABLE public.event_attendance (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'declined')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_attendance TO authenticated;
GRANT ALL ON public.event_attendance TO service_role;
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_select_member" ON public.event_attendance FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND public.is_calendar_member(e.calendar_id, auth.uid())
  ));
CREATE POLICY "attendance_insert_self" ON public.event_attendance FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND public.is_calendar_member(e.calendar_id, auth.uid())
    )
  );
CREATE POLICY "attendance_update_self" ON public.event_attendance FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "attendance_delete_self" ON public.event_attendance FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "invitations_select_owner_or_invited" ON public.invitations FOR SELECT TO authenticated
  USING (
    invited_by = auth.uid()
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
CREATE POLICY "invitations_insert_owner" ON public.invitations FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.calendars c WHERE c.id = calendar_id AND c.owner_id = auth.uid())
  );
CREATE POLICY "invitations_update_invited" ON public.invitations FOR UPDATE TO authenticated
  USING (invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "invitations_delete_owner" ON public.invitations FOR DELETE TO authenticated
  USING (invited_by = auth.uid());

-- ============= TRIGGERS =============

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER set_updated_at_calendars BEFORE UPDATE ON public.calendars FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER set_updated_at_events BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- On signup: create profile + personal calendar + auto-accept invitations
-- NOTE: the membership insert uses ON CONFLICT DO NOTHING because the
-- on_calendar_created trigger below already adds the owner membership.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_cal_id UUID;
  default_color TEXT;
  inv RECORD;
BEGIN
  default_color := (ARRAY['#f97316','#ef4444','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899'])[1 + (abs(hashtext(NEW.id::text)) % 8)];

  INSERT INTO public.profiles (id, email, full_name, avatar_url, color)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url',
    default_color
  );

  INSERT INTO public.calendars (name, color, is_personal, owner_id)
  VALUES ('My Calendar', default_color, true, NEW.id)
  RETURNING id INTO new_cal_id;

  INSERT INTO public.calendar_members (calendar_id, user_id, role)
  VALUES (new_cal_id, NEW.id, 'owner')
  ON CONFLICT (calendar_id, user_id) DO NOTHING;

  FOR inv IN SELECT * FROM public.invitations WHERE invited_email = NEW.email AND accepted = false LOOP
    INSERT INTO public.calendar_members (calendar_id, user_id, role)
    VALUES (inv.calendar_id, NEW.id, inv.role)
    ON CONFLICT DO NOTHING;
    UPDATE public.invitations SET accepted = true WHERE id = inv.id;
  END LOOP;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- When a calendar is created, also add the owner as a member
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.calendar_members (calendar_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_calendar_created
AFTER INSERT ON public.calendars
FOR EACH ROW EXECUTE FUNCTION public.add_owner_as_member();

-- Lock down internal functions
REVOKE EXECUTE ON FUNCTION public.is_calendar_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.calendar_role_of(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_owner_as_member() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;

-- Onboarding: create the couple's shared space
CREATE OR REPLACE FUNCTION public.create_shared_space(p_name TEXT, p_color TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.calendars WHERE owner_id = auth.uid() AND NOT is_personal) THEN
    SELECT id INTO new_id FROM public.calendars
    WHERE owner_id = auth.uid() AND NOT is_personal
    ORDER BY created_at DESC LIMIT 1;
    RETURN new_id;
  END IF;
  INSERT INTO public.calendars (name, color, is_personal, owner_id)
  VALUES (trim(p_name), p_color, false, auth.uid())
  RETURNING id INTO new_id;
  INSERT INTO public.calendar_members (calendar_id, user_id, role)
  VALUES (new_id, auth.uid(), 'owner')
  ON CONFLICT (calendar_id, user_id) DO NOTHING;
  UPDATE public.profiles SET color = p_color WHERE id = auth.uid();
  RETURN new_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_shared_space(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_shared_space(TEXT, TEXT) TO authenticated;

-- Done. Now copy your Project URL + anon key into the app's .env file.

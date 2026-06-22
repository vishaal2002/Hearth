-- Let calendar owners read their own calendars (needed for INSERT … RETURNING and post-create fetch).
DROP POLICY IF EXISTS "calendars_select_member" ON public.calendars;
CREATE POLICY "calendars_select_member" ON public.calendars FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.is_calendar_member(id, auth.uid()));

-- Onboarding: create the couple's shared space in one security-definer call.
CREATE OR REPLACE FUNCTION public.create_shared_space(p_name TEXT, p_color TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.calendars
    WHERE owner_id = auth.uid() AND NOT is_personal
  ) THEN
    SELECT id INTO new_id
    FROM public.calendars
    WHERE owner_id = auth.uid() AND NOT is_personal
    ORDER BY created_at DESC
    LIMIT 1;
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

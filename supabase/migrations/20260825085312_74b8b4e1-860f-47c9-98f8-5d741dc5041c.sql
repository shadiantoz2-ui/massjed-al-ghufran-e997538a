CREATE OR REPLACE FUNCTION public.list_courses()
RETURNS TABLE(id uuid, name text, year integer, is_current boolean, started_at timestamptz, ended_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, year, is_current, started_at, ended_at FROM public.courses
  WHERE public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor')
  ORDER BY is_current DESC, started_at DESC;
$$;
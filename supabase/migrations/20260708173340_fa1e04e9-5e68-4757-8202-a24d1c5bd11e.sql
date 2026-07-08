
-- 1. Courses table
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  year integer NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX courses_only_one_current ON public.courses (is_current) WHERE is_current;

GRANT SELECT ON public.courses TO anon, authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read courses" ON public.courses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage courses" ON public.courses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2. Seed initial course from current academic year
INSERT INTO public.courses (name, year, is_current)
SELECT 'الدورة الحالية', COALESCE(current_academic_year, EXTRACT(YEAR FROM now())::int), true
FROM public.app_settings WHERE id=1;

-- 3. Add course_id to relevant tables
ALTER TABLE public.recitations       ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;
ALTER TABLE public.probes            ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;
ALTER TABLE public.hadith_recitations ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;
ALTER TABLE public.point_events      ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;
ALTER TABLE public.attendance        ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

-- Backfill: everything currently belongs to the seeded current course
UPDATE public.recitations       SET course_id = (SELECT id FROM public.courses WHERE is_current LIMIT 1) WHERE course_id IS NULL;
UPDATE public.probes            SET course_id = (SELECT id FROM public.courses WHERE is_current LIMIT 1) WHERE course_id IS NULL;
UPDATE public.hadith_recitations SET course_id = (SELECT id FROM public.courses WHERE is_current LIMIT 1) WHERE course_id IS NULL;
UPDATE public.point_events      SET course_id = (SELECT id FROM public.courses WHERE is_current LIMIT 1) WHERE course_id IS NULL;
UPDATE public.attendance        SET course_id = (SELECT id FROM public.courses WHERE is_current LIMIT 1) WHERE course_id IS NULL;

-- 4. Trigger to set course_id on insert
CREATE OR REPLACE FUNCTION public.set_course_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.course_id IS NULL THEN
    SELECT id INTO NEW.course_id FROM public.courses WHERE is_current LIMIT 1;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_recitations_course       BEFORE INSERT ON public.recitations       FOR EACH ROW EXECUTE FUNCTION public.set_course_id();
CREATE TRIGGER trg_probes_course            BEFORE INSERT ON public.probes            FOR EACH ROW EXECUTE FUNCTION public.set_course_id();
CREATE TRIGGER trg_hadith_recitations_course BEFORE INSERT ON public.hadith_recitations FOR EACH ROW EXECUTE FUNCTION public.set_course_id();
CREATE TRIGGER trg_point_events_course      BEFORE INSERT ON public.point_events      FOR EACH ROW EXECUTE FUNCTION public.set_course_id();
CREATE TRIGGER trg_attendance_course        BEFORE INSERT ON public.attendance        FOR EACH ROW EXECUTE FUNCTION public.set_course_id();

-- 5. Replace start_new_academic_year with start_new_course
DROP FUNCTION IF EXISTS public.start_new_academic_year();

CREATE OR REPLACE FUNCTION public.start_new_course(_name text, _year integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admin can start a new course';
  END IF;
  IF _name IS NULL OR btrim(_name)='' THEN RAISE EXCEPTION 'Course name is required'; END IF;
  IF _year IS NULL THEN RAISE EXCEPTION 'Course year is required'; END IF;

  -- Archive everything from the ending course
  UPDATE public.recitations        SET archived=true WHERE archived=false;
  UPDATE public.probes             SET archived=true WHERE archived=false;
  UPDATE public.hadith_recitations SET archived=true WHERE archived=false;
  UPDATE public.attendance         SET archived=true WHERE archived=false;
  UPDATE public.point_events       SET archived=true WHERE archived=false;

  -- Close the current course
  UPDATE public.courses SET is_current=false, ended_at=now() WHERE is_current;

  -- Create the new course as current
  INSERT INTO public.courses (name, year, is_current) VALUES (btrim(_name), _year, true) RETURNING id INTO new_id;

  -- Update app_settings year for backward compat
  UPDATE public.app_settings SET current_academic_year=_year, updated_at=now() WHERE id=1;
END; $$;

GRANT EXECUTE ON FUNCTION public.start_new_course(text,integer) TO authenticated;

-- 6. Get current course for public UI
CREATE OR REPLACE FUNCTION public.get_current_course()
RETURNS TABLE(id uuid, name text, year integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT id, name, year FROM public.courses WHERE is_current LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_current_course() TO anon, authenticated;

-- 7. Student achievements per course (admin & supervisor only)
CREATE OR REPLACE FUNCTION public.get_student_achievements(_student_id uuid)
RETURNS TABLE(
  course_id uuid, course_name text, course_year integer, is_current boolean,
  pages_count integer, surahs_count integer, probes_count integer, hadiths_count integer,
  total_points integer, ended_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH allowed AS (
    SELECT public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor') AS ok
  ),
  cs AS ( SELECT * FROM public.courses )
  SELECT
    c.id, c.name, c.year, c.is_current,
    COALESCE((SELECT count(*)::int FROM public.recitations r WHERE r.student_id=_student_id AND r.course_id=c.id AND r.kind='page'),0),
    COALESCE((SELECT count(*)::int FROM public.recitations r WHERE r.student_id=_student_id AND r.course_id=c.id AND r.kind='surah'),0),
    COALESCE((SELECT count(*)::int FROM public.probes p WHERE p.student_id=_student_id AND p.course_id=c.id),0),
    COALESCE((SELECT count(*)::int FROM public.hadith_recitations h WHERE h.student_id=_student_id AND h.course_id=c.id),0),
    COALESCE((SELECT SUM(pe.points)::int FROM public.point_events pe WHERE pe.student_id=_student_id AND pe.course_id=c.id),0),
    c.ended_at
  FROM cs c, allowed a
  WHERE a.ok
  ORDER BY c.is_current DESC, c.started_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_student_achievements(uuid) TO authenticated;

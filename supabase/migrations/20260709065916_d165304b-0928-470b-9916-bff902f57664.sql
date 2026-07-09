
-- 1) Points reset per course: only count non-archived point events
CREATE OR REPLACE FUNCTION public.get_student_total_points(_student_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path='public' AS $$
  SELECT COALESCE(SUM(points),0)::int FROM public.point_events
  WHERE student_id=_student_id AND archived=false;
$$;

-- 2) No points for "old" probes/hadiths
CREATE OR REPLACE FUNCTION public.probe_points_upsert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
BEGIN
  DELETE FROM public.point_events WHERE source='probe' AND reference_id=NEW.id;
  IF COALESCE(NEW.points,0) <> 0 AND COALESCE(NEW.recitation_type,'new')='new' THEN
    INSERT INTO public.point_events(student_id, points, source, reference_id, reason, created_by)
    VALUES (NEW.student_id, NEW.points, 'probe', NEW.id, 'سبر الجزء '||NEW.juz_number, NEW.teacher_id);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.hadith_points_upsert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
BEGIN
  DELETE FROM public.point_events WHERE source='hadith' AND reference_id=NEW.id;
  IF COALESCE(NEW.points,0) <> 0 AND COALESCE(NEW.recitation_type,'new')='new' THEN
    INSERT INTO public.point_events(student_id, points, source, reference_id, reason, created_by)
    VALUES (NEW.student_id, NEW.points, 'hadith', NEW.id, 'حديث '||NEW.hadith_number, NEW.teacher_id);
  END IF;
  RETURN NEW;
END; $$;

-- 3) Course management: list / update / delete
CREATE OR REPLACE FUNCTION public.list_courses()
RETURNS TABLE(id uuid, name text, year integer, is_current boolean, started_at timestamptz, ended_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='public' AS $$
  SELECT id, name, year, is_current, started_at, ended_at FROM public.courses
  WHERE public.has_role(auth.uid(),'admin')
  ORDER BY is_current DESC, started_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.update_course(_course_id uuid, _name text, _year integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admin can edit courses';
  END IF;
  IF _name IS NULL OR btrim(_name)='' THEN RAISE EXCEPTION 'Course name is required'; END IF;
  IF _year IS NULL THEN RAISE EXCEPTION 'Course year is required'; END IF;
  UPDATE public.courses SET name=btrim(_name), year=_year WHERE id=_course_id;
  -- Keep app_settings year in sync when editing the current course
  UPDATE public.app_settings SET current_academic_year=_year, updated_at=now()
    WHERE id=1 AND EXISTS (SELECT 1 FROM public.courses WHERE id=_course_id AND is_current);
END; $$;

CREATE OR REPLACE FUNCTION public.delete_course(_course_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
DECLARE was_current boolean;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admin can delete courses';
  END IF;
  SELECT is_current INTO was_current FROM public.courses WHERE id=_course_id;
  IF was_current IS NULL THEN RAISE EXCEPTION 'Course not found'; END IF;

  -- Delete all data attached to this course
  DELETE FROM public.point_events       WHERE course_id=_course_id;
  DELETE FROM public.attendance         WHERE course_id=_course_id;
  DELETE FROM public.hadith_recitations WHERE course_id=_course_id;
  DELETE FROM public.probes             WHERE course_id=_course_id;
  DELETE FROM public.recitations        WHERE course_id=_course_id;
  DELETE FROM public.courses            WHERE id=_course_id;

  -- If we deleted the current course, promote the most recent remaining one
  IF was_current THEN
    UPDATE public.courses SET is_current=true, ended_at=NULL
    WHERE id=(SELECT id FROM public.courses ORDER BY started_at DESC LIMIT 1);
  END IF;
END; $$;

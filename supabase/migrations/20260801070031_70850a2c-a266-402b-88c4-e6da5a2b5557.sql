CREATE OR REPLACE FUNCTION public.surah_points(_surah integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _surah
    WHEN 78 THEN 6 WHEN 79 THEN 6 WHEN 89 THEN 6
    WHEN 80 THEN 4 WHEN 81 THEN 4 WHEN 82 THEN 4 WHEN 83 THEN 4
    WHEN 84 THEN 4 WHEN 85 THEN 4 WHEN 88 THEN 4
    ELSE 2 END;
$$;

CREATE OR REPLACE FUNCTION public.recitation_points_ins()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.recitation_type,'new')='new' THEN
    IF NEW.kind='page' THEN
      INSERT INTO public.point_events(student_id, points, source, reference_id, reason, created_by)
      VALUES (NEW.student_id, 4, 'recitation', NEW.id, 'صفحة '||NEW.page_number, NEW.teacher_id);
    ELSIF NEW.kind='surah' AND NEW.surah_number IS NOT NULL THEN
      INSERT INTO public.point_events(student_id, points, source, reference_id, reason, created_by)
      VALUES (NEW.student_id, public.surah_points(NEW.surah_number), 'recitation', NEW.id,
              'سورة رقم '||NEW.surah_number, NEW.teacher_id);
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.hadith_points_upsert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.point_events WHERE source='hadith' AND reference_id=NEW.id;
  IF COALESCE(NEW.recitation_type,'new')='new' THEN
    INSERT INTO public.point_events(student_id, points, source, reference_id, reason, created_by)
    VALUES (NEW.student_id, 2, 'hadith', NEW.id, 'حديث '||NEW.hadith_number, NEW.teacher_id);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.export_courses_data(_course_ids uuid[])
RETURNS TABLE(
  course_name text, course_year integer, student_name text, nickname text,
  father_name text, mother_name text, father_phone text, mother_phone text,
  contact_phone text, address text, father_job text, grade_level text,
  birth_year integer, teacher_name text,
  pages_count integer, surahs_count integer, probes_count integer,
  hadiths_count integer, present_count integer, late_count integer, total_points integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.name, c.year, s.full_name, s.nickname, s.father_name, s.mother_name,
    s.father_phone, s.mother_phone, s.contact_phone, s.address, s.father_job,
    s.grade_level, s.birth_year, p.full_name,
    COALESCE((SELECT count(*)::int FROM public.recitations r WHERE r.student_id=s.id AND r.course_id=c.id AND r.kind='page'),0),
    COALESCE((SELECT count(*)::int FROM public.recitations r WHERE r.student_id=s.id AND r.course_id=c.id AND r.kind='surah'),0),
    COALESCE((SELECT count(*)::int FROM public.probes pr WHERE pr.student_id=s.id AND pr.course_id=c.id),0),
    COALESCE((SELECT count(*)::int FROM public.hadith_recitations h WHERE h.student_id=s.id AND h.course_id=c.id),0),
    COALESCE((SELECT count(*)::int FROM public.attendance a WHERE a.student_id=s.id AND a.course_id=c.id AND a.status='present'),0),
    COALESCE((SELECT count(*)::int FROM public.attendance a WHERE a.student_id=s.id AND a.course_id=c.id AND a.status='late'),0),
    COALESCE((SELECT SUM(pe.points)::int FROM public.point_events pe WHERE pe.student_id=s.id AND pe.course_id=c.id),0)
  FROM public.courses c
  CROSS JOIN public.students s
  LEFT JOIN public.profiles p ON p.id = s.teacher_id
  WHERE c.id = ANY(_course_ids)
    AND public.has_role(auth.uid(),'admin')
  ORDER BY c.started_at DESC, s.full_name;
$$;
CREATE INDEX IF NOT EXISTS probes_student_idx ON public.probes(student_id);
CREATE INDEX IF NOT EXISTS point_events_course_student_idx ON public.point_events(course_id, student_id);
CREATE INDEX IF NOT EXISTS recitations_course_student_idx ON public.recitations(course_id, student_id);
CREATE INDEX IF NOT EXISTS hadith_course_student_idx ON public.hadith_recitations(course_id, student_id);
CREATE INDEX IF NOT EXISTS probes_course_student_idx ON public.probes(course_id, student_id);
CREATE INDEX IF NOT EXISTS attendance_course_student_idx ON public.attendance(course_id, student_id);

CREATE OR REPLACE FUNCTION public.export_points_data(_course_id uuid)
RETURNS TABLE(
  course_name text, course_year integer, student_name text, nickname text,
  father_name text, grade_level text, teacher_name text,
  pages_points integer, surahs_points integer, probes_points integer,
  hadiths_points integer, attendance_points integer, manual_points integer,
  total_points integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT c.name, c.year, s.full_name, s.nickname, s.father_name, s.grade_level, p.full_name,
    COALESCE((SELECT SUM(pe.points)::int FROM public.point_events pe JOIN public.recitations r ON r.id=pe.reference_id
              WHERE pe.student_id=s.id AND pe.course_id=c.id AND pe.source='recitation' AND r.kind='page'),0),
    COALESCE((SELECT SUM(pe.points)::int FROM public.point_events pe JOIN public.recitations r ON r.id=pe.reference_id
              WHERE pe.student_id=s.id AND pe.course_id=c.id AND pe.source='recitation' AND r.kind='surah'),0),
    COALESCE((SELECT SUM(pe.points)::int FROM public.point_events pe WHERE pe.student_id=s.id AND pe.course_id=c.id AND pe.source='probe'),0),
    COALESCE((SELECT SUM(pe.points)::int FROM public.point_events pe WHERE pe.student_id=s.id AND pe.course_id=c.id AND pe.source='hadith'),0),
    COALESCE((SELECT SUM(pe.points)::int FROM public.point_events pe WHERE pe.student_id=s.id AND pe.course_id=c.id AND pe.source='attendance'),0),
    COALESCE((SELECT SUM(pe.points)::int FROM public.point_events pe WHERE pe.student_id=s.id AND pe.course_id=c.id
              AND pe.source NOT IN ('recitation','probe','hadith','attendance')),0),
    COALESCE((SELECT SUM(pe.points)::int FROM public.point_events pe WHERE pe.student_id=s.id AND pe.course_id=c.id),0)
  FROM public.courses c
  CROSS JOIN public.students s
  LEFT JOIN public.profiles p ON p.id = s.teacher_id
  WHERE c.id = _course_id AND public.has_role(auth.uid(),'admin')
  ORDER BY 14 DESC, s.full_name;
$$;
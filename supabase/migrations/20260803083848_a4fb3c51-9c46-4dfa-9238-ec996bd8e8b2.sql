CREATE OR REPLACE FUNCTION public.export_recitations_data(_course_id uuid)
RETURNS TABLE(
  course_name text, course_year integer, student_name text, nickname text,
  father_name text, grade_level text, teacher_name text,
  pages_count integer, pages_list text,
  surahs_count integer, surahs_list text,
  probes_count integer, probes_list text,
  hadiths_count integer, hadiths_list text,
  total_points integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT c.name, c.year, s.full_name, s.nickname, s.father_name, s.grade_level, p.full_name,
    COALESCE((SELECT count(*)::int FROM public.recitations r WHERE r.student_id=s.id AND r.course_id=c.id AND r.kind='page'),0),
    COALESCE((SELECT string_agg(r.page_number::text, ', ' ORDER BY r.page_number) FROM public.recitations r WHERE r.student_id=s.id AND r.course_id=c.id AND r.kind='page'),''),
    COALESCE((SELECT count(*)::int FROM public.recitations r WHERE r.student_id=s.id AND r.course_id=c.id AND r.kind='surah'),0),
    COALESCE((SELECT string_agg(r.surah_number::text, ', ' ORDER BY r.surah_number) FROM public.recitations r WHERE r.student_id=s.id AND r.course_id=c.id AND r.kind='surah'),''),
    COALESCE((SELECT count(*)::int FROM public.probes pr WHERE pr.student_id=s.id AND pr.course_id=c.id),0),
    COALESCE((SELECT string_agg(pr.juz_number::text, ', ' ORDER BY pr.juz_number) FROM public.probes pr WHERE pr.student_id=s.id AND pr.course_id=c.id),''),
    COALESCE((SELECT count(*)::int FROM public.hadith_recitations h WHERE h.student_id=s.id AND h.course_id=c.id),0),
    COALESCE((SELECT string_agg(h.hadith_number::text, ', ' ORDER BY h.hadith_number) FROM public.hadith_recitations h WHERE h.student_id=s.id AND h.course_id=c.id),''),
    COALESCE((SELECT SUM(pe.points)::int FROM public.point_events pe WHERE pe.student_id=s.id AND pe.course_id=c.id),0)
  FROM public.courses c
  CROSS JOIN public.students s
  LEFT JOIN public.profiles p ON p.id = s.teacher_id
  WHERE c.id = _course_id AND public.has_role(auth.uid(),'admin')
  ORDER BY s.full_name;
$function$;